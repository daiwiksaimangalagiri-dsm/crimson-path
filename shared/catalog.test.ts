import { describe, expect, it } from "vitest";
import { catalog, detectCodes, lookupCode, parseCodes, searchCourses, suggestCourses } from "./catalog.ts";

describe("catalog", () => {
  it("loads every undergraduate course", () => {
    expect(catalog.courses).toHaveLength(3407);
  });

  it.each(["csci c200", "CSCI-C 200", "CSCI C200", "csci-c200"])("finds %s", (raw) => {
    const r = lookupCode(catalog, raw);
    expect(r.status).toBe("found");
    expect(r.course?.code).toBe("CSCI-C 200");
  });

  it("resolves a code missing its letter when only one course matches", () => {
    expect(lookupCode(catalog, "INFO 101").course?.code).toBe("INFO-I 101");
  });

  it("reports codes that aren't in the catalog", () => {
    expect(lookupCode(catalog, "BUS-M 999").status).toBe("not_in_catalog");
    expect(lookupCode(catalog, "hello").status).toBe("not_a_code");
  });

  it("detects each code in notes once, with its status", () => {
    const d = detectCodes(catalog, "Take BUS-K 201. Also BUS-M 999. Again BUS-K 201.");
    expect(d.map((x) => [x.mentioned, x.status])).toEqual([["BUS-K 201", "found"], ["BUS-M 999", "not_in_catalog"]]);
  });

  it("filters search by department and caps results at 20", () => {
    const r = searchCourses(catalog, { query: "statistics", dept: "STAT" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.length).toBeLessThanOrEqual(20);
    for (const c of r) expect(c.code.startsWith("STAT-")).toBe(true);
  });

  it("normalizes pasted codes and suggests by title", () => {
    expect(parseCodes("info i101, CSCI-C 200")).toEqual(["INFO-I 101", "CSCI-C 200"]);
    expect(suggestCourses(catalog, "introduction to informatics").map((c) => c.code)).toContain("INFO-I 101");
  });
});
