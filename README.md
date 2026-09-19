# Dream Hunt Media & Growth Agent — Trial MVP

This repository contains the trial version of Dream Hunt Foundation's AI-assisted social-media, sponsorship and revenue operating system.

## Live trial capabilities
- Dream Hunt member sign-in
- Sponsor CRM writes to `dh_sponsors`
- Activity creation writes to `dh_activities`
- Content package creation writes draft records to `dh_content_items`
- Agent runs are logged in `dh_agent_runs`
- Human approval tasks are added to `dh_agent_actions`
- Private `dh-trial-media` storage bucket with organization-scoped policies
- Publishing remains disabled
- Automated sponsor outreach sending remains disabled

## Trial architecture
1. Static/mobile-first front end.
2. Existing TeamRichOS Supabase used only as temporary trial host.
3. Every Dream Hunt table prefixed `dh_` for clean migration.
4. Supabase Auth + RLS + private Storage.
5. Human approval required for publishing and sponsor outreach.
6. After trial acceptance, migrate the package into a dedicated Dream Hunt Supabase project.

## Important data note
The dashboard's analytics and sponsor-dollar figures are illustrative demo values until live social, accounting and program sources are connected. Records entered into the connected Sponsor CRM, activity workflow, content drafts and approval queue are real trial records.

## Deployment
GitHub Pages deployment is configured through `.github/workflows/pages.yml`.

Expected URL:
https://jaysonrayrichardson-bot.github.io/dreamhunt-growth-agent/
