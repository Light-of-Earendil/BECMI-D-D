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

-- Add index for faster border queries
ALTER TABLE hex_tiles 
ADD INDEX idx_borders (map_id, (CAST(borders AS CHAR(255) ARRAY)));

COMMIT;
