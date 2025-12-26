-- =====================================================
-- BECMI HEX MAP RIVERS SYSTEM
-- Adds support for rivers and streams as edge-based features
-- =====================================================

-- Add rivers column to hex_tiles
-- Stores JSON: {"edge_index": "river_type", ...}
-- Edge indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left
-- River types: 'river', 'stream'
ALTER TABLE hex_tiles 
ADD COLUMN rivers JSON NULL COMMENT 'River information: {"0": "river", "2": "stream"} means edge 0 has a river, edge 2 has a stream';

-- Note: Multi-valued indexes only work with JSON arrays, not objects.
-- Since rivers stores objects like {"0": "river"}, we cannot create a functional index.
-- Queries will use the existing map_id index for filtering.

COMMIT;



