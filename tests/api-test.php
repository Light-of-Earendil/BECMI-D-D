<?php
/**
 * BECMI D&D Character Manager - API Testing Suite
 * 
 * Comprehensive testing for API endpoints, rule calculations, and security.
 */

require_once '../app/core/database.php';
require_once '../app/core/security.php';
require_once '../app/services/becmi-rules.php';

class APITestSuite {
    private $db;
    private $testResults = [];
    private $testUser = null;
    private $testCharacter = null;
    private $testSession = null;
    
    public function __construct() {
        $this->db = getDB();
        echo "BECMI API Test Suite Initialized\n";
        echo "=====================================\n\n";
    }
    
    /**
     * Run all tests
     */
    public function runAllTests() {
        $this->testDatabaseConnection();
        $this->testBECMIRulesEngine();
        $this->testSecurityFunctions();
        $this->testAuthentication();
        $this->testCharacterManagement();
        $this->testSessionManagement();
        
        $this->displayResults();
        $this->cleanup();
    }
    
    /**
     * Test database connection
     */
    private function testDatabaseConnection() {
        echo "Testing Database Connection...\n";
        
        try {
            $result = $this->db->testConnection();
            $this->assertTrue($result, "Database connection test");
            
            $stats = $this->db->getStats();
            $this->assertNotNull($stats, "Database statistics retrieval");
            
            echo "Database connection successful\n";
            echo "Tables: ". count($stats['tables']) . "\n";
            echo "Host: ". $stats['connection']['host'] . "\n";
            echo "Database: ". $stats['connection']['database'] . "\n\n";
            
        } catch (Exception $e) {
            $this->assertFalse(true, "Database connection failed: ". $e->getMessage());
        }
    }
    
    /**
     * Test BECMI Rules Engine
     */
    private function testBECMIRulesEngine() {
        echo "Testing BECMI Rules Engine...\n";
        
        // Test character data
        $testCharacter = [
            'class'=> 'fighter',
            'level'=> 5,
            'strength'=> 16,
            'dexterity'=> 14,
            'constitution'=> 15,
            'intelligence'=> 12,
            'wisdom'=> 13,
            'charisma'=> 10
        ];
        
        // Test THAC0 calculation
        $thac0 = BECMIRulesEngine::calculateTHAC0($testCharacter);
        $this->assertEquals(16, $thac0['base'], "Fighter level 5 base THAC0");
        $this->assertEquals(14, $thac0['melee'], "Fighter level 5 melee THAC0 with STR 16");
        $this->assertEquals(15, $thac0['ranged'], "Fighter level 5 ranged THAC0 with DEX 14");
        
        // Test hit points calculation
        $hp = BECMIRulesEngine::calculateHitPoints($testCharacter);
        $this->assertEquals(40, $hp, "Fighter level 5 hit points (8+2)*5");
        
        // Test saving throws
        $saves = BECMIRulesEngine::calculateSavingThrows($testCharacter);
        $this->assertEquals(8, $saves['death_ray'], "Fighter level 5 death ray save");
        $this->assertEquals(9, $saves['magic_wand'], "Fighter level 5 magic wand save");
        
        // Test movement rates
        $movement = BECMIRulesEngine::calculateMovementRates($testCharacter);
        $this->assertEquals(120, $movement['normal'], "Unencumbered movement rate");
        $this->assertEquals(40, $movement['encounter'], "Unencumbered encounter movement");
        
        // Test experience requirements
        $xp = BECMIRulesEngine::getExperienceForNextLevel('fighter', 5);
        $this->assertEquals(32000, $xp, "Fighter level 5 to 6 XP requirement");
        
        echo "BECMI Rules Engine tests passed\n";
        echo "THAC0: Melee {$thac0['melee']}, Ranged {$thac0['ranged']}\n";
        echo "Hit Points: {$hp}\n";
        echo "Movement: {$movement['normal']}'/{$movement['encounter']}'\n\n";
    }
    
    /**
     * Test security functions
     */
    private function testSecurityFunctions() {
        echo "Testing Security Functions...\n";
        
        // Test password hashing
        $password = 'testpassword123';
        $hash = Security::hashPassword($password);
        $this->assertTrue(Security::verifyPassword($password, $hash), "Password hashing and verification");
        
        // Test input sanitization
        $dirtyInput = '<script>alert("xss")</script>Hello World';
        $cleanInput = Security::sanitizeInput($dirtyInput);
        $this->assertStringNotContainsString('<script>', $cleanInput, "Input sanitization removes scripts");
        
        // Test email validation
        $this->assertTrue(Security::validateEmail('test@example.com'), "Valid email validation");
        $this->assertFalse(Security::validateEmail('invalid-email'), "Invalid email validation");
        
        // Test username validation
        $this->assertTrue(Security::validateUsername('validuser123'), "Valid username validation");
        $this->assertFalse(Security::validateUsername('ab'), "Invalid username (too short)");
        $this->assertFalse(Security::validateUsername('user@name'), "Invalid username (special chars)");
        
        // Test password strength validation
        $this->assertTrue(Security::validatePassword('strongpass123'), "Strong password validation");
        $this->assertFalse(Security::validatePassword('weak'), "Weak password validation");
        
        echo "Security functions tests passed\n";
        echo "Password hashing: Working\n";
        echo "Input sanitization: Working\n";
        echo "Validation functions: Working\n\n";
    }
    
    /**
     * Test authentication system
     */
    private function testAuthentication() {
        echo "Testing Authentication System...\n";
        
        // Create test user
        $testUserData = [
            'username'=> 'testuser_'. time(),
            'email'=> 'test@example.com',
            'password'=> 'testpassword123'];
        
        try {
            // Test user registration
            $userId = $this->db->insert(
                "INSERT INTO users (username, email, password_hash, created_at) VALUES (?, ?, ?, NOW())",
                [$testUserData['username'], $testUserData['email'], Security::hashPassword($testUserData['password'])]
            );
            
            $this->assertGreaterThan(0, $userId, "User registration");
            $this->testUser = $userId;
            
            // Test user retrieval
            $user = $this->db->selectOne(
                "SELECT * FROM users WHERE user_id = ?",
                [$userId]
            );
            
            $this->assertNotNull($user, "User retrieval");
            $this->assertEquals($testUserData['username'], $user['username'], "Username match");
            
            // Test session creation
            $sessionId = Security::generateSessionId();
            $csrfToken = Security::generateCSRFToken();
            
            $this->db->insert(
                "INSERT INTO user_sessions (session_id, user_id, csrf_token, expires_at, ip_address) VALUES (?, ?, ?, ?, ?)",
                [$sessionId, $userId, $csrfToken, date('Y-m-d H:i:s', time() + 3600), '127.0.0.1']
            );
            
            $this->assertTrue(Security::validateCSRFToken($csrfToken), "CSRF token validation");
            
            echo "Authentication system tests passed\n";
            echo "User created: ID {$userId}\n";
            echo "Session management: Working\n";
            echo "CSRF protection: Working\n\n";
            
        } catch (Exception $e) {
            $this->assertFalse(true, "Authentication test failed: ". $e->getMessage());
        }
    }
    
    /**
     * Test character management
     */
    private function testCharacterManagement() {
        echo "Testing Character Management...\n";
        
        if (!$this->testUser) {
            echo "Skipping character tests - no test user\n\n";
            return;
        }
        
        try {
            // Create test session
            $sessionId = $this->db->insert(
                "INSERT INTO game_sessions (dm_user_id, session_title, session_datetime, status) VALUES (?, ?, ?, ?)",
                [$this->testUser, 'Test Session', date('Y-m-d H:i:s', time() + 86400), 'scheduled']
            );
            $this->testSession = $sessionId;
            
            // Create test character
            $characterData = [
                'user_id'=> $this->testUser,
                'session_id'=> $sessionId,
                'character_name'=> 'Test Fighter',
                'class'=> 'fighter',
                'level'=> 1,
                'strength'=> 16,
                'dexterity'=> 14,
                'constitution'=> 15,
                'intelligence'=> 12,
                'wisdom'=> 13,
                'charisma'=> 10,
                'alignment'=> 'lawful',
                'current_hp'=> 10,
                'max_hp'=> 10
            ];
            
            $characterId = $this->db->insert(
                "INSERT INTO characters (
                    user_id, session_id, character_name, class, level, experience_points,
                    current_hp, max_hp, strength, dexterity, constitution, intelligence, wisdom, charisma,
                    alignment, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
                array_values($characterData)
            );
            
            $this->assertGreaterThan(0, $characterId, "Character creation");
            $this->testCharacter = $characterId;
            
            // Test character retrieval
            $character = $this->db->selectOne(
                "SELECT * FROM characters WHERE character_id = ?",
                [$characterId]
            );
            
            $this->assertNotNull($character, "Character retrieval");
            $this->assertEquals('Test Fighter', $character['character_name'], "Character name match");
            
            // Test character update
            $this->db->update(
                "UPDATE characters SET current_hp = ? WHERE character_id = ?",
                [8, $characterId]
            );
            
            $updatedCharacter = $this->db->selectOne(
                "SELECT current_hp FROM characters WHERE character_id = ?",
                [$characterId]
            );
            
            $this->assertEquals(8, $updatedCharacter['current_hp'], "Character update");
            
            echo "Character management tests passed\n";
            echo "Character created: ID {$characterId}\n";
            echo "Character retrieval: Working\n";
            echo "Character update: Working\n\n";
            
        } catch (Exception $e) {
            $this->assertFalse(true, "Character management test failed: ". $e->getMessage());
        }
    }
    
    /**
     * Test session management
     */
    private function testSessionManagement() {
        echo "Testing Session Management...\n";
        
        if (!$this->testUser || !$this->testSession) {
            echo "Skipping session tests - no test data\n\n";
            return;
        }
        
        try {
            // Test session retrieval
            $session = $this->db->selectOne(
                "SELECT * FROM game_sessions WHERE session_id = ?",
                [$this->testSession]
            );
            
            $this->assertNotNull($session, "Session retrieval");
            $this->assertEquals('Test Session', $session['session_title'], "Session title match");
            
            // Test session update
            $this->db->update(
                "UPDATE game_sessions SET status = ? WHERE session_id = ?",
                ['active', $this->testSession]
            );
            
            $updatedSession = $this->db->selectOne(
                "SELECT status FROM game_sessions WHERE session_id = ?",
                [$this->testSession]
            );
            
            $this->assertEquals('active', $updatedSession['status'], "Session update");
            
            // Test session players
            $this->db->insert(
                "INSERT INTO session_players (session_id, user_id, status) VALUES (?, ?, ?)",
                [$this->testSession, $this->testUser, 'accepted']
            );
            
            $playerCount = $this->db->selectOne(
                "SELECT COUNT(*) as count FROM session_players WHERE session_id = ?",
                [$this->testSession]
            );
            
            $this->assertEquals(1, $playerCount['count'], "Session player count");
            
            echo "Session management tests passed\n";
            echo "Session created: ID {$this->testSession}\n";
            echo "Session retrieval: Working\n";
            echo "Session update: Working\n";
            echo "Player management: Working\n\n";
            
        } catch (Exception $e) {
            $this->assertFalse(true, "Session management test failed: ". $e->getMessage());
        }
    }
    
    /**
     * Display test results
     */
    private function displayResults() {
        echo "Test Results Summary\n";
        echo "======================\n";
        
        $totalTests = count($this->testResults);
        $passedTests = count(array_filter($this->testResults, function($result) {
            return $result['passed'];
        }));
        $failedTests = $totalTests - $passedTests;
        
        echo "Total Tests: {$totalTests}\n";
        echo "Passed: {$passedTests}\n";
        echo "Failed: {$failedTests}\n";
        echo "Success Rate: ". round(($passedTests / $totalTests) * 100, 2) . "%\n\n";
        
        if ($failedTests > 0) {
            echo "Failed Tests:\n";
            foreach ($this->testResults as $result) {
                if (!$result['passed']) {
                    echo "- {$result['test']}: {$result['message']}\n";
                }
            }
            echo "\n";
        }
        
        if ($passedTests === $totalTests) {
            echo "All tests passed! The BECMI system is working correctly.\n";
        } else {
            echo "Some tests failed. Please review the issues above.\n";
        }
    }
    
    /**
     * Cleanup test data
     */
    private function cleanup() {
        echo "\n Cleaning up test data...\n";
        
        try {
            if ($this->testCharacter) {
                $this->db->delete("DELETE FROM characters WHERE character_id = ?", [$this->testCharacter]);
            }
            
            if ($this->testSession) {
                $this->db->delete("DELETE FROM session_players WHERE session_id = ?", [$this->testSession]);
                $this->db->delete("DELETE FROM game_sessions WHERE session_id = ?", [$this->testSession]);
            }
            
            if ($this->testUser) {
                $this->db->delete("DELETE FROM user_sessions WHERE user_id = ?", [$this->testUser]);
                $this->db->delete("DELETE FROM users WHERE user_id = ?", [$this->testUser]);
            }
            
            echo "Cleanup completed\n";
            
        } catch (Exception $e) {
            echo "Cleanup failed: ". $e->getMessage() . "\n";
        }
    }
    
    /**
     * Assertion helper methods
     */
    private function assertTrue($condition, $message) {
        $this->testResults[] = [
            'test'=> $message,
            'passed'=> $condition === true,
            'message'=> $condition ? 'PASS': 'FAIL'];
    }
    
    private function assertFalse($condition, $message) {
        $this->assertTrue(!$condition, $message);
    }
    
    private function assertEquals($expected, $actual, $message) {
        $passed = $expected === $actual;
        $this->testResults[] = [
            'test'=> $message,
            'passed'=> $passed,
            'message'=> $passed ? 'PASS': "FAIL - Expected: {$expected}, Actual: {$actual}"];
    }
    
    private function assertNotNull($value, $message) {
        $this->assertTrue($value !== null, $message);
    }
    
    private function assertGreaterThan($expected, $actual, $message) {
        $passed = $actual > $expected;
        $this->testResults[] = [
            'test'=> $message,
            'passed'=> $passed,
            'message'=> $passed ? 'PASS': "FAIL - Expected > {$expected}, Actual: {$actual}"];
    }
    
    private function assertStringNotContainsString($needle, $haystack, $message) {
        $passed = strpos($haystack, $needle) === false;
        $this->testResults[] = [
            'test'=> $message,
            'passed'=> $passed,
            'message'=> $passed ? 'PASS': "FAIL - String contains '{$needle}'"];
    }
}

// Run tests if called directly
if (basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    $testSuite = new APITestSuite();
    $testSuite->runAllTests();
}
?>
