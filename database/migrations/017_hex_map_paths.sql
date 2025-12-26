-- =====================================================
-- BECMI HEX MAP PATHS SYSTEM
-- Adds support for paths as an overlay layer (dashed lines)
-- Paths automatically connect to neighboring hex paths
-- =====================================================

-- Add paths column to hex_tiles
-- Stores JSON: {"edge_index": true, ...}
-- Edge indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left
-- Value is true if path exists on that edge
ALTER TABLE hex_tiles 
ADD COLUMN paths JSON NULL COMMENT 'Path information: {"1": true, "3": true} means neighbors 1 and 3 have paths (center-to-center connections, drawn as dashed lines)';

-- Note: Multi-valued indexes only work with JSON arrays, not objects.
-- Since paths stores objects like {"1": true}, we cannot create a functional index.
-- Queries will use the existing map_id index for filtering.

COMMIT;
