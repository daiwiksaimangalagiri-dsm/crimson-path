# Crimson Path setup

How to get Crimson Path running on a new machine. Every tool, install and secret the project uses is listed here. Update this file in the same commit as any install or configuration change.

Status (2026-11-25): planning is done (`openspec/changes/rebuild-crimsonpath-prototype/`). App code and npm packages arrive in task group 1, and this file grows with each milestone.

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

`.env.example` (added in task 1.3) lists them all.

## 4. Install, run, check

Filled in by task group 1. Planned commands:

```bash
npm ci          # exact versions from package-lock.json
npm run dev     # web on http://localhost:5173, API proxied to the server
npm run check   # type check + unit tests
npm run e2e     # browser tests, Claude stubbed
```

## 5. Claude Code for this repo

- Project MCP server `playwright-chrome` (`.mcp.json`) asks for approval the first time you open Claude Code here. Approve it.
- Lead workflow: `claude --agent lead` runs the active OpenSpec change's tasks, delegates to subagents, and pushes each milestone. Defined in `.claude/agents/lead.md`.
- OpenSpec commands: `/opsx:propose`, `/opsx:apply`, `/opsx:archive`.

## 6. Google Drive export (optional)

Filled in by task 6.3. Outline: create a Google Cloud project, enable the Drive API, configure the OAuth consent screen (External, testing), create a Web client ID with origin `http://localhost:5173`, and put it in `.env` as `VITE_GOOGLE_CLIENT_ID`.

## 7. Data sources

| File | Source | How it's refreshed |
|---|---|---|
| `shared/data/courses.json` | IU course catalog paste, 3,407 undergrad courses | Copied from the research folder (task 2.1) |
| `shared/data/clubs.json` | beINvolved public listings | `scripts/collect/clubs.ts` (task 5.1) |
| `shared/data/events.json` | IU public event listings | `scripts/collect/events.ts` (task 5.2) |
| `shared/data/internships.json` | A signed-in teammate's Handshake export | `scripts/collect/import-handshake.ts` (task 5.3) |

## 8. Troubleshooting

Added as problems come up.
