<?php
/**
 * BECMI D&D Character Manager - Portrait Manager Service
 * 
 * Handles downloading and managing AI-generated character portraits
 */

class PortraitManager {
    private static $portraitDir = '../../public/images/portraits/';
    private static $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
    private static $maxFileSize = 5 * 1024 * 1024; // 5MB
    
    /**
     * Download image from URL and save to local server
     */
    public static function downloadPortrait($imageUrl, $characterId, $characterName = '') {
        try {
            // Validate URL
            if (!filter_var($imageUrl, FILTER_VALIDATE_URL)) {
                throw new Exception('Invalid image URL');
            }
            
            // Get image data
            $imageData = self::fetchImageData($imageUrl);
            if (!$imageData) {
                throw new Exception('Failed to download image');
            }
            
            // Validate image
            $imageInfo = self::validateImage($imageData);
            if (!$imageInfo) {
                throw new Exception('Invalid image format');
            }
            
            // Generate filename
            $extension = $imageInfo['extension'];
            $filename = self::generateFilename($characterId, $characterName, $extension);
            $filepath = self::$portraitDir . $filename;
            
            // Ensure directory exists
            if (!is_dir(self::$portraitDir)) {
                if (!mkdir(self::$portraitDir, 0755, true)) {
                    throw new Exception('Failed to create portraits directory');
                }
            }
            
            // Save image
            if (file_put_contents($filepath, $imageData) === false) {
                throw new Exception('Failed to save image');
            }
            
            // Set proper permissions
            chmod($filepath, 0644);
            
            // Return relative URL
            return 'images/portraits/' . $filename;
            
        } catch (Exception $e) {
            error_log("Portrait download error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Fetch image data from URL
     */
    private static function fetchImageData($url) {
        $context = stream_context_create([
            'http' => [
                'timeout' => 30,
                'user_agent' => 'BECMI VTT Portrait Manager/1.0',
                'follow_location' => true,
                'max_redirects' => 3
            ]
        ]);
        
        $imageData = file_get_contents($url, false, $context);
        
        if ($imageData === false) {
            // Try with cURL as fallback
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 30);
            curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
            curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
            curl_setopt($ch, CURLOPT_USERAGENT, 'BECMI VTT Portrait Manager/1.0');
            
            $imageData = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode !== 200 || $imageData === false) {
                return false;
            }
        }
        
        return $imageData;
    }
    
    /**
     * Validate image data and return info
     */
    private static function validateImage($imageData) {
        // Check file size
        if (strlen($imageData) > self::$maxFileSize) {
            return false;
        }
        
        // Get image info
        $imageInfo = @getimagesizefromstring($imageData);
        if ($imageInfo === false) {
            return false;
        }
        
        // Check if it's a valid image type
        $mimeType = $imageInfo['mime'];
        $extension = '';
        
        switch ($mimeType) {
            case 'image/jpeg':
                $extension = 'jpg';
                break;
            case 'image/png':
                $extension = 'png';
                break;
            case 'image/webp':
                $extension = 'webp';
                break;
            default:
                return false;
        }
        
        return [
            'width' => $imageInfo[0],
            'height' => $imageInfo[1],
            'mime' => $mimeType,
            'extension' => $extension
        ];
    }
    
    /**
     * Generate unique filename for portrait
     */
    private static function generateFilename($characterId, $characterName, $extension) {
        // Clean character name for filename
        $cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', $characterName);
        $cleanName = substr($cleanName, 0, 20); // Limit length
        
        // Generate timestamp for uniqueness
        $timestamp = date('Y-m-d_H-i-s');
        
        return "portrait_{$characterId}_{$cleanName}_{$timestamp}.{$extension}";
    }
    
    /**
     * Delete old portrait file
     */
    public static function deletePortrait($portraitUrl) {
        try {
            if (strpos($portraitUrl, 'images/portraits/') === 0) {
                $filepath = '../../public/' . $portraitUrl;
                if (file_exists($filepath)) {
                    unlink($filepath);
                    return true;
                }
            }
        } catch (Exception $e) {
            error_log("Portrait deletion error: " . $e->getMessage());
        }
        return false;
    }
    
    /**
     * Get portrait URL (convert external URLs to local ones)
     */
    public static function getPortraitUrl($portraitUrl) {
        // If it's already a local URL, return as-is
        if (strpos($portraitUrl, 'images/portraits/') === 0) {
            return $portraitUrl;
        }
        
        // If it's an external URL, it should be downloaded first
        // This is a fallback - normally portraits should be downloaded when generated
        return $portraitUrl;
    }
    
    /**
     * Clean up old portrait files (older than 30 days)
     */
    public static function cleanupOldPortraits() {
        try {
            $files = glob(self::$portraitDir . 'portrait_*');
            $cutoffTime = time() - (30 * 24 * 60 * 60); // 30 days
            
            foreach ($files as $file) {
                if (filemtime($file) < $cutoffTime) {
                    unlink($file);
                }
            }
        } catch (Exception $e) {
            error_log("Portrait cleanup error: " . $e->getMessage());
        }
    }
}
?>
