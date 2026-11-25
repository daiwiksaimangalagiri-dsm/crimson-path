import { norm, type Catalog } from "./catalog.ts";
import type { AdvisorItem, Detected, Mode, Plan, PlanItem } from "./schemas.ts";

const key = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
const lower = (s: string): string => s.toLowerCase().trim();

// Runs on every AI answer before the student sees it. The AI is never trusted to follow the rules.
export function checkPlan(cat: Catalog, plan: Plan, detected: Detected[], mode: Mode, taken: string[]): Plan {
  const ask: AdvisorItem[] = [...plan.ask_advisor];
  const placed = new Set<string>();
  const takenSet = new Set(taken.map(norm));
  const counselorCodes = new Set(
    detected.flatMap((d) => [d.course?.code, ...(d.candidates ?? []).map((c) => c.code)]).filter((c) => c !== undefined),
  );

  const semesters = plan.semesters.map((t) => {
    const items: PlanItem[] = [];
    for (const it of t.items) {
      if (lower(it.type) !== "class") {
        ask.push({ need: it.name, why: "Clubs, events and internships aren't in CrimsonPath's files yet." });
        continue;
      }
      // Topic courses share a code, so match the title too.
      const same = cat.byCode.get(norm(it.code)) ?? [];
      const name = lower(it.name);
      const hit = same.find((c) => lower(c.title) === name) ?? same.find((c) => name.length > 3 && lower(c.title).includes(name)) ?? same[0];
      if (!hit) {
        ask.push({ need: `${it.code} ${it.name}`.trim(), why: "Couldn't find this course in the catalog, so it was removed." });
        continue;
      }
      // ponytail: taken classes match by code, so taking one topic of a shared code hides the others.
      if (takenSet.has(norm(hit.code))) {
        ask.push({
          need: `${hit.code} ${hit.title.toLowerCase()}`,
          why: "You've already taken this, so it was left out. If your counselor named it, ask whether they meant a different class.",
        });
        continue;
      }
      const id = hit.code + hit.title;
      if (placed.has(id)) continue;
      placed.add(id);
      const origin = mode === "notes" && (it.origin === "counselor" || counselorCodes.has(hit.code)) ? "counselor" : "suggested";
      items.push({ ...it, origin, name: hit.title, code: hit.code, credits: hit.credits, offered: hit.offered });
    }
    return { term: t.term, items };
  }).filter((t) => t.items.length > 0);

  for (const d of detected) {
    if (d.status === "not_in_catalog" && !ask.some((a) => key(a.need).includes(key(d.mentioned)))) {
      ask.push({ need: d.mentioned, why: "Your counselor mentioned this, but it isn't in the catalog. Double-check the code with them." });
    }
  }
  return { profile_summary: plan.profile_summary, suggestions: plan.suggestions, semesters, ask_advisor: ask };
}
