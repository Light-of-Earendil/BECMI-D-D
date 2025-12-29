-- =====================================================
-- BECMI HEX MAP SCALE SYSTEM
-- Adds scale setting to hex maps
-- Scale represents the distance from center of one hex to center of the next
-- =====================================================

-- Add scale column to hex_maps
-- Stores the distance from center of one hex to center of the next
-- Can be in any unit (km, miles, leagues, etc.) - unit is specified in UI
-- Default: NULL (no scale set)
ALTER TABLE hex_maps 
ADD COLUMN scale DECIMAL(10, 2) NULL COMMENT 'Distance from center of one hex to center of the next (in any unit - unit specified in UI)';

COMMIT;

