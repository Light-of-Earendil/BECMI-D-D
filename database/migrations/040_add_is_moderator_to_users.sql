-- Migration: align users schema with auth and moderation code paths
-- Adds moderator flag expected by login, verify, forum, and security flows.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_moderator BOOLEAN DEFAULT FALSE AFTER is_active;
