# 03 Platform Hardening

## Goal

Reduce release risk in auth, security, realtime, uploads, logging, and recovery.

## Current signal

- [public/js/modules/auth.js:35-36](m:/rpg/BECMI%20VTT/public/js/modules/auth.js#L35) - frontend stores "`session_id`" in local storage as "`auth_token`"
- [public/js/core/api-client.js:403-406](m:/rpg/BECMI%20VTT/public/js/core/api-client.js#L403) - API client sends "`Authorization: Bearer`" from local storage
- [docs/API.md:11-18](m:/rpg/BECMI%20VTT/docs/API.md#L11) - docs describe auth as "`session cookie`" plus CSRF token
- [api/auth/verify.php:84-90](m:/rpg/BECMI%20VTT/api/auth/verify.php#L84) - verify endpoint explicitly skips DB session validation because it was "`slow`"
- [app/core/security.php:350-353](m:/rpg/BECMI%20VTT/app/core/security.php#L350) - server logs full email content for debugging
- [api/auth/login.php:98-99](m:/rpg/BECMI%20VTT/api/auth/login.php#L98) - login logs password hash excerpt
- [app/core/security.php:170-185](m:/rpg/BECMI%20VTT/app/core/security.php#L170) - a gated backend debug logging path already exists via `debugLog()`
- [app/core/security.php:648-704](m:/rpg/BECMI%20VTT/app/core/security.php#L648) - error responses already carry `request_id` and `error_id`

## Recommended platform stance

- Default auth model for `1.0`: cookie-session first
- `Authorization: Bearer` should either be fully implemented end-to-end or removed from the active flow
- All mutating endpoints must follow the same security contract:
  - authenticated user
  - CSRF check
  - input validation
  - safe error response with `request_id` and `error_id`
- All debug logging must be gated
- Uploads must be treated as hostile input:
  - strict MIME validation
  - file size limits
  - ownership checks
  - safe storage paths

## P0 hardening work

- Choose one auth model and make it consistent across frontend, backend, docs, and test flows
- Remove sensitive logs:
  - full email bodies
  - password hash excerpts
  - upstream API request secrets
  - partial API keys
- Review all mutating endpoints for CSRF enforcement and repo-standard `Security` flow usage
- Harden upload endpoints for:
  - MIME validation
  - file size handling
  - filename/path safety
  - user ownership and DM permission checks
- Ensure all production error responses include safe `request_id` and `error_id`
- Verify session expiry, logout, and reconnect behavior under expired or invalid session state

## P1 operational hardening

- Add environment validation at startup
- Add admin-facing diagnostics page or script
- Add storage health checks for:
  - uploads
  - portraits
  - maps
  - audio
- Add queue health checks for email jobs
- Add migration drift detector

## P1 UX hardening

- Better auth failure messaging
- clearer session expiry handling
- reconnect prompts with next steps
- upload retry UX
- graceful partial-failure UI states

## P2 recovery features

- admin resend for failed emails
- stuck session cleanup helpers
- repair scripts for orphaned files and DB rows
- safe maintenance mode
- audit log viewer for high-risk actions

## Release gate for this track

- A logged-in user can refresh, navigate, and mutate state without auth-model ambiguity
- A failed request always returns enough safe metadata to diagnose the failure
- No active production path logs secrets, hashes, or full sensitive payloads
- Upload flows fail safely and explain what the user can do next
- Operators have one documented path to inspect auth, uploads, email queue, and migration health

## Definition of done

- Auth flow is internally consistent
- Production logging does not leak secrets
- Core uploads and mutating API calls are protected and diagnosable
- Operators have a basic recovery and inspection toolkit
- Debugging information is available when enabled and quiet when disabled
