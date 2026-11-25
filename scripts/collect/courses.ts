// Adds official credits, GenEd areas and missing undergraduate courses to shared/data/courses.json.
// Run: node scripts/collect/courses.ts
// Keeps every course from the original catalog paste; only fills gaps. Sources (public, no login):
//   courses + credits: IU's course API behind academics.iu.edu/courses (Bloomington, undergraduate career)
//   GenEd areas: IU Bloomington's approved GenEd course search (gened.indiana.edu/approved-courses)
import { readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import { CourseRowSchema } from "../../shared/schemas.ts";

const UA = { "user-agent": "CrimsonPath prototype data collector" };
const COURSES_API = "https://exdd-academics.webapps.iu.edu/api/public/v1/endpoint/courses";
const GENED_API = "https://apps.ovpue.indiana.edu/gened-search/fetch-result.php";
const GENED_TERM = "4260"; // 2026–2027 academic year approvals
const AREAS: Record<string, string> = {
  AH: "A&H", SH: "S&H", NM: "N&M", NS: "N&M", WC: "World Cultures", WL: "World Languages", EC: "English Composition", MM: "Mathematical Modeling",
};

const ApiPage = z.object({
  pagination: z.object({ pages: z.number() }),
  data: z.array(z.object({
    crs_subj_cd: z.string(), crs_catlg_nbr: z.string(), crs_ttl_long_nm: z.string(),
    crs_min_unt_nbr: z.number(), crs_max_unt_nbr: z.number(), acad_career_cd: z.string(), crs_long_desc: z.string().nullish(),
  })),
});

async function apiCourses() {
  const out = new Map<string, { title: string; credits: string; description: string }>();
  for (let page = 1, pages = 1; page <= pages; page++) {
    const res = await fetch(`${COURSES_API}?campus=bloomington&perPage=1000&page=${page}&details=1`, { headers: UA });
    if (!res.ok) throw new Error(`Course API page ${page} failed with ${res.status}`);
    const p = ApiPage.parse(await res.json());
    pages = p.pagination.pages;
    for (const c of p.data) {
      const level = Number(/^\d{3}/.exec(c.crs_catlg_nbr)?.[0] ?? 999);
      if (c.acad_career_cd !== "UGRD" || level >= 500) continue;
      const credits = c.crs_min_unt_nbr === c.crs_max_unt_nbr ? String(c.crs_min_unt_nbr) : `${c.crs_min_unt_nbr}–${c.crs_max_unt_nbr}`;
      out.set(`${c.crs_subj_cd} ${c.crs_catlg_nbr}`, { title: c.crs_ttl_long_nm, credits, description: c.crs_long_desc ?? "" });
    }
  }
  return out;
}

async function gened() {
  const body = new URLSearchParams({ gened: "all", keyword: "", interests: "", departments: "", openSeatsTerm: "", approvalTerm: GENED_TERM, limit: "5000", view: "list", page: "1" });
  const res = await fetch(GENED_API, { method: "POST", headers: UA, body });
  if (!res.ok) throw new Error(`GenEd search failed with ${res.status}`);
  const html = await res.text();
  const out = new Map<string, Set<string>>();
  for (const li of html.match(/<li class="rvt-cols-12-lg[\s\S]*?<\/li>/g) ?? []) {
    const code = /data-label="([A-Z]{2,5}-[A-Z]{1,2} \d{3})/.exec(li)?.[1];
    const badge = /rvt-badge[^>]*>([A-Z]{2})</.exec(li)?.[1];
    const area = badge ? AREAS[badge] : undefined;
    if (code && area) out.set(code, (out.get(code) ?? new Set()).add(area));
  }
  return out;
}

const rows = z.array(CourseRowSchema).parse(JSON.parse(readFileSync("shared/data/courses.json", "utf8")));
const [api, ge] = await Promise.all([apiCourses(), gened()]);
if (api.size < 3000 || ge.size < 500) throw new Error(`Too little data (${api.size} courses, ${ge.size} GenEd codes); the sources may have changed`);

const known = new Set(rows.map((r) => r[0]));
let added = 0;
for (const [code, c] of api) {
  if (known.has(code)) continue;
  rows.push([code, c.title, c.credits, "", "", c.description]);
  known.add(code);
  added++;
}
// Column 4 (attributes) becomes the GenEd areas from the official list; anything else there is kept after them.
const out = rows.map(([code, title, credits, offered, attributes, description]) => {
  const areas = [...(ge.get(code) ?? [])];
  const rest = attributes.split(", ").filter((a) => a && !a.startsWith("IUB GenEd") && !areas.includes(a));
  return [code, title, credits || api.get(code)?.credits || "", offered, [...areas, ...rest].join(", "), description];
}).sort((a, b) => (a[0] ?? "").localeCompare(b[0] ?? ""));

writeFileSync("shared/data/courses.json", `${JSON.stringify(out)}\n`);
const withGened = out.filter((r) => ge.has(r[0] ?? "")).length;
console.log(JSON.stringify({ courses: out.length, added, withGened, genedCodes: ge.size }));
