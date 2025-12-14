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
     * Helper function to write debug logs
     */
    private function writeDebugLog($data) {
        $logFile = __DIR__ . '/../../.cursor/debug.log';
        $logDir = dirname($logFile);
        if (!is_dir($logDir)) {
            @mkdir($logDir, 0755, true);
        }
        @file_put_contents($logFile, json_encode($data) . "\n", FILE_APPEND | LOCK_EX);
    }
    
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
                'host' => $_ENV['DB_HOST'] ?? 'localhost',
                'port' => $_ENV['DB_PORT'] ?? '3306',
                'database' => $_ENV['DB_NAME'] ?? 'becmi_vtt',
                'username' => $_ENV['DB_USER'] ?? 'root',
                'password' => $_ENV['DB_PASS'] ?? '',
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
            
            $this->connection = new PDO(
                $dsn,
                $this->config['username'],
                $this->config['password'],
                $this->config['options']
            );
            
            // Log successful connection
            error_log("Database connection established successfully");
            
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
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:100','message'=>'execute() called','data'=>['connection_null'=>$this->connection===null,'sql_preview'=>substr($sql,0,50)],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'A']);
        // #endregion
        try {
            // #region agent log
            $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:110','message'=>'Before connection->prepare','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'A']);
            // #endregion
            // Use getConnection() to ensure connection exists
            $conn = $this->getConnection();
            $stmt = $conn->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            // #region agent log
            $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:118','message'=>'PDOException caught','data'=>['error'=>$e->getMessage(),'connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'A']);
            // #endregion
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
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:164','message'=>'insert() called','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'B']);
        // #endregion
        $this->execute($sql, $params);
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:168','message'=>'Before connection->lastInsertId','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'B']);
        // #endregion
        // Use getConnection() to ensure connection exists
        return $this->getConnection()->lastInsertId();
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
     */
    public function beginTransaction() {
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:216','message'=>'beginTransaction() called','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'C']);
        // #endregion
        // Use getConnection() to ensure connection exists
        return $this->getConnection()->beginTransaction();
    }
    
    /**
     * Commit a transaction
     */
    public function commit() {
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:227','message'=>'commit() called','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'C']);
        // #endregion
        // Use getConnection() to ensure connection exists
        return $this->getConnection()->commit();
    }
    
    /**
     * Rollback a transaction
     */
    public function rollback() {
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:238','message'=>'rollback() called','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'C']);
        // #endregion
        // Use getConnection() to ensure connection exists
        return $this->getConnection()->rollback();
    }
    
    /**
     * Check if currently in a transaction
     */
    public function inTransaction() {
        // #region agent log
        $this->writeDebugLog(['id'=>'log_'.time().'_'.uniqid(),'timestamp'=>time()*1000,'location'=>'database.php:249','message'=>'inTransaction() called','data'=>['connection_null'=>$this->connection===null],'sessionId'=>'debug-session','runId'=>'post-fix','hypothesisId'=>'C']);
        // #endregion
        // Use getConnection() to ensure connection exists
        return $this->getConnection()->inTransaction();
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
?>
