import data from "./data/programs.json" with { type: "json" };
import { ProgramsSchema, type Programs } from "./schemas.ts";

export const programs: Programs = ProgramsSchema.parse(data);
export const NOT_SURE = "Not sure yet";
export const schools: string[] = [...new Set(programs.majors.map((m) => m.school))].sort();

// Up to 8 matches, names starting with the query first.
export function suggestPrograms(list: { name: string; school: string }[], q: string, school = ""): { name: string; school: string }[] {
  const s = q.trim().toLowerCase();
  const pool = school && school !== NOT_SURE ? list.filter((p) => p.school === school) : list;
  if (!s) return pool.slice(0, 8);
  const hits = pool.filter((p) => p.name.toLowerCase().includes(s));
  return [...hits.filter((p) => p.name.toLowerCase().startsWith(s)), ...hits.filter((p) => !p.name.toLowerCase().startsWith(s))].slice(0, 8);
}

// "Spring 2027", "Summer 2027", "Fall 2027", ... starting with the next term after `now`.
export function upcomingTerms(now: Date, count: number): string[] {
  const out: string[] = [];
  let year = now.getFullYear();
  let i = now.getMonth() < 4 ? 1 : now.getMonth() < 7 ? 2 : 0; // index into SEASONS of the next term
  if (i === 0) year += 1;
  const SEASONS = ["Spring", "Summer", "Fall"];
  while (out.length < count) {
    out.push(`${SEASONS[i]} ${year}`);
    i = (i + 1) % 3;
    if (i === 0) year += 1;
  }
  return out;
}

export const gradTerms = (now: Date): string[] => upcomingTerms(now, 13).filter((t) => !t.startsWith("Summer"));
