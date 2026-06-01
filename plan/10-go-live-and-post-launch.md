# 10 Go Live And Post Launch

## Goal

Prepare the project for an actual release cycle, not just local development.

## Current signal

- [docs/INSTALLATION.md:182-199](m:/rpg/BECMI%20VTT/docs/INSTALLATION.md#L182) - production notes already call out HTTPS, database backups, and file backups
- [docs/ARCHITECTURE.md:315-322](m:/rpg/BECMI%20VTT/docs/ARCHITECTURE.md#L315) - the architecture doc already sketches deployment and rollback steps
- [README.md:182-190](m:/rpg/BECMI%20VTT/README.md#L182) - production environment variables are already documented as required
- [README.md:210-219](m:/rpg/BECMI%20VTT/README.md#L210) - cron jobs for reminders and email processing are already part of the operational model
- [LICENSE:18-25](m:/rpg/BECMI%20VTT/LICENSE#L18) - the current license explicitly restricts hosting and deployment without permission
- [LICENSE:66-66](m:/rpg/BECMI%20VTT/LICENSE#L66) - hosting permissions must be requested explicitly

## Recommended launch stance

- Treat the first real launch as a permissioned pilot or approved hosted release, not an uncontrolled public deployment
- No release candidate should exist without:
  - deployment steps
  - rollback steps
  - backup and restore steps
  - environment and cron verification
  - a clear statement about hosting permission under the current license

## P0 go-live work

- Create deployment checklist:
  - backup
  - pull/update
  - migrations
  - permissions
  - health checks
- Create rollback checklist
- Create release note template
- Create known issues template
- Verify environment variables and secrets handling
- Verify cron jobs and maintenance tasks
- Run a backup and restore drill on both database and critical uploaded files
- Document the hosting-permission decision that applies to the first release

## P1 docs and support

- player quick start guide
- DM quick start guide
- admin/operator guide
- migration guide
- backup and restore guide
- issue reporting guide

## P1 pilot release

- recruit pilot campaign group
- define feedback intake format
- run 3-session pilot
- classify all bugs by severity
- keep a short public changelog for pilot updates

## P2 post-launch operations

- support triage rhythm
- bugfix release cadence
- feature request review rhythm
- release branch strategy
- data retention and cleanup review

## P3 stretch ideas

- public roadmap page
- changelog page in-app
- upgrade assistant for admins
- telemetry opt-in for anonymous diagnostics

## Release gate for this track

- The team can deploy and roll back without improvisation
- Backups and restore steps have been documented and rehearsed
- Environment variables, cron jobs, and file permissions are verified for the target host
- The release model is compatible with the current license and any required hosting approval is explicit

## Definition of done

- We can deploy, roll back, support, and iterate without improvising each time
- The first pilot or release can be repeated by following the written runbook
