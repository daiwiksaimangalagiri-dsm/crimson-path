# Crimson Path setup

How to get Crimson Path running on a new machine. Every tool, install and secret the project uses is listed here. Update this file in the same commit as any install or configuration change.

Status (2026-11-25): the prototype is being built. The plan is in `openspec/changes/rebuild-crimsonpath-prototype/`.

## 1. Prerequisites

| Tool | Version checked | Why | Install | Verify |
|---|---|---|---|---|
| Node.js | 24.16.0 | Runs the frontend tooling and the server (runs `.ts` directly) | https://nodejs.org or `brew install node@24` | `node --version` |
| npm | 11.13.0 | Package manager (comes with Node) | with Node | `npm --version` |
| git | 2.50.1 | Version control | `xcode-select --install` | `git --version` |
| GitHub CLI | 2.102.0 | Clone and push | `brew install gh` then `gh auth login` | `gh auth status` |
| OpenSpec | 1.14.0 | Specs, designs, tasks | `npm install -g @fission-ai/openspec@1.14.0` | `openspec --version` |
| Google Chrome | any current | Browser tests and Playwright MCP | https://google.com/chrome | opens |
| Claude Code | current | AI pair; runs the `lead` agent | https://claude.com/claude-code | `claude --version` |

Machine used for these versions: macOS 26 (Darwin 25.6.0).

## 2. Get the code

```bash
gh repo clone daiwiksaimangalagiri-dsm/crimson-path
cd crimson-path
```

## 3. Secrets

The repo is public. Secrets go in `.env`, which git ignores. Never commit it.

| Variable | Needed for | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | Building roadmaps and chat (each call is billed) | https://console.anthropic.com → API keys |
| `VITE_GOOGLE_CLIENT_ID` | Optional. Shows "Save to Google Drive" | Google Cloud setup, section 6 |

`.env.example` lists them all.

## 4. Install, run, check

```bash
npm ci                  # installs the exact versions in package-lock.json
cp .env.example .env    # then fill in ANTHROPIC_API_KEY
npm run dev             # app on http://localhost:5173; API server on PORT (default 8787)
npm run check           # strict type check + unit tests; must pass before any commit
npm run e2e             # browser test of the full flow in Google Chrome, Claude stubbed
```

`npm run e2e` starts Vite by itself and saves screenshots (375px and 1280px, light and dark) to `e2e/.results/`, which git ignores. Look at them after any UI change.

Packages (exact versions, pinned in `package-lock.json`):

| Package | Version | Why |
|---|---|---|
| react, react-dom | 19.3.1 | UI |
| zod | 4.6.7 | Parses every request, the AI's answer and saved profiles |
| @anthropic-ai/sdk | 1.10.0 | Calls Claude from the server (newest release at least 7 days old at install) |
| vite, @vitejs/plugin-react | 8.3.8, 6.3.0 | Dev server and build |
| typescript | 7.0.2 | Strict type check (`tsc --noEmit`) |
| vitest | 5.1.1 | Unit tests (5.1.2 was a day old at install) |
| @testing-library/react, @testing-library/dom, jsdom | 16.3.3, 10.4.2, 31.0.1 | Component tests |
| @playwright/test | 1.65.1 | Browser test |
| @types/react, @types/react-dom, @types/node | 19.3.0, 19.3.0, 24.19.2 | Type definitions only |

The server runs TypeScript directly with Node 24, so it needs no build step. Imports inside `server/` and `shared/` use `.ts` extensions for that reason.

## 5. Claude Code for this repo

- Project MCP server `playwright-chrome` (`.mcp.json`) asks for approval the first time you open Claude Code here. Approve it.
- Lead workflow: `claude --agent lead` runs the active OpenSpec change's tasks, delegates to subagents, and pushes each milestone. Defined in `.claude/agents/lead.md`.
- OpenSpec commands: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.

## 6. Google Drive export (optional)

Filled in by task 6.3. Outline: create a Google Cloud project, enable the Drive API, configure the OAuth consent screen (External, testing), create a Web client ID with origin `http://localhost:5173`, and put it in `.env` as `VITE_GOOGLE_CLIENT_ID`.

## 7. Data sources

| File | Source | How it's refreshed |
|---|---|---|
| `shared/data/courses.json` | 6,601 IU Bloomington undergrad courses: the original catalog paste (3,407) plus 3,194 from IU's public course API, with official credits and 2026–27 GenEd areas from gened.indiana.edu | `node scripts/collect/courses.ts` (keeps every original course; no login; fails loudly if sources change) |
| `shared/data/programs.json` | IU Bloomington majors (IU's public degree API) and minors (College of Arts and Sciences bulletin, including minors from other schools) | `node scripts/collect/programs.ts` (no login; fails loudly if the sources change) |
| `shared/data/terms.json` | Known term dates (Spring 2027 only so far) | Edit by hand from the Registrar's academic calendar |
| `shared/data/clubs.json` | beINvolved public listings | `scripts/collect/clubs.ts` (task 5.1) |
| `shared/data/events.json` | IU public event listings | `scripts/collect/events.ts` (task 5.2) |
| `shared/data/internships.json` | A signed-in teammate's Handshake export | `scripts/collect/import-handshake.ts` (task 5.3) |

## 8. Troubleshooting

- Blank page and 404s for `/api.ts` in the browser: the Vite proxy must match `/api/`, not `/api`, or it forwards the frontend's own `api.ts` to the server.
- Roadmap says the server has no Claude API key: add `ANTHROPIC_API_KEY` to `.env` and restart `npm run dev`.
