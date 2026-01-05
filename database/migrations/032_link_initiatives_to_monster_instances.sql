-- =====================================================
-- Migration: Link Initiatives to Monster Instances
-- Date: 2026-01-04
-- Description: Add monster_instance_id to combat_initiatives table
-- =====================================================

ALTER TABLE combat_initiatives 
ADD COLUMN monster_instance_id INT NULL AFTER character_id,
ADD FOREIGN KEY (monster_instance_id) REFERENCES monster_instances(instance_id) ON DELETE CASCADE,
ADD INDEX idx_monster_instance (monster_instance_id);
