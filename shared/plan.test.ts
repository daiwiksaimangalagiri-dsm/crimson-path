import { describe, expect, it } from "vitest";
import { catalog, detectCodes } from "./catalog.ts";
import { checkPlan } from "./plan.ts";
import { PlanSchema, type Plan } from "./schemas.ts";

const plan = (items: unknown[], extra: object = {}): Plan =>
  PlanSchema.parse({ profile_summary: "s", suggestions: [], semesters: [{ term: "Spring 2027", items }], ask_advisor: [], ...extra });
const cls = (code: string, origin = "suggested", type = "class") => ({ type, origin, code, name: "", deadline: "d", reason: "r" });

describe("checkPlan", () => {
  it("removes an invented course and tells the advisor list", () => {
    const out = checkPlan(catalog, plan([cls("ZZZZ-Z 123")]), [], "notes", []);
    expect(out.semesters).toEqual([]);
    expect(out.ask_advisor[0]?.why).toMatch(/Couldn't find this course/);
  });

  it("replaces title and credits with the catalog's", () => {
    const out = checkPlan(catalog, plan([{ ...cls("INFO-I 101"), name: "made up", credits: "9" }]), [], "notes", []);
    expect(out.semesters[0]?.items[0]).toMatchObject({ code: "INFO-I 101", name: "INTRODUCTION TO INFORMATICS", credits: "4" });
  });

  it("drops a taken class and explains why", () => {
    const out = checkPlan(catalog, plan([cls("INFO-I 101", "counselor")]), [], "notes", ["INFO-I 101"]);
    expect(out.semesters).toEqual([]);
    expect(out.ask_advisor[0]?.why).toMatch(/already taken/);
  });

  it("flags a fake counselor code the AI left out", () => {
    const detected = detectCodes(catalog, "Coach mentioned BUS-M 999");
    const out = checkPlan(catalog, plan([]), detected, "notes", []);
    expect(out.ask_advisor).toEqual([{ need: "BUS-M 999", why: expect.stringMatching(/isn't in the catalog/) }]);
  });

  it("moves non-class items to the advisor list", () => {
    const out = checkPlan(catalog, plan([{ ...cls("", "suggested", "club"), name: "UX club" }]), [], "notes", []);
    expect(out.semesters).toEqual([]);
    expect(out.ask_advisor[0]?.need).toBe("UX club");
  });

  it("labels a detected code as the counselor's pick, and everything as suggested in interests mode", () => {
    const detected = detectCodes(catalog, "take STAT-S 301");
    expect(checkPlan(catalog, plan([cls("STAT-S 301")]), detected, "notes", []).semesters[0]?.items[0]?.origin).toBe("counselor");
    expect(checkPlan(catalog, plan([cls("STAT-S 301", "counselor")]), [], "interests", []).semesters[0]?.items[0]?.origin).toBe("suggested");
  });

  it("fills defaults for a sloppy AI answer instead of throwing", () => {
    expect(PlanSchema.parse({ semesters: "nope" })).toEqual({ profile_summary: "", suggestions: [], semesters: [], ask_advisor: [] });
  });
});
