<?php
/**
 * BECMI D&D Character Manager - DM Session Dashboard Endpoint
 * 
 * Returns complete session data with all player characters for DM view.
 * Only accessible by the session DM.
 * 
 * Request: GET
 * Query params: ?session_id=int
 * 
 * Response: {
 *   "status": "success",
 *   "data": {
 *     "session": {
 *       "session_id": int,
 *       "session_title": string,
 *       "session_description": string,
 *       "session_datetime": string,
 *       "duration_minutes": int,
 *       "status": string,
 *       "max_players": int
 *     },
 *     "players": [
 *       {
 *         "user_id": int,
 *         "username": string,
 *         "status": "accepted|invited|declined",
 *         "characters": [
 *           {
 *             "character_id": int,
 *             "character_name": string,
 *             "class": string,
 *             "level": int,
 *             "current_hp": int,
 *             "max_hp": int,
 *             "armor_class": int,
 *             "abilities": {...},
 *             "saving_throws": {...},
 *             ...
 *           }
 *         ]
 *       }
 *     ],
 *     "party_stats": {
 *       "total_characters": int,
 *       "average_level": float,
 *       "average_hp_percentage": float,
 *       "class_distribution": {...}
 *     }
 *   }
 * }
 */

require_once '../../app/core/database.php';
require_once '../../app/core/security.php';

// Initialize security
Security::init();

// Set content type
header('Content-Type: application/json');

try {
    // Only allow GET requests
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        Security::sendErrorResponse('Method not allowed', 405);
    }
    
    // Require authentication
    Security::requireAuth();
    
    // Get session ID from query parameters
    $sessionId = isset($_GET['session_id']) ? (int) $_GET['session_id'] : 0;
    
    if ($sessionId <= 0) {
        Security::sendValidationErrorResponse(['session_id' => 'Valid session ID is required']);
    }
    
    // Get current user ID
    $userId = Security::getCurrentUserId();
    
    // Get database connection
    $db = getDB();
    
    // Get session details
    $session = $db->selectOne(
        "SELECT session_id, dm_user_id, session_title, session_description,
                session_datetime, duration_minutes, status, max_players,
                created_at, updated_at
         FROM game_sessions
         WHERE session_id = ?",
        [$sessionId]
    );
    
    if (!$session) {
        Security::sendErrorResponse('Session not found', 404);
    }
    
    // Verify user is the DM
    if ($session['dm_user_id'] != $userId) {
        Security::sendErrorResponse('You do not have permission to view this dashboard. Only the DM can access this view.', 403);
    }
    
    // Get all players for the session
    $players = $db->select(
        "SELECT sp.user_id, sp.status, sp.joined_at,
                u.username, u.email
         FROM session_players sp
         JOIN users u ON sp.user_id = u.user_id
         WHERE sp.session_id = ?
         ORDER BY sp.status DESC, sp.joined_at ASC",
        [$sessionId]
    );
    
    // For each player, get their characters in this session
    $playerData = [];
    $allCharacters = [];
    
    foreach ($players as $player) {
        $playerId = (int) $player['user_id'];
        
        // Get characters for this player in this session
        $characters = $db->select(
            "SELECT character_id, character_name, class, level, experience_points,
                    current_hp, max_hp, 
                    strength, dexterity, constitution, intelligence, wisdom, charisma,
                    armor_class, thac0_melee, thac0_ranged,
                    movement_rate_normal, movement_rate_encounter, encumbrance_status,
                    save_death_ray, save_magic_wand, save_paralysis, save_dragon_breath, save_spells,
                    alignment, age, height, weight, hair_color, eye_color,
                    gold_pieces, silver_pieces, copper_pieces,
                    created_at, updated_at
             FROM characters
             WHERE user_id = ? AND session_id = ? AND is_active = 1
             ORDER BY character_name ASC",
            [$playerId, $sessionId]
        );
        
        // Note: Abilities are already included in the SELECT above (strength, dexterity, etc.)
        
        // Format character data
        $formattedCharacters = array_map(function($char) use ($db) {
            require_once '../../app/services/becmi-rules.php';
            
            $hpPercentage = $char['max_hp'] > 0 
                ? ($char['current_hp'] / $char['max_hp']) * 100 
                : 0;
            
            // Get character inventory for AC calculation
            $inventory = $db->select(
                "SELECT ci.*, i.name, i.description, i.weight_cn, i.cost_gp, i.item_type, 
                        i.damage_die, i.damage_type, i.ac_bonus, i.weapon_type, i.range_short, i.range_long
                 FROM character_inventory ci 
                 JOIN items i ON ci.item_id = i.item_id 
                 WHERE ci.character_id = ? 
                 ORDER BY ci.is_equipped DESC, i.item_type, i.name",
                [$char['character_id']]
            );
            
            // Recalculate THAC0 correctly (only base value)
            $thac0Data = BECMIRulesEngine::calculateTHAC0($char);
            
            // Recalculate AC with inventory (armor, shield, dexterity)
            $armorClass = BECMIRulesEngine::calculateArmorClass($char, $inventory);
            
            // Get XP needed for next level
            $xpForNextLevel = BECMIRulesEngine::getExperienceForNextLevel($char['class'], $char['level']);
            
            // Get character skills
            $skills = $db->select(
                "SELECT skill_name, bonus, learned_at_level, notes 
                 FROM character_skills 
                 WHERE character_id = ? 
                 ORDER BY skill_name",
                [$char['character_id']]
            );
            
            // Get character spells (if spellcasting class)
            $spells = [];
            $spellsByLevel = [];
            $memorizedByLevel = [];
            $memorizedSpells = [];
            $spellSlotsByLevel = [];
            
            if (in_array($char['class'], ['magic_user', 'cleric', 'elf', 'druid'])) {
                // Get spell slots available at this level
                // getSpellSlots returns an associative array with level as key (1-indexed)
                // Format: [1 => slots, 2 => slots, 3 => slots, ...]
                $spellSlots = BECMIRulesEngine::getSpellSlots($char['class'], $char['level']);
                $spellSlotsByLevel = $spellSlots; // Already in the correct format
                
                $spellData = $db->select(
                    "SELECT cs.spell_id, cs.spell_name, cs.spell_level, cs.spell_type,
                            cs.is_memorized, cs.times_cast_today,
                            s.range_text, s.duration_text
                     FROM character_spells cs
                     JOIN spells s ON cs.spell_id = s.spell_id
                     WHERE cs.character_id = ?
                     ORDER BY cs.spell_level, cs.spell_name",
                    [$char['character_id']]
                );
                
                foreach ($spellData as $spell) {
                    $spellLevel = (int) $spell['spell_level'];
                    $isMemorized = (bool) $spell['is_memorized'];
                    
                    $spells[] = [
                        'spell_id' => (int) $spell['spell_id'],
                        'spell_name' => $spell['spell_name'],
                        'spell_level' => $spellLevel,
                        'spell_type' => $spell['spell_type'],
                        'is_memorized' => $isMemorized,
                        'times_cast_today' => (int) $spell['times_cast_today']
                    ];
                    
                    if (!isset($spellsByLevel[$spellLevel])) {
                        $spellsByLevel[$spellLevel] = [];
                    }
                    $spellsByLevel[$spellLevel][] = $spell['spell_name'];
                    
                    if ($isMemorized) {
                        if (!isset($memorizedByLevel[$spellLevel])) {
                            $memorizedByLevel[$spellLevel] = 0;
                        }
                        $memorizedByLevel[$spellLevel]++;
                        
                        // Add to memorized spells list
                        if (!isset($memorizedSpells[$spellLevel])) {
                            $memorizedSpells[$spellLevel] = [];
                        }
                        $memorizedSpells[$spellLevel][] = $spell['spell_name'];
                    }
                }
            }
            
            return [
                'character_id' => (int) $char['character_id'],
                'character_name' => $char['character_name'],
                'class' => $char['class'],
                'level' => (int) $char['level'],
                'experience_points' => (int) $char['experience_points'],
                'xp_for_next_level' => $xpForNextLevel ? (int) $xpForNextLevel : null,
                'hp' => [
                    'current' => (int) $char['current_hp'],
                    'max' => (int) $char['max_hp'],
                    'percentage' => round($hpPercentage, 1),
                    'is_dead' => $char['current_hp'] <= 0
                ],
                'abilities' => [
                    'strength' => (int) $char['strength'],
                    'dexterity' => (int) $char['dexterity'],
                    'constitution' => (int) $char['constitution'],
                    'intelligence' => (int) $char['intelligence'],
                    'wisdom' => (int) $char['wisdom'],
                    'charisma' => (int) $char['charisma']
                ],
                'combat' => [
                    'armor_class' => (int) $armorClass, // Recalculated with inventory
                    'thac0' => (int) $thac0Data['base'], // Only ONE THAC0
                    'strength_to_hit_bonus' => (int) $thac0Data['strength_bonus'], // Separate bonus
                    'dexterity_to_hit_bonus' => (int) $thac0Data['dexterity_bonus'] // Separate bonus
                ],
                'movement' => [
                    'normal' => (int) $char['movement_rate_normal'],
                    'encounter' => (int) $char['movement_rate_encounter'],
                    'encumbrance' => $char['encumbrance_status']
                ],
                'saving_throws' => [
                    'death_ray' => (int) $char['save_death_ray'],
                    'magic_wand' => (int) $char['save_magic_wand'],
                    'paralysis' => (int) $char['save_paralysis'],
                    'dragon_breath' => (int) $char['save_dragon_breath'],
                    'spells' => (int) $char['save_spells']
                ],
                'details' => [
                    'alignment' => $char['alignment'],
                    'age' => $char['age'] ? (int) $char['age'] : null,
                    'height' => $char['height'],
                    'weight' => $char['weight'],
                    'hair_color' => $char['hair_color'],
                    'eye_color' => $char['eye_color']
                ],
                'wealth' => [
                    'gold' => (int) $char['gold_pieces'],
                    'silver' => (int) $char['silver_pieces'],
                    'copper' => (int) $char['copper_pieces']
                ],
                'skills' => array_map(function($skill) {
                    return [
                        'skill_name' => $skill['skill_name'],
                        'bonus' => (int) $skill['bonus'],
                        'learned_at_level' => (int) $skill['learned_at_level'],
                        'notes' => $skill['notes']
                    ];
                }, $skills),
                'spells' => [
                    'all' => $spells,
                    'by_level' => $spellsByLevel,
                    'slots_by_level' => $spellSlotsByLevel, // Spell slots available per level
                    'memorized_by_level' => $memorizedByLevel,
                    'memorized_spells' => $memorizedSpells, // Actual memorized spell names by level
                    'total' => count($spells),
                    'total_memorized' => array_sum($memorizedByLevel)
                ],
                'created_at' => $char['created_at'],
                'updated_at' => $char['updated_at']
            ];
        }, $characters);
        
        $allCharacters = array_merge($allCharacters, $formattedCharacters);
        
        $playerData[] = [
            'user_id' => $playerId,
            'username' => $player['username'],
            'email' => $player['email'],
            'status' => $player['status'],
            'joined_at' => $player['joined_at'],
            'character_count' => count($formattedCharacters),
            'characters' => $formattedCharacters
        ];
    }
    
    // Calculate party statistics
    $partyStats = [
        'total_characters' => count($allCharacters),
        'total_players' => count($players),
        'accepted_players' => count(array_filter($players, fn($p) => $p['status'] === 'accepted')),
        'invited_players' => count(array_filter($players, fn($p) => $p['status'] === 'invited')),
        'average_level' => 0,
        'average_hp_percentage' => 0,
        'class_distribution' => [],
        'total_hp' => 0,
        'characters_dead' => 0
    ];
    
    if (count($allCharacters) > 0) {
        $totalLevel = 0;
        $totalHpPercentage = 0;
        $totalHp = 0;
        $deadCount = 0;
        $classCount = [];
        
        foreach ($allCharacters as $char) {
            $totalLevel += $char['level'];
            $totalHpPercentage += $char['hp']['percentage'];
            $totalHp += $char['hp']['current'];
            
            if ($char['hp']['is_dead']) {
                $deadCount++;
            }
            
            $class = $char['class'];
            if (!isset($classCount[$class])) {
                $classCount[$class] = 0;
            }
            $classCount[$class]++;
        }
        
        $partyStats['average_level'] = round($totalLevel / count($allCharacters), 1);
        $partyStats['average_hp_percentage'] = round($totalHpPercentage / count($allCharacters), 1);
        $partyStats['class_distribution'] = $classCount;
        $partyStats['total_hp'] = $totalHp;
        $partyStats['characters_dead'] = $deadCount;
    }
    
    // Format session datetime
    $sessionDatetime = null;
    if (!empty($session['session_datetime'])) {
        $timestamp = strtotime($session['session_datetime']);
        if ($timestamp !== false) {
            $sessionDatetime = date('c', $timestamp);
        }
    }
    
    // Return complete dashboard data
    Security::sendSuccessResponse([
        'session' => [
            'session_id' => (int) $session['session_id'],
            'session_title' => $session['session_title'],
            'session_description' => $session['session_description'],
            'session_datetime' => $sessionDatetime,
            'duration_minutes' => (int) $session['duration_minutes'],
            'status' => $session['status'],
            'max_players' => (int) $session['max_players'],
            'created_at' => $session['created_at'],
            'updated_at' => $session['updated_at']
        ],
        'players' => $playerData,
        'party_stats' => $partyStats
    ]);
    
} catch (Exception $e) {
    error_log("GET DM DASHBOARD ERROR: " . $e->getMessage());
    error_log("GET DM DASHBOARD ERROR STACK TRACE: " . $e->getTraceAsString());
    Security::sendErrorResponse('Failed to get dashboard data: ' . $e->getMessage(), 500);
}

