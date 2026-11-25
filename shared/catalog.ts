import rows from "./data/courses.json" with { type: "json" };
import { z } from "zod";
import { CourseRowSchema, type Course, type CourseBrief, type Detected, type Lookup } from "./schemas.ts";

export const norm = (code: string): string => code.toUpperCase().replace(/\s+/g, " ").trim();
const compact = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const firstNum = (s: string): number => Number(/\d+(\.\d+)?/.exec(s)?.[0] ?? 0);
export const level = (code: string): number => Number(/(\d{3})/.exec(code)?.[1] ?? 0);

export type Catalog = { courses: Course[]; byCode: Map<string, Course[]> };

export function createCatalog(data: unknown): Catalog {
  const courses = z.array(CourseRowSchema).parse(data).map(([code, title, credits, offered, attributes, description]) => ({
    code, title, credits, offered, attributes, description, dept: code.split("-")[0] ?? "",
  }));
  const byCode = new Map<string, Course[]>();
  for (const c of courses) byCode.set(norm(c.code), [...(byCode.get(norm(c.code)) ?? []), c]);
  return { courses, byCode };
}

export const catalog: Catalog = createCatalog(rows);

export const brief = (c: Course): CourseBrief => ({ code: c.code, title: c.title, credits: c.credits, offered: c.offered || "not listed" });

// Loose formats: "INFO-I 101", "INFO I101", "info i 101", "INFO 101", "I101".
export function lookupCode(cat: Catalog, raw: string): Lookup {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
  const result = (near: Course[], max: number): Lookup => {
    if (near.length === 1 && near[0]) return { status: "found", course: brief(near[0]) };
    if (near.length > 1) return { status: "similar", candidates: near.slice(0, max).map(brief) };
    return { status: "not_in_catalog" };
  };
  // Dept + number ("INFO 101") first: the lettered pattern would also match it as "INF-O 101".
  let m = /^([A-Z]{2,5}) (\d{3})$/.exec(s);
  if (m) return result(cat.courses.filter((c) => c.dept === m?.[1] && c.code.endsWith(` ${m[2]}`)), 5);
  m = /^([A-Z]{2,5}) ?([A-Z]) ?(\d{3})$/.exec(s);
  if (m) {
    const exact = cat.byCode.get(`${m[1]}-${m[2]} ${m[3]}`);
    if (exact?.[0]) return { status: "found", course: brief(exact[0]) };
    return result(cat.courses.filter((c) => c.dept === m?.[1] && c.code.endsWith(` ${m[3]}`)), 5);
  }
  m = /^([A-Z]) ?(\d{3})$/.exec(s);
  if (m) return result(cat.courses.filter((c) => c.code.endsWith(`-${m?.[1]} ${m?.[2]}`)), 8);
  return { status: "not_a_code" };
}

const CODE_RE = /\b([A-Z]{2,5})[-\s]?([A-Z])[-\s]?(\d{3})\b/g;

export function detectCodes(cat: Catalog, notes: string): Detected[] {
  const found = new Map<string, Lookup>();
  for (const m of notes.toUpperCase().matchAll(CODE_RE)) if (!found.has(m[0])) found.set(m[0], lookupCode(cat, m[0]));
  return [...found].map(([mentioned, res]) => ({ mentioned, ...res }));
}

// Codes in a pasted list, normalized to "DEPT-L 123".
export const parseCodes = (text: string): string[] =>
  [...text.toUpperCase().matchAll(CODE_RE)].map((m) => `${m[1]}-${m[2]} ${m[3]}`);

const STOP = new Set(["the", "and", "of", "to", "in", "a", "for", "intro", "introduction", "course", "class", "i", "ii"]);

export function searchCourses(cat: Catalog, { query, dept = "", maxLevel = 499 }: { query: string; dept?: string; maxLevel?: number }): CourseBrief[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w && !STOP.has(w));
  const d = dept.toUpperCase();
  const scored: [number, Course][] = [];
  for (const c of cat.courses) {
    if (d && c.dept !== d) continue;
    const lvl = level(c.code);
    if (lvl > maxLevel) continue;
    const hay = `${c.code} ${c.title}`.toLowerCase();
    let s = words.length ? 0 : 1;
    for (const w of words) if (hay.includes(w)) s += w.length > 3 ? 2 : 1;
    if (s > 0) scored.push([s - lvl / 1000, c]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, 20).map(([, c]) => brief(c));
}

export function listDepartments(cat: Catalog): string {
  const m = new Map<string, number>();
  for (const c of cat.courses) m.set(c.dept, (m.get(c.dept) ?? 0) + 1);
  return [...m].map(([d, n]) => `${d}(${n})`).join(", ");
}

// Autocomplete for the classes-taken step: code prefix first, then titles containing every word.
export function suggestCourses(cat: Catalog, q: string): Course[] {
  if (q.trim().length < 2) return [];
  const pre = compact(q);
  const byCode = cat.courses.filter((c) => compact(c.code).startsWith(pre));
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const byTitle = cat.courses.filter((c) => words.every((w) => c.title.toLowerCase().includes(w)));
  return [...new Map([...byCode, ...byTitle].map((c) => [c.code, c])).values()].slice(0, 8);
}
