<?php
/**
 * BECMI D&D Character Manager - Database Connection
 * 
 * Centralized database connection management with error handling,
 * security features, and connection pooling.
 */

class Database {
    private static $instance = null;
    private $connection = null;
    private $config = [];
    
    /**
     * Private constructor for singleton pattern
     */
    private function __construct() {
        $this->loadConfig();
        $this->connect();
    }
    
    /**
     * Get singleton instance
     */
    public static function getInstance() {
        if (self::$instance === null) {
            try {
                self::$instance = new self();
            } catch (Exception $e) {
                error_log("DATABASE ERROR: Failed to create database instance: " . $e->getMessage());
                throw $e;
            }
        }
        return self::$instance;
    }
    
    /**
     * Load database configuration
     */
    private function loadConfig() {
        // Load configuration from config file
        $configFile = __DIR__ . '/../../config/database.php';
        if (file_exists($configFile)) {
            $this->config = require $configFile;
        } else {
            // Fallback configuration
            $this->config = [
                'host' => getenv('DB_HOST') ?: 'localhost',
                'port' => getenv('DB_PORT') ?: '3306',
                'database' => getenv('DB_NAME') ?: 'becmi_vtt',
                'username' => getenv('DB_USER') ?: 'root',
                'password' => getenv('DB_PASS') ?: '',
                'charset' => 'utf8mb4',
                'options' => [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci"
                ]
            ];
        }
    }
    
    /**
     * Establish database connection
     */
    private function connect() {
        try {
            $dsn = "mysql:host={$this->config['host']};port={$this->config['port']};dbname={$this->config['database']};charset={$this->config['charset']}";
            
            // Use existing options - don't add unsupported timeout constants
            // PDO::MYSQL_ATTR_CONNECT_TIMEOUT doesn't exist in all PHP versions
            $options = $this->config['options'];
            
            $this->connection = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                $options
            );
            
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
    }
    
    /**
     * Get PDO connection
     */
    public function getConnection() {
        if ($this->connection === null) {
            $this->connect();
        }
        return $this->connection;
    }
    
    /**
     * Execute a prepared statement
     */
    public function execute($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log("Database query failed: " . $e->getMessage());
            error_log("SQL: " . $sql);
            error_log("Params: " . json_encode($params));
            throw new Exception("Database query failed: " . $e->getMessage());
        }
    }
    
    /**
     * Execute a SELECT query and return results
     */
    public function select($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetchAll();
    }
    
    /**
     * Execute a SELECT query and return results (alias for select)
     */
    public function fetchAll($sql, $params = []) {
        return $this->select($sql, $params);
    }
    
    /**
     * Execute a SELECT query and return single row
     */
    public function selectOne($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->fetch();
    }
    
    /**
     * Execute a SELECT query and return single row (alias for selectOne)
     */
    public function fetchRow($sql, $params = []) {
        return $this->selectOne($sql, $params);
    }
    
    /**
     * Execute an INSERT query and return last insert ID
     */
    public function insert($sql, $params = []) {
        $this->execute($sql, $params);
        return $this->connection->lastInsertId();
    }
    
    /**
     * Get last insert ID
     */
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
    
    /**
     * Execute an INSERT query and return last insert ID (alias for insert)
     */
    public function create($sql, $params = []) {
        return $this->insert($sql, $params);
    }
    
    /**
     * Execute an UPDATE query and return affected rows
     */
    public function update($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Execute an UPDATE query and return affected rows (alias for update)
     */
    public function modify($sql, $params = []) {
        return $this->update($sql, $params);
    }
    
    /**
     * Execute a DELETE query and return affected rows
     */
    public function delete($sql, $params = []) {
        $stmt = $this->execute($sql, $params);
        return $stmt->rowCount();
    }
    
    /**
     * Execute a DELETE query and return affected rows (alias for delete)
     */
    public function remove($sql, $params = []) {
        return $this->delete($sql, $params);
    }
    
    /**
     * Begin a transaction
     * 
     * @return bool True on success
     * @throws Exception If transaction fails to start
     */
    public function beginTransaction() {
        if (!$this->connection->beginTransaction()) {
            error_log("DATABASE ERROR: Failed to start transaction");
            throw new Exception("Failed to start transaction");
        }
        return true;
    }
    
    /**
     * Commit a transaction
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Rollback a transaction
     */
    public function rollback() {
        return $this->connection->rollback();
    }
    
    /**
     * Check if currently in a transaction
     */
    public function inTransaction() {
        return $this->connection->inTransaction();
    }
    
    /**
     * Get database statistics
     */
    public function getStats() {
        try {
            $stats = [];
            
            // Get table sizes
            $tables = $this->select("SHOW TABLES");
            foreach ($tables as $table) {
                $tableName = array_values($table)[0];
                $size = $this->selectOne("SELECT COUNT(*) as count FROM `{$tableName}`");
                $stats['tables'][$tableName] = $size['count'];
            }
            
            // Get connection info
            $stats['connection'] = [
                'host' => $this->config['host'],
                'database' => $this->config['database'],
                'charset' => $this->config['charset']
            ];
            
            return $stats;
            
        } catch (Exception $e) {
            error_log("Failed to get database stats: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Test database connection
     */
    public function testConnection() {
        try {
            $result = $this->selectOne("SELECT 1 as test");
            return $result['test'] === 1;
        } catch (Exception $e) {
            return false;
        }
    }
    
    /**
     * Prevent cloning
     */
    private function __clone() {}
    
    /**
     * Prevent unserialization
     */
    public function __wakeup() {
        throw new Exception("Cannot unserialize singleton");
    }
}

/**
 * Helper function to get database instance
 */
function getDB() {
    return Database::getInstance();
}
