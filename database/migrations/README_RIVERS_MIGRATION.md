# Rivers Migration - How to Run

## Problem
Rivers and streams are not being saved because the `rivers` column doesn't exist in the `hex_tiles` table.

## Solution
Run the migration `018_hex_map_rivers.sql` on the database server.

## Method 1: Run via PHP Script (Recommended)
1. Upload `run_rivers_migration.php` to the server
2. Access it via browser: `https://becmi.snilld-api.dk/run_rivers_migration.php`
3. The script will:
   - Check if the column already exists
   - Add the column if it doesn't exist
   - Display success/error messages

## Method 2: Run SQL Directly
1. Connect to the MySQL database (`becmi_vtt`)
2. Run the SQL from `018_hex_map_rivers.sql`:
   ```sql
   ALTER TABLE hex_tiles 
   ADD COLUMN rivers JSON NULL 
   COMMENT 'River information: {"0": "river", "2": "stream"} means edge 0 has a river, edge 2 has a stream';
   ```

## Verification
After running the migration, verify the column exists:
```sql
SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'becmi_vtt' 
AND TABLE_NAME = 'hex_tiles' 
AND COLUMN_NAME = 'rivers';
```

If the query returns a row, the migration was successful.

## What This Migration Does
- Adds a `rivers` JSON column to `hex_tiles` table
- Stores river/stream information as: `{"edge_index": "river_type"}`
- Edge indices: 0=top, 1=top-right, 2=bottom-right, 3=bottom, 4=bottom-left, 5=top-left
- River types: 'river', 'stream'


