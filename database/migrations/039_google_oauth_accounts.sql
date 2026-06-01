-- Migration: Google OAuth account links
-- Adds external identity links without changing the existing local login model.

CREATE TABLE IF NOT EXISTS user_oauth_accounts (
    oauth_account_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    provider_email VARCHAR(255) NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    given_name VARCHAR(100) NULL,
    family_name VARCHAR(100) NULL,
    picture_url TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    UNIQUE KEY uniq_oauth_provider_subject (provider, provider_user_id)
);

CREATE INDEX idx_user_oauth_user ON user_oauth_accounts(user_id);
CREATE INDEX idx_user_oauth_provider_email ON user_oauth_accounts(provider, provider_email);
