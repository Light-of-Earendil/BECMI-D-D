-- =====================================================
-- AUDIO SYSTEM FOR SESSION MUSIC AND SOUNDBOARD
-- Supports synchronized background music and sound effects
-- =====================================================

-- Create session audio tracks table
CREATE TABLE IF NOT EXISTS session_audio_tracks (
    track_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    track_name VARCHAR(200) NOT NULL,
    track_type ENUM('music', 'sound') NOT NULL DEFAULT 'music',
    duration_seconds INT NULL COMMENT 'Duration in seconds (can be NULL if not yet determined)',
    file_size_bytes BIGINT NULL COMMENT 'File size in bytes',
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_session_type (session_id, track_type),
    INDEX idx_created_by (created_by_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session audio playlists table
CREATE TABLE IF NOT EXISTS session_audio_playlists (
    playlist_id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    playlist_name VARCHAR(200) NOT NULL,
    created_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_id) ON DELETE CASCADE,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create session audio playlist tracks junction table
CREATE TABLE IF NOT EXISTS session_audio_playlist_tracks (
    playlist_track_id INT AUTO_INCREMENT PRIMARY KEY,
    playlist_id INT NOT NULL,
    track_id INT NOT NULL,
    track_order INT NOT NULL DEFAULT 0 COMMENT 'Order of track in playlist (0-based)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (playlist_id) REFERENCES session_audio_playlists(playlist_id) ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES session_audio_tracks(track_id) ON DELETE CASCADE,
    UNIQUE KEY unique_playlist_track_order (playlist_id, track_order),
    INDEX idx_playlist (playlist_id),
    INDEX idx_track (track_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
