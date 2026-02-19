-- =====================================================
-- ADD AMBIANCE TRACK TYPE TO AUDIO SYSTEM
-- Adds 'ambiance' as a new track_type option
-- =====================================================

-- Modify track_type ENUM to include 'ambiance'
ALTER TABLE session_audio_tracks 
MODIFY track_type ENUM('music', 'sound', 'ambiance') NOT NULL DEFAULT 'music';
