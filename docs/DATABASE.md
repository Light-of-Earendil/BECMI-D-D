# BECMI VTT - Database Documentation

**Last Updated**: 2026-01-06  
**Database**: `becmi_vtt`  
**Engine**: InnoDB  
**Charset**: utf8mb4  
**Collation**: utf8mb4_unicode_ci

---

## Overview

The database uses MySQL/MariaDB with InnoDB engine for ACID compliance and foreign key constraints. All queries use prepared statements to prevent SQL injection.

---

## Schema Changes (2026-01-06)

### No Schema Changes
All recent changes are code-only:
- Query optimizations (explicit column lists)
- Type declarations in PHP
- Constants for magic numbers
- Centralized utility functions

**No migrations required** for current changes.

---

## Tables

### Core Tables

#### `users`
User accounts and authentication.

**Columns**:
- `user_id` (INT, PK, AUTO_INCREMENT)
- `username` (VARCHAR(50), UNIQUE, NOT NULL)
- `email` (VARCHAR(100), UNIQUE, NOT NULL)
- `password_hash` (VARCHAR(255), NOT NULL)
- `is_active` (TINYINT(1), DEFAULT 1)
- `is_moderator` (TINYINT(1), DEFAULT 0)
- `created_at` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- `updated_at` (TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP)

**Indexes**:
- PRIMARY KEY (`user_id`)
- UNIQUE KEY `username` (`username`)
- UNIQUE KEY `email` (`email`)
- KEY `is_active` (`is_active`)

**Query Notes**:
- Login queries use `username` or `email` index
- All queries use prepared statements

---

#### `characters`
Character data and stats.

**Columns**:
- `character_id` (INT, PK, AUTO_INCREMENT)
- `user_id` (INT, FK -> users.user_id, NOT NULL)
- `session_id` (INT, FK -> game_sessions.session_id, NULL)
- `character_name` (VARCHAR(50), NOT NULL)
- `class` (ENUM, NOT NULL)
- `level` (INT, DEFAULT 1)
- `experience_points` (INT, DEFAULT 0)
- `current_hp` (INT, NOT NULL)
- `max_hp` (INT, NOT NULL)
- `strength`, `dexterity`, `constitution`, `intelligence`, `wisdom`, `charisma` (INT, CHECK 3-18)
- `armor_class` (INT, DEFAULT 10)
- `thac0_melee`, `thac0_ranged` (INT)
- `movement_rate_normal`, `movement_rate_encounter` (INT)
- `encumbrance_status` (ENUM)
- `save_death_ray`, `save_magic_wand`, `save_paralysis`, `save_dragon_breath`, `save_spells` (INT)
- `alignment` (ENUM, NOT NULL)
- `gold_pieces`, `silver_pieces`, `copper_pieces` (INT, DEFAULT 0)
- `is_active` (BOOLEAN, DEFAULT TRUE)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes**:
- PRIMARY KEY (`character_id`)
- FOREIGN KEY `user_id` (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE
- FOREIGN KEY `session_id` (`session_id`) REFERENCES `game_sessions`(`session_id`) ON DELETE SET NULL
- KEY `user_id` (`user_id`)
- KEY `session_id` (`session_id`)

**Query Notes**:
- Character list queries use `user_id` index
- Session character queries use `session_id` index
- All queries use explicit column lists (no `SELECT *`)

---

#### `game_sessions`
Game session data.

**Columns**:
- `session_id` (INT, PK, AUTO_INCREMENT)
- `dm_user_id` (INT, FK -> users.user_id, NOT NULL)
- `campaign_id` (INT, FK -> campaigns.campaign_id, NULL)
- `session_title` (VARCHAR(100), NOT NULL)
- `session_description` (TEXT)
- `session_datetime` (DATETIME, NOT NULL)
- `duration_minutes` (INT)
- `max_players` (INT)
- `status` (ENUM: 'scheduled', 'active', 'completed', 'cancelled')
- `meet_link` (VARCHAR(500))
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes**:
- PRIMARY KEY (`session_id`)
- FOREIGN KEY `dm_user_id` (`dm_user_id`) REFERENCES `users`(`user_id`)
- FOREIGN KEY `campaign_id` (`campaign_id`) REFERENCES `campaigns`(`campaign_id`)
- KEY `dm_user_id` (`dm_user_id`)
- KEY `campaign_id` (`campaign_id`)

---

#### `monsters`
Monster templates (master data).

**Columns**:
- `monster_id` (INT, PK, AUTO_INCREMENT)
- `name` (VARCHAR(100), NOT NULL)
- `armor_class` (INT, NOT NULL)
- `hit_dice` (VARCHAR(50), NOT NULL)
- `move_ground`, `move_flying`, `move_swimming` (VARCHAR(50))
- `attacks` (VARCHAR(200), NOT NULL)
- `damage` (VARCHAR(200), NOT NULL)
- `no_appearing` (VARCHAR(50), NOT NULL)
- `save_as` (VARCHAR(50), NOT NULL)
- `morale` (INT, NOT NULL)
- `treasure_type` (VARCHAR(10))
- `intelligence` (INT, NOT NULL)
- `alignment` (ENUM: 'Lawful', 'Neutral', 'Chaotic', NOT NULL)
- `xp_value` (INT, NOT NULL)
- `description` (TEXT)
- `image_url` (VARCHAR(500))
- `monster_type` (VARCHAR(100))
- `terrain` (VARCHAR(200))
- `load` (VARCHAR(100))
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes**:
- PRIMARY KEY (`monster_id`)
- KEY `name` (`name`)
- KEY `monster_type` (`monster_type`)

**Query Notes**:
- Monster lookups use `monster_id` index
- All queries use explicit column lists (no `SELECT *`)
- Example query in `api/monsters/create-instance.php:87`:
  ```sql
  SELECT monster_id, name, armor_class, hit_dice, ... (all 22 columns)
  FROM monsters WHERE monster_id = ?
  ```

---

#### `monster_instances`
Monster instances in sessions.

**Columns**:
- `instance_id` (INT, PK, AUTO_INCREMENT)
- `session_id` (INT, FK -> game_sessions.session_id, NOT NULL)
- `monster_id` (INT, FK -> monsters.monster_id, NOT NULL)
- `instance_name` (VARCHAR(100), NOT NULL)
- `is_named_boss` (TINYINT(1), DEFAULT 0)
- `current_hp` (INT, NOT NULL)
- `max_hp` (INT, NOT NULL)
- `armor_class` (INT)
- `dexterity` (INT)
- `equipment` (TEXT, JSON)
- `treasure` (TEXT, JSON)
- `spells` (TEXT, JSON)
- `notes` (TEXT)
- `is_active` (TINYINT(1), DEFAULT 1)
- `created_at`, `updated_at` (TIMESTAMP)

**Indexes**:
- PRIMARY KEY (`instance_id`)
- FOREIGN KEY `session_id` (`session_id`) REFERENCES `game_sessions`(`session_id`) ON DELETE CASCADE
- FOREIGN KEY `monster_id` (`monster_id`) REFERENCES `monsters`(`monster_id`)
- KEY `session_id` (`session_id`)
- KEY `monster_id` (`monster_id`)
- KEY `is_named_boss` (`is_named_boss`)

**Query Notes**:
- Instance lookups use `instance_id` index
- All queries use explicit column lists (no `SELECT *`)
- Example query in `api/monsters/update-instance.php:132`:
  ```sql
  SELECT instance_id, session_id, monster_id, ... (all 16 columns)
  FROM monster_instances WHERE instance_id = ?
  ```

---

#### `combat_initiatives`
Initiative tracker entries.

**Columns**:
- `initiative_id` (INT, PK, AUTO_INCREMENT)
- `session_id` (INT, FK -> game_sessions.session_id, NOT NULL)
- `character_id` (INT, FK -> characters.character_id, NULL)
- `monster_instance_id` (INT, FK -> monster_instances.instance_id, NULL)
- `entity_name` (VARCHAR(100), NOT NULL)
- `entity_type` (ENUM: 'character', 'npc', 'monster', DEFAULT 'character')
- `initiative_roll` (INT, NOT NULL)
- `dexterity` (INT)
- `is_active` (TINYINT(1), DEFAULT 1)
- `created_at` (TIMESTAMP)

**Indexes**:
- PRIMARY KEY (`initiative_id`)
- FOREIGN KEY `session_id` (`session_id`) REFERENCES `game_sessions`(`session_id`) ON DELETE CASCADE
- FOREIGN KEY `character_id` (`character_id`) REFERENCES `characters`(`character_id`) ON DELETE CASCADE
- FOREIGN KEY `monster_instance_id` (`monster_instance_id`) REFERENCES `monster_instances`(`instance_id`) ON DELETE CASCADE
- KEY `session_id` (`session_id`)
- KEY `character_id` (`character_id`)
- KEY `monster_instance_id` (`monster_instance_id`)

**Query Notes**:
- Initiative lookups use `initiative_id` and `session_id` indexes
- All queries use explicit column lists (no `SELECT *`)
- Example query in `api/combat/remove-monster.php:81`:
  ```sql
  SELECT initiative_id, session_id, character_id, ... (all 10 columns)
  FROM combat_initiatives WHERE initiative_id = ? AND session_id = ? AND entity_type = 'monster'
  ```

---

## Indexes

### Critical Indexes for Performance

#### `characters` table
- `user_id` - Used for: "Get all characters for user"
- `session_id` - Used for: "Get all characters in session"

**Query Example**:
```sql
EXPLAIN SELECT character_id, character_name, level, current_hp, max_hp
FROM characters WHERE user_id = ? AND is_active = 1;
```
**Expected**: Uses `user_id` index

---

#### `game_sessions` table
- `dm_user_id` - Used for: "Get all sessions for DM"
- `campaign_id` - Used for: "Get all sessions in campaign"

**Query Example**:
```sql
EXPLAIN SELECT session_id, session_title, session_datetime
FROM game_sessions WHERE dm_user_id = ? AND status = 'scheduled';
```
**Expected**: Uses `dm_user_id` index

---

#### `monster_instances` table
- `session_id` - Used for: "Get all monsters in session"
- `monster_id` - Used for: "Get all instances of monster type"

**Query Example**:
```sql
EXPLAIN SELECT instance_id, instance_name, current_hp, max_hp
FROM monster_instances WHERE session_id = ? AND is_active = 1;
```
**Expected**: Uses `session_id` index

---

## Migrations

### Migration System
Migrations are stored in `database/migrations/` directory.

**Apply Migration**:
```bash
# Manual application via MySQL client
mysql -u root -p becmi_vtt < database/migrations/YYYYMMDD_description.sql
```

**Rollback**:
- Check migration file for rollback instructions
- Some migrations are irreversible (data loss)

### Recent Migrations
- No migrations required for 2026-01-06 changes (code-only)

---

## Critical Queries

### Character List Query
**Location**: `api/character/list.php`

**Query**:
```sql
SELECT character_id, user_id, character_name, class, level, 
       current_hp, max_hp, created_at, updated_at
FROM characters 
WHERE user_id = ? AND is_active = 1
ORDER BY created_at DESC;
```

**Index Used**: `user_id`
**Complexity**: O(log n) with index
**Row Estimate**: 1-20 per user

**Verification**:
```sql
EXPLAIN SELECT character_id, user_id, character_name, class, level, 
       current_hp, max_hp, created_at, updated_at
FROM characters 
WHERE user_id = 1 AND is_active = 1
ORDER BY created_at DESC;
```

---

### DM Dashboard Query
**Location**: `api/session/get-dm-dashboard.php`

**Query**:
```sql
SELECT character_id, user_id, character_name, class, level,
       current_hp, max_hp, strength, dexterity, constitution,
       intelligence, wisdom, charisma, armor_class, thac0_melee,
       thac0_ranged, movement_rate_normal, movement_rate_encounter,
       encumbrance_status, save_death_ray, save_magic_wand,
       save_paralysis, save_dragon_breath, save_spells, alignment,
       age, height, weight, hair_color, eye_color, gold_pieces,
       silver_pieces, copper_pieces, created_at, updated_at
FROM characters
WHERE session_id = ? AND is_active = 1
ORDER BY user_id, character_name ASC;
```

**Index Used**: `session_id`
**Complexity**: O(log n) with index
**Row Estimate**: 1-12 per session

**Optimization**: Uses explicit column list (no `SELECT *`)

---

### Monster Instance Creation Query
**Location**: `api/monsters/create-instance.php:87`

**Query**:
```sql
SELECT monster_id, name, armor_class, hit_dice, move_ground,
       move_flying, move_swimming, attacks, damage, no_appearing,
       save_as, morale, treasure_type, intelligence, alignment,
       xp_value, description, image_url, monster_type, terrain,
       load, created_at, updated_at
FROM monsters WHERE monster_id = ?;
```

**Index Used**: PRIMARY KEY (`monster_id`)
**Complexity**: O(1)
**Optimization**: Uses explicit column list (all 22 columns)

---

## Query Optimization Notes

### Explicit Column Lists
**Status**: ✅ All `SELECT *` queries replaced with explicit columns

**Benefits**:
- Better performance (only fetch needed columns)
- Explicit data contracts
- Easier maintenance (schema changes don't break queries)

**Files Updated**:
- `api/character/level-up.php`
- `api/character/update.php` (2 queries)
- `api/user/notification-preferences.php`
- `api/items/magical-variants.php`
- `api/monsters/create-instance.php`
- `api/monsters/update-instance.php`
- `api/combat/remove-monster.php`

---

### Prepared Statements
**Status**: ✅ All queries use prepared statements

**Implementation**: `Database::execute($sql, $params)`

**Security**: PDO with `ATTR_EMULATE_PREPARES => false` ensures real prepared statements

---

### Transactions
**Status**: ✅ Used for multi-step operations

**Examples**:
- Character creation (character + inventory)
- Monster instance creation (instance + initiative entry)
- HP updates with event broadcasting

**Error Handling**: Automatic rollback on exception

---

## Data Integrity

### Foreign Key Constraints
All foreign keys have CASCADE or SET NULL behavior:
- `characters.user_id` → CASCADE (delete user = delete characters)
- `characters.session_id` → SET NULL (delete session = unlink characters)
- `monster_instances.session_id` → CASCADE (delete session = delete instances)

### Check Constraints
- Ability scores: 3-18 range
- HP: Cannot be negative (application-level validation)

---

## Backup and Recovery

### Backup Strategy
- Regular database dumps recommended
- Backup before schema migrations

### Recovery
- Restore from backup
- Re-run migrations if needed

---

## Performance Monitoring

### Slow Query Log
Enable in MySQL config:
```ini
slow_query_log = 1
long_query_time = 2
```

### Query Analysis
Run `EXPLAIN` on critical queries:
```sql
EXPLAIN SELECT ... FROM characters WHERE user_id = ?;
```

**Check**:
- `key` column: Should show index name
- `rows` column: Should be low (< 1000 for most queries)
- `type` column: Should be `ref` or `eq_ref` (not `ALL`)

---

## References

- [Schema File](../database/schema.sql)
- [Migrations Directory](../database/migrations/)
- [Code Review Report](../CODE_REVIEW_REPORT.md)
- [API Documentation](API.md)
