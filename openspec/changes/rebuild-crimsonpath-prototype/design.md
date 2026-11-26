# Design

## Context

See proposal.md (Why). The source of truth for behavior is `.research/app/index.html` (local only): the quiz, the classes-taken step, the two prompts (notes and interests), the tweak prompt, the three catalog tools, and `enforce()`, which checks the AI's answer. Research screenshots: `.research/screenshots/q1.png`, `t1.png`, `v2.png`.

What the research data looks like:
- `.research/app/courses.json` is 3,407 rows of `[code, title, credits, offered, attributes, description]`, all strings. Only 28 rows list terms offered. 643 codes repeat because topic courses share a code with different titles, so the code alone isn't a key.
- `credits` can be a range such as "1–3". The research app reads the first number.

## Goals / Non-Goals

**Goals:**
- Same flow and rules as the research app, with the rules enforced on the server.
- A design that reads like IU and like a path, not like a dashboard kit.
- Every check runnable from the command line by a teammate on a clean machine.

**Non-Goals:**
- Accounts, logins, or storing anything on a server. The profile lives in the browser.
- Deploying anywhere. Local only (decided 2026-11-25).
- Graduate (500+) courses.
- Logging in to Handshake on anyone's behalf.

## Decisions

### Decision: One npm package with three source folders
`web/` (React UI), `server/` (Node HTTP API), `shared/` (zod schemas, inferred types, catalog lookup, search, code detection, plan checks). `shared/` is the single source of truth for contracts. Why: one `package.json` and one lockfile is the least to maintain. Workspaces would add config for no gain at this size.

### Decision: Server on Node 24's built-in `http` with native TypeScript
Node 24 runs `.ts` files directly (type stripping), so the server needs no Express, tsx or build step. Vite proxies `/api` to it in dev. Why: fewer dependencies. Rejected: Express (unneeded for three routes), Vite middleware only (mixes the server into the dev tool).

Routes:
- `GET /api/sources`: counts for courses and each opportunity file
- `POST /api/roadmap`: body `{mode, text, profile}`, returns a checked plan
- `POST /api/chat`: body `{message, profile, mode, text, detected, plan, history}`, returns `{reply, plan | null}`

Every body is parsed with a zod schema. A failed parse returns 400 with a code (`invalid_request`) and the field that failed. Bodies are limited to 64 KB, and notes or chat messages to 8,000 characters.

### Decision: Claude through the official SDK's tool runner
`@anthropic-ai/sdk` 1.10.0, `client.beta.messages.toolRunner` with `betaZodTool` for `lookup_course`, `search_courses`, `list_departments`, and one search for each loaded opportunity file. Model `claude-opus-5-5` (the lead's choice on 2026-11-25), adaptive thinking, effort `medium`. The final answer must be JSON matching the plan schema. The server validates it with zod and returns `ai_unreadable` when it doesn't match. Why: the SDK owns the loop, retries and typed errors. Rejected: raw `fetch` (the team rule is SDK first), Managed Agents (this is a fixed workflow, not an open-ended agent).

Errors map to stable codes the UI turns into the messages in the specs: `rate_limited` (SDK `RateLimitError`), `no_api_key` (key missing at startup), `ai_unreadable`, `ai_unavailable` (5xx or connection). Nothing is mapped to success.

### Decision: Plan checks live in `shared/plan.ts` and run on the server
This is a port of `enforce()` with three fixes:
1. Match on code plus title, so topic courses sharing a code don't collapse into one.
2. Check non-class items against the opportunity files instead of always moving them out of the plan.
3. Detect taken classes by code and title.
It runs on every roadmap and chat answer. Unit tests cover each rule in the specs.

### Decision: Prompts keep the research app's rules, with real dates
`buildPrompt`, `buildInterestPrompt` and `tweakPrompt` move to `server/prompts.ts`. "Today is November 17, 2026" becomes the real date, and term dates come from `shared/data/terms.json`: Spring 2027 classes begin Jan 11, 2027, spring break starts Mar 14, 2027, and any other term says "check One.IU". The stable parts (rules and output shape) go first, so prompt caching can reuse them.

Added after the first draft:
- A planning window: plan from the next term through the student's graduation term, and put classes in summer terms only if the student chose summer classes.
- Credits and GenEd: keep each term within the preferred load using tool-reported credits, and when two classes fit the advice equally, prefer the one that also fills a GenEd area. `search_courses` takes an optional `gened` filter.

### Decision: Data files
- `shared/data/courses.json`: same row shape as the research file. `scripts/collect/courses.ts` keeps all 3,407 original rows, adds the 3,194 Bloomington undergraduate (UGRD, under 500) courses from IU's course API that the paste lacked, fills credits from the API, and puts official GenEd areas (from the 2026–27 GenEd approved-course search) first in the attributes column. Result: 6,601 courses, all with credits, 956 with GenEd areas. This adds courses with honors variants, so a bare "INFO 101" now returns candidates instead of one match.
- `shared/data/programs.json`: from `scripts/collect/programs.ts`. Contains 225 bachelor's majors (IU degree API, Bloomington; Jacobs instrument variants collapsed to one major) and 198 minors (the College bulletin's minors, plus minors from other schools open to College students), each with its school and source URL.
- `shared/data/terms.json`: known term dates, edited by hand from the Registrar's calendar.
- `shared/data/clubs.json`, `events.json`, `internships.json`: arrays of `{name, description, url, source, collectedAt, ...type fields}`. They are produced by scripts in `scripts/collect/` and committed. A loader skips entries with no `url` and reports how many it skipped.
- Clubs: beINvolved's public organization search (the endpoint is confirmed during the data task).
- Events: events.iu.edu public listings or feed, upcoming only.
- Internships: `scripts/collect/import-handshake.ts` reads a CSV or JSON a signed-in teammate exports or copies from Handshake. Nothing logs in. Writing and reading CSV follows the `secure-csv-generation` checklist.

### Decision: PDF and Drive export without a PDF library
- Download PDF: a print stylesheet lays out the one-page view, and `window.print()` runs with `document.title` set to `crimsonpath-<major>-<date>`, which browsers use as the PDF filename. Phones offer Save as PDF in the same dialog.
- Save to Google Drive: Google Identity Services (loaded from accounts.google.com) gets a token with the `drive.file` scope. The browser uploads the one-page HTML and Drive converts it to a Google Doc in one request, then the app shows the Doc link. A student who wants a PDF in Drive can save it from Docs. This keeps the prototype to one Drive call.
- Why: the two PDF libraries checked (@react-pdf/renderer, jspdf) each have a single npm maintainer, and the team rule bars single-maintainer packages that do file I/O. Trade-off: download relies on the browser's print dialog, so it's one more tap than a direct download.
- The button shows only when `VITE_GOOGLE_CLIENT_ID` is set. Setup steps go in `docs/setup.md`.

### Decision: Visual design
The subject is a student walking a path from now to graduation at IU, so the roadmap is drawn as a path. That's the one bold element, and everything around it stays quiet.

- **Color**: IU Crimson `#990000` (brand, actions, counselor picks), Limestone `#E9E6DF` (surfaces; IU's buildings are Indiana limestone), Paper `#FBFAF7` (page), Ink `#231F1C` (text), Slate `#5C6670` (secondary text), Path Blue `#2B5C8A` (CrimsonPath suggestions). Dark mode swaps Paper and Ink for `#1B1917` and `#EEEAE4` and lightens Crimson to `#E0574F` for contrast. Every pair meets WCAG AA.
- **Type**: one family, Libre Franklin (a Franklin Gothic revival, the collegiate sports and signage face), loaded from Google Fonts like the research app, so no new package. Swap to self-hosted if the team wants no outside requests. Scale 14 / 16 / 20 / 28 / 40. Course codes use tabular figures, not monospace. Sentence case everywhere, with no all-caps tags.
- **Layout**:

```
Desktop (≥960px)                         Phone (<640px)
┌──────────────┬─────────────────────┐   ┌───────────────────┐
│ You (sticky) │ Summary sentence    │   │ Summary           │
│  profile     │ ●━━━━●━━━━●━━━━●    │   │ ● Spring 2027     │
│  notes /     │ Sp27 Fa27 Sp28 Fa28 │   │ ┃  class          │
│  interests   │ │    │    │         │   │ ┃  class          │
│  [Build]     │ cls  cls  cls       │   │ ● Fall 2027       │
│  sources     │ Ask your advisor    │   │ ┃  class          │
│              │ Chat                │   │ Ask your advisor  │
└──────────────┴─────────────────────┘   │ Chat (sheet)      │
                                          └───────────────────┘
```
  The path runs left to right on desktop and top to bottom on phones. Each semester is a node, and the line between nodes thickens with that term's credit load against the student's target. A counselor's pick is a solid crimson stop, and a suggestion is an outlined blue stop. That replaces the research app's colored side bars and legend tags.
- **Welcome**: one large headline, three numbered steps (a real sequence) and a Start button, with a crimson rule down the left that echoes the path. Returning students skip it.
- **Quiz**: one question per screen, big tap targets, Enter to continue, a thin crimson progress line. On wide screens, a list of all 12 questions sits beside the current one, showing each answer, and answered questions can be revisited. Long option lists get small icons. Major and minor use searchable pickers, and majors are filtered by the chosen school. No cards inside cards.
- **Roadmap additions**: a graduation bar (credits taken, then planned, out of 120, and the semesters left until the graduation term), a GenEd panel (one tile per area, solid when covered and dashed when not), GenEd tags on each class, and the semester credit line in crimson when it's over the student's load.
- **Motion**: two small moments. When a roadmap arrives, the path draws from the first node to the last (400ms), and each new quiz question fades in (220ms). Neither runs under `prefers-reduced-motion`. Opening a class expands in place.
- **Copy**: the research app's copy stays where it's clear, with "→" removed from buttons and "·" removed from meta strings.
- **Accessibility floor**: visible focus rings, ARIA tabs and listbox for autocomplete, 44px touch targets, checked at 200% text size.

### Decision: Lead persona as the main-session agent
`.claude/agents/lead.md` (model opus), started with `claude --agent lead`. It reads `tasks.md`, hands each task to a subagent (sonnet for routine edits and tests, haiku for lookups), reviews the result against the spec, runs the checks, ticks the task, commits, and pushes `main` at the end of each task group. Then it reports status, risks and the next decision to the managing lead. Why the main session: Claude Code subagents can't start subagents, so a lead that delegates has to be the main thread.

### Decision: Checks
`npm run check` runs `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) and `vitest run`. `npm run e2e` runs one Playwright flow in Google Chrome with the API stubbed at the browser's network layer, and saves screenshots at 375px and 1280px, light and dark. The real Claude call is checked once by hand (task 3.2), not in e2e. Lint and format tools are left out until the team asks for them.

## Risks / Trade-offs

- [Opus cost per build] → effort `medium`, prompt caching on the stable prefix. Cost per build is measured during the live test and written in `docs/setup.md`.
- [beINvolved or events.iu.edu change or block scraping] → the collectors save raw responses next to the output and fail loudly. The app runs without opportunity files.
- [Handshake terms of use] → no automated access. Only a signed-in person's own export or copy is imported.
- [Public repo] → `.env`, `.research/` and raw Handshake exports are gitignored. A check fails if `.env` is ever tracked.
- [Opportunity data goes stale] → every entry has `collectedAt`, and the sources panel shows the oldest date.
- [Topic courses share codes] → checks match code plus title (decision above).
- [GenEd list is campus-wide] → schools add their own requirements on top; the GenEd panel tells students to confirm with their advisor.
- [IU's degree API files some schools' majors under the College] → Media School, Hamilton Lugar and Eskenazi majors appear under College of Arts and Sciences; "Not sure yet" shows every major.
- [Collected data drifts] → each collector fails loudly when counts drop below a floor, and every file records when it was collected.

### Decision: No live search count while building
The research app showed "Searching the Classes file (N)…" as each tool call ran. Showing that here would need streaming from server to browser, so the prototype shows a fixed status line instead. Add it back with server-sent events if builds feel slow in testing.
