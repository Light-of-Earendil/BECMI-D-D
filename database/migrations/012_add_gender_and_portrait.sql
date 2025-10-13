-- Migration: Add gender and portrait fields to characters table
-- Together AI FLUX integration for character portraits

USE becmi_vtt;

-- Add gender column
ALTER TABLE characters 
ADD COLUMN gender ENUM('male', 'female', 'other') NULL DEFAULT NULL
AFTER alignment;

-- Add portrait_url column
ALTER TABLE characters
ADD COLUMN portrait_url VARCHAR(512) NULL DEFAULT NULL
AFTER background;

-- Add index for faster queries
CREATE INDEX idx_gender ON characters(gender);

