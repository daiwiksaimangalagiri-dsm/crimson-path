# Tasks

This is a prototype: build the smallest thing that meets each spec scenario. One test file per module and one browser test for the full flow. No extra polish passes.

Each group is a milestone. When a group is done and `npm run check` passes, commit and push to `main`.

## 1. Scaffold

- [x] 1.1 Add `package.json`, `tsconfig.json` (strict), `vite.config.ts` (root `web/`, `/api` proxy), `.env.example`, and `dev` / `check` / `e2e` scripts. Install the approved packages with `--save-exact`. Verify `npm run check` passes and `git check-ignore .env .research` prints both
- [x] 1.2 Update `docs/setup.md` section 4 with the real commands, and verify by following it in a fresh clone

## 2. Catalog and plan rules (shared)

- [x] 2.1 Copy `courses.json` to `shared/data/`. Add schemas (`shared/schemas.ts`) and `lookupCode`, `searchCourses`, `detectCodes` (`shared/catalog.ts`). Verify `shared/catalog.test.ts` covers the course-catalog scenarios
- [x] 2.2 Port `enforce()` to `shared/plan.ts`, matching on code plus title. Verify `shared/plan.test.ts` covers the roadmap-builder rules (invented course, taken class, fake counselor code, non-class item, origin labels)

## 3. Server

- [ ] 3.1 Add `server/prompts.ts` (real date, `shared/data/terms.json`), `server/claude.ts` (SDK tool runner, `claude-opus-5-5`, error codes) and `server/main.ts` (`/api/sources`, `/api/roadmap`, `/api/chat`, zod-checked bodies). Verify `server/main.test.ts` covers 400, `no_api_key` and a stubbed happy path
- [ ] 3.2 Run one live build with the Informatics sample notes. Verify BUS-M 999 and INFO-H 400 land in Ask your advisor, and write the cost of one build in `docs/setup.md`

## 4. Screens

- [ ] 4.1 Add design tokens (light and dark) and the layout. Build the quiz and the classes-taken step, and save the profile in localStorage. Verify `web/intake.test.tsx` covers the student-intake scenarios
- [ ] 4.2 Build the roadmap screen (tabs, samples, sources, path view, expandable stops, Ask your advisor, errors) and the chat. Verify `web/roadmap.test.tsx` covers the display, chat and error scenarios, and screenshot it at 375px and 1280px, light and dark

## 5. Campus opportunities data

- [ ] 5.1 Write `scripts/collect/clubs.ts` (beINvolved) and `scripts/collect/events.ts` (IU events, upcoming only). Commit their JSON. Verify every entry has a `url` and a `collectedAt`
- [ ] 5.2 Add `scripts/collect/import-handshake.ts` for a teammate's Handshake export, and document the export steps in `docs/setup.md`. Verify with a small fixture
- [ ] 5.3 Add opportunity search tools and wire them into the plan checks. Verify the campus-opportunities scenarios in `shared/plan.test.ts`

## 6. Export

- [ ] 6.1 Build the one-page view, print stylesheet and Download PDF. Verify in Chrome that the PDF is one page and named `crimsonpath-<major>-<date>.pdf`
- [ ] 6.2 Add Save to Google Drive, hidden without `VITE_GOOGLE_CLIENT_ID`, and document the Google Cloud setup in `docs/setup.md`. Verify the hidden state and the cancelled sign-in message in a test

## 7. Wrap up

- [ ] 7.1 Add one Playwright test for the full flow with Claude stubbed (quiz, classes taken, build, chat change, PDF). Verify `npm run e2e` passes
- [ ] 7.2 Fill in the CLAUDE.md TODOs (check commands, folder map). Verify `openspec validate rebuild-crimsonpath-prototype --strict` passes
