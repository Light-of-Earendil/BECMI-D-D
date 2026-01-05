<?php
/**
 * BECMI D&D Character Manager - Audio Upload Endpoint
 * 
 * Allows DM to upload MP3 audio files (music or sound effects) for a session
 * 
 * Request: POST
 * Content-Type: multipart/form-data
 * 
 * Parameters:
 * - audio: file (MP3, max 10MB)
 * - session_id: int
 * - track_name: string
 * - track_type: 'music' or 'sound'
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "track_id": int,
 *     "track_name": string,
 *     "track_type": string,
 *     "file_path": string,
 *     "duration_seconds": int|null,
 *     "file_size_bytes": int
 *   }
 * }
 */

// Disable output compression for file uploads
if (function_exists('apache_setenv')) {
    @apache_setenv('no-gzip', 1);
}
@ini_set('zlib.output_compression', 0);

// Clear any output buffers
while (ob_get_level()) {
    ob_end_clean();
}

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

Security::init();
header('Content-Type: application/json; charset=utf-8');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }

    Security::requireAuth();
    
    $db = getDB();
    $userId = Security::getCurrentUserId();
    
    // Validate required fields
    $errors = [];
    
    if (!isset($_POST['session_id']) || !is_numeric($_POST['session_id'])) {
        $errors['session_id'] = 'Valid session ID is required';
    }
    
    if (!isset($_POST['track_name']) || trim($_POST['track_name']) === '') {
        $errors['track_name'] = 'Track name is required';
    } elseif (strlen(trim($_POST['track_name'])) > 200) {
        $errors['track_name'] = 'Track name must be 200 characters or less';
    }
    
    if (!isset($_POST['track_type']) || !in_array($_POST['track_type'], ['music', 'sound'])) {
        $errors['track_type'] = 'Track type must be "music" or "sound"';
    }
    
    if (!isset($_FILES['audio']) || $_FILES['audio']['error'] !== UPLOAD_ERR_OK) {
        $errors['audio'] = 'Audio file is required';
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    $sessionId = (int) $_POST['session_id'];
    $trackName = trim($_POST['track_name']);
    $trackType = $_POST['track_type'];
    $file = $_FILES['audio'];
    
    // Verify session exists and user is DM
    $session = $db->selectOne(
        "SELECT session_id, session_title, dm_user_id 
         FROM game_sessions 
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Only DM can upload audio
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('Only the Dungeon Master can upload audio files', 403);
    }
    
    // Validate file
    $allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/x-mpeg-3'];
    $maxSize = 10 * 1024 * 1024; // 10MB
    
    // Verify MIME type using finfo
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $detectedMime = $finfo->file($file['tmp_name']);
    
    // Also check file extension as fallback
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if ($extension !== 'mp3') {
        Security::sendValidationErrorResponse(['audio' => 'Invalid file type. Only MP3 files are allowed']);
    }
    
    // Accept detected MIME or common MP3 MIME types
    $validMimeTypes = array_merge($allowedTypes, ['application/octet-stream']); // Some servers report MP3 as octet-stream
    if (!in_array($detectedMime, $validMimeTypes) && $extension === 'mp3') {
        // If extension is MP3 but MIME doesn't match, log warning but allow (some servers have incorrect MIME detection)
        error_log("AUDIO UPLOAD: MIME type mismatch for MP3 file. Detected: $detectedMime, File: " . $file['name']);
    }
    
    if ($file['size'] > $maxSize) {
        Security::sendValidationErrorResponse(['audio' => 'File too large. Maximum size is 10MB']);
    }
    
    // Read file data
    $audioData = file_get_contents($file['tmp_name']);
    if ($audioData === false) {
        Security::sendErrorResponse('Failed to read uploaded file', 500);
    }
    
    // Create upload directory structure
    $baseDir = dirname(dirname(__DIR__)) . '/public/audio/sessions/' . $sessionId . '/' . $trackType . '/';
    if (!is_dir($baseDir)) {
        if (!mkdir($baseDir, 0755, true)) {
            Security::sendErrorResponse('Failed to create upload directory', 500);
        }
    }
    
    // Generate unique filename (will be updated with track_id after insert)
    $timestamp = time();
    $random = bin2hex(random_bytes(8));
    $safeFilename = preg_replace('/[^a-zA-Z0-9._-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
    $filename = $safeFilename . '_' . $timestamp . '_' . $random . '.mp3';
    $filePath = $baseDir . $filename;
    
    // Save audio file
    $bytesWritten = @file_put_contents($filePath, $audioData);
    if ($bytesWritten === false || $bytesWritten !== strlen($audioData)) {
        $error = error_get_last();
        error_log("AUDIO UPLOAD: Failed to save audio file. Error: " . ($error ? $error['message'] : 'Unknown error'));
        Security::sendErrorResponse('Failed to save audio file', 500);
    }
    
    chmod($filePath, 0644);
    
    // Store relative path (from public directory)
    $relativePath = 'audio/sessions/' . $sessionId . '/' . $trackType . '/' . $filename;
    
    // Insert track record (duration will be determined client-side or can be NULL)
    $trackId = $db->insert(
        "INSERT INTO session_audio_tracks (session_id, file_path, track_name, track_type, file_size_bytes, created_by_user_id)
         VALUES (?, ?, ?, ?, ?, ?)",
        [$sessionId, $relativePath, $trackName, $trackType, $file['size'], $userId]
    );
    
    // Update filename to include track_id for easier identification
    $newFilename = $trackId . '_' . $safeFilename . '_' . $timestamp . '_' . $random . '.mp3';
    $newFilePath = $baseDir . $newFilename;
    $newRelativePath = 'audio/sessions/' . $sessionId . '/' . $trackType . '/' . $newFilename;
    
    // Rename file
    if (rename($filePath, $newFilePath)) {
        // Update database with new path
        $db->execute(
            "UPDATE session_audio_tracks SET file_path = ? WHERE track_id = ?",
            [$newRelativePath, $trackId]
        );
        $relativePath = $newRelativePath;
    } else {
        // If rename fails, keep original filename
        error_log("AUDIO UPLOAD: Failed to rename file with track_id. Keeping original filename.");
    }
    
    // Return success response
    Security::sendSuccessResponse([
        'track_id' => $trackId,
        'track_name' => $trackName,
        'track_type' => $trackType,
        'file_path' => '/' . $relativePath,
        'duration_seconds' => null, // Will be determined client-side
        'file_size_bytes' => $file['size']
    ], 'Audio file uploaded successfully');
    
} catch (Exception $e) {
    error_log("AUDIO UPLOAD ERROR: " . $e->getMessage());
    error_log("AUDIO UPLOAD ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to upload audio file: ' . $e->getMessage(), 500);
}
?>
