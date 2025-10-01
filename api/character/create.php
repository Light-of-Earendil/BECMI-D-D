<?php
/**
 * BECMI D&D Character Manager - Character Creation Endpoint
 * 
 * Handles character creation with full BECMI rule validation and calculations.
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';
require_once '../../app/services/becmi-rules.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow POST requests
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Check CSRF token
    if (!Security::checkCSRFToken()) {
        Security::sendErrorResponse('Invalid CSRF token', 403);
    }
    
    // Get JSON input
    $input = Security::validateJSONInput();
    
    // Validate required fields
    $errors = [];
    
    // Session is now OPTIONAL - characters can be created without a session
    $requiredFields = ['character_name', 'class', 'strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma', 'alignment'];
    
    foreach ($requiredFields as $field) {
        if (!isset($input[$field]) || $input[$field] === '') {
            $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required';
        }
    }
    
    if (!empty($errors)) {
        Security::sendValidationErrorResponse($errors);
    }
    
    // Sanitize input
    $characterData = Security::sanitizeInput($input);
    
    error_log("CHARACTER CREATE - Input received: " . json_encode($input));
    error_log("CHARACTER CREATE - After sanitize: " . json_encode($characterData));
    
    // Validate character data
    $validationErrors = validateCharacterData($characterData);
    if (!empty($validationErrors)) {
        Security::sendValidationErrorResponse($validationErrors);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Session validation - ONLY if session_id is provided
    if (!empty($characterData['session_id'])) {
        // Verify user has access to the session
        $session = $db->selectOne(
            "SELECT session_id, dm_user_id FROM game_sessions WHERE session_id = ?",
            [$characterData['session_id']]
        );
        
        if (!$session) {
            Security::sendValidationErrorResponse(['session_id' => 'Session not found']);
        }
        
        // Check if user is DM or invited to session
        $isDM = $session['dm_user_id'] == $userId;
        $isPlayer = $db->selectOne(
            "SELECT user_id FROM session_players WHERE session_id = ? AND user_id = ?",
            [$characterData['session_id'], $userId]
        );
        
        if (!$isDM && !$isPlayer) {
            Security::sendValidationErrorResponse(['session_id' => 'You are not authorized to create characters for this session']);
        }
        
        // Check if user already has a character in this session
        $existingCharacter = $db->selectOne(
            "SELECT character_id FROM characters WHERE user_id = ? AND session_id = ?",
            [$userId, $characterData['session_id']]
        );
        
        if ($existingCharacter) {
            Security::sendValidationErrorResponse(['session_id' => 'You already have a character in this session']);
        }
    } else {
        // No session - set to null for unassigned character
        $characterData['session_id'] = null;
    }
    
    // Ensure level is set (new characters start at level 1)
    if (!isset($characterData['level'])) {
        $characterData['level'] = 1;
    }
    
    // Calculate derived statistics using BECMI rules
    $calculatedStats = calculateCharacterStats($characterData);
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Create character record
        $characterId = $db->insert(
            "INSERT INTO characters (
                user_id, session_id, character_name, class, level, experience_points,
                current_hp, max_hp, strength, dexterity, constitution, intelligence, wisdom, charisma,
                armor_class, thac0_melee, thac0_ranged, movement_rate_normal, movement_rate_encounter,
                encumbrance_status, save_death_ray, save_magic_wand, save_paralysis, save_dragon_breath, save_spells,
                alignment, age, height, weight, hair_color, eye_color, background, gold_pieces, silver_pieces, copper_pieces
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                $userId,
                $characterData['session_id'],
                $characterData['character_name'],
                $characterData['class'],
                1, // Starting level
                0, // Starting XP
                $calculatedStats['max_hp'],
                $calculatedStats['max_hp'],
                $characterData['strength'],
                $characterData['dexterity'],
                $characterData['constitution'],
                $characterData['intelligence'],
                $characterData['wisdom'],
                $characterData['charisma'],
                $calculatedStats['armor_class'],
                $calculatedStats['thac0']['melee'],
                $calculatedStats['thac0']['ranged'],
                $calculatedStats['movement']['normal'],
                $calculatedStats['movement']['encounter'],
                $calculatedStats['movement']['status'],
                $calculatedStats['saving_throws']['death_ray'],
                $calculatedStats['saving_throws']['magic_wand'],
                $calculatedStats['saving_throws']['paralysis'],
                $calculatedStats['saving_throws']['dragon_breath'],
                $calculatedStats['saving_throws']['spells'],
                $characterData['alignment'],
                $characterData['age'] ?? null,
                $characterData['height'] ?? null,
                $characterData['weight'] ?? null,
                $characterData['hair_color'] ?? null,
                $characterData['eye_color'] ?? null,
                $characterData['background'] ?? null,
                $characterData['gold_pieces'] ?? 0,
                $characterData['silver_pieces'] ?? 0,
                $characterData['copper_pieces'] ?? 0
            ]
        );
        
        // Log character creation
        $db->insert(
            "INSERT INTO character_changes (character_id, user_id, change_type, field_name, new_value, change_reason) VALUES (?, ?, ?, ?, ?, ?)",
            [
                $characterId,
                $userId,
                'creation',
                'character_created',
                json_encode($characterData),
                'Character created through character creation wizard'
            ]
        );
        
        // Commit transaction
        $db->commit();
        
        // Log successful character creation
        Security::logSecurityEvent('character_created', [
            'character_id' => $characterId,
            'character_name' => $characterData['character_name'],
            'class' => $characterData['class']
        ]);
        
        // Return success response with character data
        Security::sendSuccessResponse([
            'character_id' => $characterId,
            'character_name' => $characterData['character_name'],
            'class' => $characterData['class'],
            'level' => 1,
            'calculated_stats' => $calculatedStats
        ], 'Character created successfully');
        
    } catch (Exception $e) {
        $db->rollback();
        throw $e;
    }
    
} catch (Exception $e) {
    error_log("=== CHARACTER CREATION ERROR ===");
    error_log("Error message: " . $e->getMessage());
    error_log("Error code: " . $e->getCode());
    error_log("Error file: " . $e->getFile() . " (line " . $e->getLine() . ")");
    error_log("Stack trace: " . $e->getTraceAsString());
    error_log("=== END ERROR ===");
    Security::sendErrorResponse('An error occurred during character creation', 500);
}

/**
 * Validate character data according to BECMI rules
 */
function validateCharacterData($data) {
    $errors = [];
    
    // Validate character name
    if (strlen($data['character_name']) < 2 || strlen($data['character_name']) > 50) {
        $errors['character_name'] = 'Character name must be 2-50 characters';
    }
    
    // Validate class
    $validClasses = ['fighter', 'cleric', 'magic_user', 'thief', 'dwarf', 'elf', 'halfling'];
    if (!in_array($data['class'], $validClasses)) {
        $errors['class'] = 'Invalid character class';
    }
    
    // Validate ability scores (3-18)
    $abilityScores = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
    foreach ($abilityScores as $score) {
        if (!is_numeric($data[$score]) || $data[$score] < 3 || $data[$score] > 18) {
            $errors[$score] = ucfirst($score) . ' must be between 3 and 18';
        }
    }
    
    // Validate alignment
    $validAlignments = ['lawful', 'neutral', 'chaotic'];
    if (!in_array($data['alignment'], $validAlignments)) {
        $errors['alignment'] = 'Invalid alignment';
    }
    
    // Validate class-specific requirements
    if ($data['class'] === 'dwarf' && $data['constitution'] < 9) {
        $errors['constitution'] = 'Dwarves require Constitution 9+';
    }
    
    if ($data['class'] === 'elf' && ($data['intelligence'] < 9 || $data['constitution'] < 9)) {
        $errors['ability_scores'] = 'Elves require Intelligence 9+ and Constitution 9+';
    }
    
    if ($data['class'] === 'halfling' && ($data['dexterity'] < 9 || $data['constitution'] < 9)) {
        $errors['ability_scores'] = 'Halflings require Dexterity 9+ and Constitution 9+';
    }
    
    return $errors;
}

/**
 * Calculate all derived statistics for a character
 */
function calculateCharacterStats($characterData) {
    $stats = [];
    
    // Calculate hit points
    $stats['max_hp'] = BECMIRulesEngine::calculateHitPoints($characterData);
    
    // Calculate THAC0
    $stats['thac0'] = BECMIRulesEngine::calculateTHAC0($characterData);
    
    // Calculate movement rates
    $stats['movement'] = BECMIRulesEngine::calculateMovementRates($characterData);
    
    // Calculate saving throws
    $stats['saving_throws'] = BECMIRulesEngine::calculateSavingThrows($characterData);
    
    // Calculate armor class
    $stats['armor_class'] = BECMIRulesEngine::calculateArmorClass($characterData);
    
    return $stats;
}
?>

