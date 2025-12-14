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
    
    // BECMI VALIDATION: Validate class requirements (minimum ability scores)
    $classValidation = BECMIRulesEngine::validateClassRequirements($characterData['class'], $characterData);
    if (!$classValidation['valid']) {
        Security::sendValidationErrorResponse(['class' => $classValidation['error']]);
    }
    
    // BECMI VALIDATION: Validate ability score adjustments if provided
    if (!empty($characterData['ability_adjustments']) && !empty($characterData['original_abilities'])) {
        $adjustmentValidation = BECMIRulesEngine::validateAbilityAdjustmentRules(
            $characterData['original_abilities'],
            [
                'strength' => $characterData['strength'],
                'dexterity' => $characterData['dexterity'],
                'constitution' => $characterData['constitution'],
                'intelligence' => $characterData['intelligence'],
                'wisdom' => $characterData['wisdom'],
                'charisma' => $characterData['charisma']
            ],
            $characterData['class']
        );
        
        if (!$adjustmentValidation['valid']) {
            Security::sendValidationErrorResponse(['abilities' => $adjustmentValidation['error']]);
        }
    }
    
    // Calculate derived statistics using BECMI rules
    $calculatedStats = calculateCharacterStats($characterData);
    
    // Begin transaction
    $db->beginTransaction();
    
    try {
        // Prepare ability adjustment data
        $abilityAdjustmentsJSON = null;
        $originalAbilities = [];
        
        if (!empty($characterData['original_abilities'])) {
            $originalAbilities = $characterData['original_abilities'];
            
            // Build adjustments JSON
            $adjustments = [];
            foreach (['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'] as $ability) {
                $original = $originalAbilities[$ability] ?? $characterData[$ability];
                $adjusted = $characterData[$ability];
                if ($original != $adjusted) {
                    $adjustments[$ability] = [
                        'original' => $original,
                        'adjusted' => $adjusted,
                        'change' => $adjusted - $original
                    ];
                }
            }
            
            if (!empty($adjustments)) {
                $abilityAdjustmentsJSON = json_encode($adjustments);
            }
        }
        
        // Debug: Log the values being inserted
        error_log("Character data being inserted: " . json_encode([
            'user_id' => $userId,
            'session_id' => $characterData['session_id'],
            'character_name' => $characterData['character_name'],
            'class' => $characterData['class'],
            'alignment' => $characterData['alignment'],
            'ability_adjustments' => $abilityAdjustmentsJSON,
            'original_abilities' => $originalAbilities
        ]));
        $valuesArray = [
            $userId,
            $characterData['session_id'] ?? null,
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
            $characterData['gender'] ?? null,
            $characterData['age'] ?? null,
            $characterData['height'] ?? null,
            $characterData['weight'] ?? null,
            $characterData['hair_color'] ?? null,
            $characterData['eye_color'] ?? null,
            $characterData['gold_pieces'] ?? 0,
            $characterData['silver_pieces'] ?? 0,
            $characterData['copper_pieces'] ?? 0,
            1, // is_active (default to active)
            $abilityAdjustmentsJSON,
            $originalAbilities['strength'] ?? null,
            $originalAbilities['dexterity'] ?? null,
            $originalAbilities['constitution'] ?? null,
            $originalAbilities['intelligence'] ?? null,
            $originalAbilities['wisdom'] ?? null,
            $originalAbilities['charisma'] ?? null,
            $characterData['personality'] ?? null,
            $characterData['background'] ?? null,
            $characterData['portrait_url'] ?? null
        ];
        
        error_log("Values count: " . count($valuesArray) . " (should be 46)");
        error_log("Values array: " . json_encode($valuesArray));
        
        // Verify counts match before insert
        $columnCount = 46; // Manually counted from INSERT statement
        $placeholderCount = substr_count("?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?", "?");
        $valueCount = count($valuesArray);
        
        if ($columnCount !== $placeholderCount || $placeholderCount !== $valueCount) {
            error_log("MISMATCH DETECTED: Columns=$columnCount, Placeholders=$placeholderCount, Values=$valueCount");
            throw new Exception("Column/placeholder/value count mismatch: Columns=$columnCount, Placeholders=$placeholderCount, Values=$valueCount");
        }
        
        // Create character record with proper values array (46 values total - added gender and portrait_url)
        $characterId = $db->insert(
            "INSERT INTO characters (
                user_id, session_id, character_name, class, level, experience_points,
                current_hp, max_hp, strength, dexterity, constitution, intelligence, wisdom, charisma,
                armor_class, thac0_melee, thac0_ranged, movement_rate_normal, movement_rate_encounter,
                encumbrance_status, save_death_ray, save_magic_wand, save_paralysis, save_dragon_breath, save_spells,
                alignment, gender, age, height, weight, hair_color, eye_color, gold_pieces, silver_pieces, copper_pieces,
                is_active, ability_adjustments, original_strength, original_dexterity, original_constitution, 
                original_intelligence, original_wisdom, original_charisma, personality, background, portrait_url
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            $valuesArray
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
        
        // Save equipment to character_inventory
        if (!empty($characterData['equipment']) && is_array($characterData['equipment'])) {
            foreach ($characterData['equipment'] as $equipmentItem) {
                $db->insert(
                    "INSERT INTO character_inventory (character_id, item_id, quantity, is_equipped)
                     VALUES (?, ?, ?, ?)",
                    [
                        $characterId,
                        $equipmentItem['item_id'],
                        $equipmentItem['quantity'],
                        $equipmentItem['is_equipped'] ?? false
                    ]
                );
            }
            
            error_log("Saved " . count($characterData['equipment']) . " items to inventory for character " . $characterId);
            
            // Log equipment purchase
            $db->insert(
                "INSERT INTO character_changes (character_id, user_id, change_type, field_name, new_value, change_reason) 
                 VALUES (?, ?, ?, ?, ?, ?)",
                [
                    $characterId,
                    $userId,
                    'equipment',
                    'starting_equipment',
                    json_encode($characterData['equipment']),
                    'Starting equipment purchased during character creation'
                ]
            );
        }
        
        // Save weapon masteries
        if (!empty($characterData['weapon_masteries']) && is_array($characterData['weapon_masteries'])) {
            error_log("Saving weapon masteries: " . json_encode($characterData['weapon_masteries']));
            
            // Mapping from integer rank to string rank
            $rankMap = [
                1 => 'basic',
                2 => 'skilled',
                3 => 'expert',
                4 => 'master',
                5 => 'grand_master'
            ];
            
            foreach ($characterData['weapon_masteries'] as $weaponMastery) {
                // Handle both old format (just item_id) and new format (with mastery_rank)
                $itemId = is_array($weaponMastery) ? $weaponMastery['item_id'] : $weaponMastery;
                $masteryRankInput = (is_array($weaponMastery) && isset($weaponMastery['mastery_rank'])) 
                    ? $weaponMastery['mastery_rank'] 
                    : 1;
                
                // Convert integer rank to string rank
                if (is_numeric($masteryRankInput)) {
                    $masteryRank = $rankMap[intval($masteryRankInput)] ?? 'basic';
                } else {
                    $masteryRank = $masteryRankInput; // Already a string
                }
                
                error_log("Saving weapon mastery: item_id=$itemId, mastery_rank=$masteryRank");
                
                $db->insert(
                    "INSERT INTO character_weapon_mastery (character_id, item_id, mastery_rank, learned_at_level)
                     VALUES (?, ?, ?, ?)",
                    [
                        $characterId,
                        $itemId,
                        $masteryRank,
                        1              // Learned at level 1
                    ]
                );
            }
            
            error_log("Saved " . count($characterData['weapon_masteries']) . " weapon masteries for character " . $characterId);
        }
        
        // Save general skills
        if (!empty($characterData['skills']) && is_array($characterData['skills'])) {
            foreach ($characterData['skills'] as $skill) {
                $db->insert(
                    "INSERT INTO character_skills (character_id, skill_name, learned_at_level)
                     VALUES (?, ?, ?)",
                    [
                        $characterId,
                        $skill['skill_name'],
                        1  // Learned at level 1
                    ]
                );
            }
            
            error_log("Saved " . count($characterData['skills']) . " skills for character " . $characterId);
        }
        
        // BECMI: Grant starting spells for Magic-Users and Elves
        // Rules Cyclopedia Chapter 3, page 1967-2012
        // Magic-Users start with 2 spells, Elves with 1 spell
        if (in_array($characterData['class'], ['magic_user', 'elf'])) {
            $numStartingSpells = BECMIRulesEngine::getStartingSpellsForClass($characterData['class'], 1);
            
            if ($numStartingSpells > 0 && !empty($characterData['starting_spells']) && is_array($characterData['starting_spells'])) {
                foreach (array_slice($characterData['starting_spells'], 0, $numStartingSpells) as $spellId) {
                    // Get spell details
                    $spell = $db->selectOne(
                        "SELECT spell_id, spell_name, spell_level, spell_type 
                         FROM spells 
                         WHERE spell_id = ? AND spell_type = 'magic_user' AND spell_level = 1",
                        [$spellId]
                    );
                    
                    if ($spell) {
                        $db->insert(
                            "INSERT INTO character_spells 
                             (character_id, spell_id, spell_name, spell_level, spell_type, 
                              memorized_count, max_memorized, is_memorized, times_cast_today, is_starting_spell)
                             VALUES (?, ?, ?, ?, ?, 0, 0, FALSE, 0, TRUE)",
                            [
                                $characterId,
                                $spell['spell_id'],
                                $spell['spell_name'],
                                $spell['spell_level'],
                                $spell['spell_type']
                            ]
                        );
                    }
                }
                
                error_log("Granted {$numStartingSpells} starting spells to {$characterData['class']} character {$characterId}");
            }
        }
        
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
    
    // Include detailed error in response for debugging (remove in production)
    Security::sendErrorResponse('Character creation error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine(), 500);
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
    
    // Calculate armor class (with inventory data)
    $stats['armor_class'] = BECMIRulesEngine::calculateArmorClass($characterData, $characterData['equipment'] ?? null);
    
    return $stats;
}
?>

