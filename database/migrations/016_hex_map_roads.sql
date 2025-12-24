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
ADD COLUMN roads JSON NULL COMMENT 'Road information: {"1": true, "3": true} means neighbors 1 and 3 have roads (center-to-center connections)';

-- Note: Multi-valued indexes only work with JSON arrays, not objects.
-- Since roads stores objects like {"1": true}, we cannot create a functional index.
-- Queries will use the existing map_id index for filtering.

COMMIT;
