-- =====================================================
-- BECMI HEX MAP SCALE SYSTEM
-- Adds scale setting to hex maps
-- Scale represents the distance in miles from center of one hex to center of the next
-- =====================================================

-- Add scale column to hex_maps
-- Stores the distance in miles from center of one hex to center of the next
-- Default: NULL (no scale set)
ALTER TABLE hex_maps 
ADD COLUMN scale DECIMAL(10, 2) NULL COMMENT 'Distance in miles from center of one hex to center of the next';

COMMIT;



