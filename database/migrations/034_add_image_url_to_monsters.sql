-- =====================================================
-- Migration: Add image_url to Monsters Table
-- Date: 2026-01-05
-- Description: Add image_url column to monsters table for monster images
-- =====================================================

ALTER TABLE monsters 
ADD COLUMN image_url VARCHAR(500) NULL AFTER description;
