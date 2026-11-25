import { describe, expect, it } from "vitest";
import { gradTerms, programs, suggestPrograms, upcomingTerms } from "./programs.ts";

describe("programs", () => {
  it("has IU Bloomington majors and minors with sources", () => {
    expect(programs.majors.length).toBeGreaterThan(150);
    expect(programs.minors.length).toBeGreaterThan(150);
    for (const m of programs.majors) expect(m.url).toMatch(/^https:/);
  });

  it("narrows majors to the chosen school", () => {
    const hits = suggestPrograms(programs.majors, "acc", "Kelley School of Business");
    expect(hits.map((h) => h.name)).toContain("Accounting");
    for (const h of hits) expect(h.school).toBe("Kelley School of Business");
  });

  it("lists terms from the next one, and graduation terms without summers", () => {
    expect(upcomingTerms(new Date("2026-11-25"), 4)).toEqual(["Spring 2027", "Summer 2027", "Fall 2027", "Spring 2028"]);
    const g = gradTerms(new Date("2026-11-25"));
    expect(g[0]).toBe("Spring 2027");
    expect(g.at(-1)).toBe("Spring 2031");
    expect(g.some((t) => t.startsWith("Summer"))).toBe(false);
  });
});
