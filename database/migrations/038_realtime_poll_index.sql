-- =====================================================
-- Realtime poll index alignment
-- Matches the session_events polling query by session_id,
-- processed flag, and event_id ordering.
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_session_poll_lookup
ON session_events(session_id, processed, event_id);
