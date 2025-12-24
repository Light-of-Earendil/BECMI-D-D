-- =====================================================
-- BECMI HEX MAP BORDERS SYSTEM
-- Adds support for local, regional, and national borders
-- =====================================================

-- Add borders column to hex_tiles
-- Stores JSON: {"edge_index": "border_type", ...}
-- Edge indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left
-- Border types: 'local', 'regional', 'national'
ALTER TABLE hex_tiles 
ADD COLUMN borders JSON NULL COMMENT 'Border information: {"0": "national", "2": "regional"} means edge 0 has national border, edge 2 has regional border';

-- Note: Multi-valued indexes only work with JSON arrays, not objects.
-- Since borders stores objects like {"0": "national"}, we cannot create a functional index.
-- Queries will use the existing map_id index for filtering.

COMMIT;
