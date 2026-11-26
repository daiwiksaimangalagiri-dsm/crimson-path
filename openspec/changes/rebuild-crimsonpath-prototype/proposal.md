# Proposal

## Why

CrimsonPath exists today only as a single 870-line HTML page published on claude.ai (`.research/app/index.html`). It only calls Claude when opened at that link by a signed-in user, the AI flow has never been run end to end in a real browser, and nothing about it lives in this repo. The team needs a codebase it can run locally, test and keep building on, with the same student flow and a cleaner design.

## What Changes

- Rebuild the app as a local prototype: a Vite + React + TypeScript (strict) frontend and a small Node backend in the same repo.
- Keep the student flow from the research app, expanded: a welcome screen, a 12-question intake quiz (adding IU school, searchable IU Bloomington major and minor pickers, expected graduation term and summer plans), then classes already taken, then a roadmap built from either counselor notes or the student's own interests, then a chat that answers questions about the plan and changes it.
- Replace the claude.ai artifact runtime with the real Claude API, called only from the backend so the API key never reaches the browser.
- Move every rule that guards against wrong courses (verify against the catalog, drop taken classes, flag codes that aren't in the file, send any club, event or internship not in an opportunity file to "Ask your advisor") to the backend, so it runs on whatever the model returns.
- Ship an IU Bloomington undergraduate catalog as the only course source: the original 3,407-course paste kept whole, plus 3,194 courses from IU's public course API, with official credits on every course and 2026–27 GenEd areas on the 956 courses approved for one. Ship IU Bloomington's majors and minors lists. Scripts in `scripts/collect/` rebuild all of it.
- Show credits and GenEd areas on the roadmap: per-class tags, per-semester credits against the student's load, GenEd coverage from taken and planned classes, and progress toward 120 credits and the graduation term.
- Redesign the screens around the roadmap as a path through semesters, with dark mode, keyboard access and phone layouts.
- Collect IU clubs and events from public sources and internships from Handshake exports, so the roadmap can recommend them instead of always deferring to the advisor.
- Add a one-page export: Download PDF, and Save to Google Drive once a Google client ID is configured.
- Add a lead persona for Claude Code (`.claude/agents/lead.md`) that runs this change's tasks by assigning, reviewing and reporting.

## Capabilities

### New Capabilities

- `student-intake`: the intake quiz and the classes-taken step, and how the profile is kept between visits.
- `course-catalog`: course data, code lookup in loose formats, keyword search, and detecting course codes in pasted text.
- `roadmap-builder`: turning counselor notes or interests plus the profile into a checked semester-by-semester roadmap, and showing it.
- `plan-chat`: questions and change requests about a built roadmap, answered by the AI and checked by the same rules.
- `campus-opportunities`: clubs (beINvolved), events and workshops (public IU calendars) and internships (Handshake listings a signed-in teammate exports), each entry with its source.
- `roadmap-export`: a one-page roadmap for phones, downloadable as PDF and savable to Google Drive.

### Modified Capabilities

None. `openspec/specs/` is empty.

## Impact

- New code: `web/` (frontend), `server/` (backend), `shared/` (types, schemas and catalog logic used by both). This adds three top-level folders, which needs the lead's sign-off.
- New dependencies, all approved on 2026-11-25: vite, react, react-dom, typescript, @vitejs/plugin-react, vitest, @testing-library/react, jsdom, @playwright/test, zod, and @anthropic-ai/sdk 1.10.0 (the newest release at least 7 days old). Added with approval during the build: @testing-library/dom, @types/react, @types/react-dom, @types/node. The PDF export uses the browser's print and Google Drive's export, so it adds no package.
- New secrets: `ANTHROPIC_API_KEY` and an optional `VITE_GOOGLE_CLIENT_ID` in `.env` (gitignored), with a documented `.env.example`. The Google Cloud project for Drive is set up later by whoever owns it.
- New setup guide: `docs/setup.md` lists every tool, install and secret, so a teammate can get running from a clean machine.
- Cost: every roadmap build and chat message is a billed Claude API call.
- Public IU data sources, read without login: the degree API and course API behind academics.iu.edu, the College of Arts and Sciences bulletin, and the GenEd approved-course search. Collected files record their source and date.
- `.research/` stays local and gitignored. The prototype's catalog starts from its `courses.json`.
