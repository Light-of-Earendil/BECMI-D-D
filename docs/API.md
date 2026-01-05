# BECMI VTT - API Documentation

**Last Updated**: 2026-01-06  
**Base URL**: `https://becmi.snilld-api.dk/api/`  
**Content-Type**: `application/json; charset=utf-8`

---

## Authentication

All endpoints (except public endpoints) require authentication via session cookie.

### CSRF Protection

All state-changing operations (POST, PUT, DELETE) require a CSRF token:
- Token is generated server-side and stored in session
- Token is sent in request header: `X-CSRF-Token: <token>`
- Token validation uses timing-safe comparison (`hash_equals()`)

### Rate Limiting

Login endpoint has rate limiting:
- **Limit**: 15 attempts per 5 minutes (configurable via `RATE_LIMIT_ATTEMPTS` and `RATE_LIMIT_WINDOW` constants)
- **Key**: Based on client IP address
- **Response**: 429 Too Many Requests

---

## Common Response Formats

### Success Response
```json
{
  "status": "success",
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Error Response
```json
{
  "status": "error",
  "message": "Error description",
  "errors": {
    "field_name": "Field-specific error message"
  }
}
```

### Status Codes
- `200` - Success
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `405` - Method Not Allowed
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## Endpoints

### Authentication

#### POST `/api/auth/login.php`
Authenticate user and create session.

**Auth**: None (public endpoint)

**Request**:
```json
{
  "username": "string (email or username)",
  "password": "string"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Login successful",
  "data": {
    "user_id": 1,
    "username": "player1",
    "email": "player1@example.com",
    "is_moderator": false
  }
}
```

**Response (Error)**:
```json
{
  "status": "error",
  "message": "Invalid username/email or password"
}
```

**Status Codes**: 200, 401, 429

**Rate Limiting**: 15 attempts per 5 minutes per IP

**Edge Cases**:
- Username can be email address
- Case-insensitive username matching
- Inactive users cannot login

---

### Character Management

#### POST `/api/character/create.php`
Create a new character.

**Auth**: Required (`Security::requireAuth()`)

**CSRF**: Required

**Request**:
```json
{
  "character_name": "string (max 50 chars)",
  "class": "fighter|cleric|magic_user|thief|dwarf|elf|halfling",
  "alignment": "lawful|neutral|chaotic",
  "strength": 3-18,
  "dexterity": 3-18,
  "constitution": 3-18,
  "intelligence": 3-18,
  "wisdom": 3-18,
  "charisma": 3-18,
  "session_id": "int (optional)"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Character created successfully",
  "data": {
    "character_id": 1,
    "character_name": "Aragorn",
    "level": 1,
    "experience_points": 0,
    "current_hp": 8,
    "max_hp": 8
  }
}
```

**Status Codes**: 200, 400, 401, 403

**Validation**:
- Character name: 1-50 characters
- Ability scores: 3-18 range
- Class and alignment: Enum values

---

#### POST `/api/character/update-hp.php`
Update character HP (damage/healing).

**Auth**: Required

**CSRF**: Required

**Request**:
```json
{
  "character_id": 1,
  "damage": 5,
  "healing": 0
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "HP updated successfully",
  "data": {
    "character_id": 1,
    "current_hp": 3,
    "max_hp": 8
  }
}
```

**Status Codes**: 200, 400, 401, 403, 404

**Edge Cases**:
- HP cannot go below 0
- HP cannot exceed max_hp
- Real-time event broadcasted to all session participants

---

### Session Management

#### POST `/api/session/create.php`
Create a new game session.

**Auth**: Required

**CSRF**: Required

**Request**:
```json
{
  "session_title": "string (max 100 chars)",
  "session_description": "string (optional)",
  "session_datetime": "YYYY-MM-DD HH:MM:SS",
  "duration_minutes": 180,
  "max_players": 6,
  "campaign_id": 1,
  "meet_link": "string (optional, Google Meet URL)"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Session created successfully",
  "data": {
    "session_id": 1,
    "dm_user_id": 1,
    "session_title": "The Lost Mines",
    "status": "scheduled"
  }
}
```

**Status Codes**: 200, 400, 401, 403

**Validation**:
- Session title: 1-100 characters
- Duration: 30-480 minutes
- Max players: 1-12
- Datetime must be in future

---

#### GET `/api/session/get-dm-dashboard.php`
Get DM dashboard data for a session.

**Auth**: Required

**Query Parameters**:
- `session_id` (int, required)

**Response (Success)**:
```json
{
  "status": "success",
  "data": {
    "session": { ... },
    "characters": [ ... ],
    "monster_instances": [ ... ],
    "initiative": [ ... ]
  }
}
```

**Status Codes**: 200, 401, 403, 404

**Access Control**: Only DM of session can access

---

### Monster Management

#### POST `/api/monsters/create-instance.php`
Create a monster instance from a monster template.

**Auth**: Required

**CSRF**: Required

**Request**:
```json
{
  "monster_id": 1,
  "session_id": 1,
  "count": 3,
  "custom_hp": 25,
  "is_named_boss": false,
  "instance_name": "Goblin Warrior",
  "equipment": {},
  "treasure": {},
  "spells": {},
  "notes": "string"
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Monster instance(s) created successfully",
  "data": {
    "instances": [
      {
        "instance_id": 1,
        "instance_name": "Goblin #1",
        "monster_id": 1,
        "current_hp": 5,
        "max_hp": 5
      }
    ],
    "count": 3
  }
}
```

**Status Codes**: 200, 400, 401, 403, 404

**Access Control**: Only DM can create monster instances

**Bulk Creation**:
- `count` parameter allows creating multiple instances (max: `MAX_BULK_CREATE_COUNT` = 50)
- Auto-naming: "Monster Name #1", "#2", etc.
- Named bosses use provided name

**HP Calculation**:
- If `custom_hp` provided, uses that value
- Otherwise, calculates from Hit Dice (e.g., "3*" = 3d8)

---

#### POST `/api/monsters/update-instance.php`
Update monster instance (equipment, treasure, spells, notes).

**Auth**: Required

**CSRF**: Required

**Request**:
```json
{
  "instance_id": 1,
  "equipment": {},
  "treasure": {},
  "spells": {},
  "notes": "string",
  "instance_name": "string",
  "armor_class": 5,
  "dexterity": 12
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Monster instance updated successfully",
  "data": {
    "instance_id": 1,
    "instance_name": "Goblin Warrior",
    "equipment": {},
    "treasure": {},
    "spells": {},
    "notes": "Updated notes"
  }
}
```

**Status Codes**: 200, 400, 401, 403, 404

**Access Control**: Only DM can update monster instances

**Query Optimization**: Uses explicit column list (no `SELECT *`)

---

### Combat

#### POST `/api/combat/remove-monster.php`
Remove monster from initiative tracker.

**Auth**: Required

**CSRF**: Required

**Request**:
```json
{
  "initiative_id": 1,
  "session_id": 1
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Monster removed from initiative tracker",
  "data": {
    "initiative_id": 1
  }
}
```

**Status Codes**: 200, 400, 401, 403, 404

**Access Control**: Only DM can remove monsters from initiative

**Query Optimization**: Uses explicit column list (no `SELECT *`)

---

### Forum

#### POST `/api/forum/posts/upload-image.php`
Upload image for forum post.

**Auth**: Required

**CSRF**: Required

**Request**: `multipart/form-data`
- `file` (file, required) - Image file
- `post_id` (int, optional) - Post ID if editing

**Response (Success)**:
```json
{
  "status": "success",
  "message": "Image uploaded successfully",
  "data": {
    "url": "/images/forum/abc123.jpg",
    "filename": "abc123.jpg"
  }
}
```

**Status Codes**: 200, 400, 401, 403, 413

**File Validation**:
- **Max Size**: `MAX_FILE_SIZE` constant (5MB)
- **MIME Types**: image/jpeg, image/png, image/gif, image/webp
- **Extensions**: .jpg, .jpeg, .png, .gif, .webp

**Security**:
- Safe filename generation (random component)
- MIME type validation using `finfo`
- Extension whitelist validation

---

### Items

#### GET `/api/items/list.php`
Get all available equipment items.

**Auth**: None (public endpoint)

**Query Parameters**:
- `category` (string, optional) - Filter by category
- `item_type` (string, optional) - Filter by item type

**Response (Success)**:
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "item_id": 1,
        "name": "Longsword",
        "item_type": "weapon",
        "cost_gp": 10,
        "weight_cn": 50,
        "damage_die": "1d8",
        "damage_type": "slashing"
      }
    ],
    "total_count": 150
  }
}
```

**Status Codes**: 200

**Query Optimization**: Uses explicit column list (no `SELECT *`)

---

## Error Handling

### Validation Errors
```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": {
    "character_name": "Character name is required",
    "strength": "Strength must be between 3 and 18"
  }
}
```

### Authentication Errors
```json
{
  "status": "error",
  "message": "Unauthorized"
}
```
Status Code: 401

### Permission Errors
```json
{
  "status": "error",
  "message": "Only the DM can perform this action"
}
```
Status Code: 403

### Not Found Errors
```json
{
  "status": "error",
  "message": "Character not found"
}
```
Status Code: 404

---

## Rate Limits

- **Login**: 15 attempts per 5 minutes per IP
- **Other endpoints**: No rate limiting (future: consider adding)

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `page` (int, default: 1) - Page number
- `limit` (int, default: 20, max: 100) - Items per page

**Response**:
```json
{
  "status": "success",
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "total_pages": 8
    }
  }
}
```

**Constants**: `PAGINATION_DEFAULT_LIMIT` (20), `PAGINATION_MAX_LIMIT` (100)

---

## Real-Time Events

Some operations broadcast real-time events to all session participants via long-polling:

**Event Types**:
- `character_hp_updated`
- `character_xp_updated`
- `monster_hp_updated`
- `initiative_updated`
- `audio_control`

**Endpoint**: `GET /api/realtime/poll.php`

**Timeout**: 25 seconds

---

## Testing

### Manual Testing
1. Use browser DevTools Network tab to inspect requests
2. Verify CSRF token in request headers
3. Check response status codes and body
4. Test error cases (invalid input, unauthorized access)

### Example cURL Commands

**Login**:
```bash
curl -X POST https://becmi.snilld-api.dk/api/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}' \
  -c cookies.txt
```

**Create Character** (requires session cookie):
```bash
curl -X POST https://becmi.snilld-api.dk/api/character/create.php \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <token>" \
  -b cookies.txt \
  -d '{"character_name":"Test","class":"fighter","alignment":"lawful","strength":15,"dexterity":12,"constitution":14,"intelligence":10,"wisdom":11,"charisma":13}'
```

---

## References

- [Architecture Documentation](ARCHITECTURE.md)
- [Database Documentation](DATABASE.md)
- [Code Review Report](../CODE_REVIEW_REPORT.md)
