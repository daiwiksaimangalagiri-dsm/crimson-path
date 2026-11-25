// Collects IU Bloomington majors and minors into shared/data/programs.json.
// Run: node scripts/collect/programs.ts
// Sources (public, no login):
//   majors: IU's degree API behind bloomington.iu.edu/academics/degrees-majors/programs.html
//   minors: College of Arts and Sciences bulletin (College minors + minors from other schools open to College students)
import { writeFileSync } from "node:fs";
import { z } from "zod";

const UA = { "user-agent": "CrimsonPath prototype data collector" };
const DEGREES = "https://exdd-academics.webapps.iu.edu/api/public/v1/endpoint/degrees";
const BULLETIN = "https://bulletin.college.indiana.edu";

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`GET ${url} failed with ${res.status}`);
  return res.text();
}

const DegreePage = z.object({
  pagination: z.object({ pages: z.number() }),
  data: z.array(z.object({
    name: z.string(), degree: z.string(), url: z.string(),
    schools: z.array(z.object({ name: z.string() })),
  })),
});

// One entry per major name. Jacobs lists every instrument as its own degree ("Composition - Oboe"),
// so those collapse to the base name; the degree list keeps each distinct degree.
const SCHOOL_RENAMES: Record<string, string> = { "School of Informatics, Computing, and Engineering": "Luddy School of Informatics, Computing, and Engineering" };

async function majors() {
  const out = new Map<string, { name: string; degrees: string[]; school: string; url: string }>();
  for (let page = 1, pages = 1; page <= pages; page++) {
    const p = DegreePage.parse(JSON.parse(await get(`${DEGREES}?campus=bloomington&program_type=2&perPage=50&page=${page}`)));
    pages = p.pagination.pages;
    for (const d of p.data) {
      const raw = d.schools[0]?.name ?? "";
      const school = SCHOOL_RENAMES[raw] ?? raw;
      const name = school === "Jacobs School of Music" ? (d.name.split(" - ")[0] ?? d.name) : d.name;
      const cur = out.get(name);
      if (cur) { if (!cur.degrees.includes(d.degree)) cur.degrees.push(d.degree); }
      else out.set(name, { name, degrees: [d.degree], school, url: d.url });
    }
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

const text = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&#0?39;|&rsquo;/g, "'").replace(/\s+/g, " ").trim();
const rows = (html: string) => [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)]
  .map((r) => [...(r[1] ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1] ?? ""))
  .filter((c) => c.length > 0);

async function pagesOf(url: string): Promise<string[][]> {
  const all: string[][] = [];
  for (let start = 1; start < 50; start++) {
    const page = rows(await get(`${url}${url.includes("?") ? "&" : "?"}bulletin-filter-start=${start}`));
    if (!page.length || (all.length && text(page[0]?.[0] ?? "") === text(all[0]?.[0] ?? ""))) break;
    all.push(...page);
  }
  return all;
}

async function minors() {
  const college = (await pagesOf(`${BULLETIN}/programs/?programs-filter-type=minor`)).map((c) => {
    const href = /href="([^"]+)"/.exec(c[0] ?? "")?.[1] ?? "";
    return { name: text(c[0] ?? ""), school: "College of Arts and Sciences", url: href ? BULLETIN + href : `${BULLETIN}/programs/` };
  });
  const outside = (await pagesOf(`${BULLETIN}/programs/outside-minors.html`)).map((c) => ({
    name: text(c[0] ?? ""), school: text(c[2] ?? ""), url: `${BULLETIN}/programs/outside-minors.html`,
  }));
  const seen = new Set<string>();
  return [...college, ...outside].filter((m) => m.name && !seen.has(m.name) && seen.add(m.name)).sort((a, b) => a.name.localeCompare(b.name));
}

const [mj, mn] = await Promise.all([majors(), minors()]);
if (mj.length < 100 || mn.length < 100) throw new Error(`Too few programs collected (${mj.length} majors, ${mn.length} minors); the sources may have changed`);
writeFileSync("shared/data/programs.json", `${JSON.stringify({
  collectedAt: new Date().toISOString().slice(0, 10),
  sources: [`${DEGREES}?campus=bloomington&program_type=2`, `${BULLETIN}/programs/?programs-filter-type=minor`, `${BULLETIN}/programs/outside-minors.html`],
  majors: mj, minors: mn,
}, null, 1)}\n`);
console.log(JSON.stringify({ majors: mj.length, minors: mn.length }));
