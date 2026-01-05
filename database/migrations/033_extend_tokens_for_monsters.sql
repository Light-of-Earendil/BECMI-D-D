-- =====================================================
-- Migration: Extend Tokens for Monsters
-- Date: 2026-01-04
-- Description: Add monster_instance_id and initiative_id to session_map_tokens table
-- =====================================================

ALTER TABLE session_map_tokens 
ADD COLUMN monster_instance_id INT NULL AFTER character_id,
ADD COLUMN initiative_id INT NULL AFTER monster_instance_id,
ADD FOREIGN KEY (monster_instance_id) REFERENCES monster_instances(instance_id) ON DELETE SET NULL,
ADD FOREIGN KEY (initiative_id) REFERENCES combat_initiatives(initiative_id) ON DELETE SET NULL,
ADD INDEX idx_monster_instance (monster_instance_id),
ADD INDEX idx_initiative (initiative_id);
