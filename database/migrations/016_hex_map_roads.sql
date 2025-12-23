-- =====================================================
-- BECMI HEX MAP ROADS SYSTEM
-- Adds support for roads as an overlay layer
-- Roads automatically connect to neighboring hex roads
-- =====================================================

-- Add roads column to hex_tiles
-- Stores JSON: {"edge_index": true, ...}
-- Edge indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left
-- Value is true if road exists on that edge
ALTER TABLE hex_tiles 
ADD COLUMN roads JSON NULL COMMENT 'Road information: {"0": true, "2": true} means edges 0 and 2 have roads';

-- Add index for faster road queries
ALTER TABLE hex_tiles 
ADD INDEX idx_roads (map_id, (CAST(roads AS CHAR(255) ARRAY)));

COMMIT;
