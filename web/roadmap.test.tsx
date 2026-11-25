// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlanSchema } from "../shared/schemas.ts";
import { nextDeadline, Planner } from "./Planner.tsx";

const profile = { year: "Junior", school: "Luddy School of Informatics, Computing, and Engineering", major: "Informatics", gradTerm: "Spring 2028", summer: ["Internship"], interests: ["UX & design"], goal: "A full-time job", credits: "14–15 (typical)", learn: ["Hands-on projects"], math: "I enjoy them", time: "5–10", taken: [], takenOther: [] };
const plan = PlanSchema.parse({ profile_summary: "Tailored.", suggestions: ["Take INFO-I 201"], ask_advisor: [], semesters: [
  { term: "Spring 2027", items: [{ type: "class", origin: "counselor", name: "X", code: "INFO-I 201", deadline: "Before Spring 2027 classes begin (Jan 11, 2027)", reason: "r", fit: "", credits: "4", offered: "" }] }] });
const json = (status: number, body: unknown) => Promise.resolve(new Response(JSON.stringify(body), { status }));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function build(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal("fetch", fetchMock);
  render(<Planner profile={profile} onRetake={vi.fn()} onEditTaken={vi.fn()} />);
  fireEvent.click(screen.getByRole("button", { name: "Try sample notes" }));
  fireEvent.click(screen.getByRole("button", { name: "Build my roadmap" }));
}

describe("roadmap", () => {
  it("doesn't send an empty build", () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    render(<Planner profile={profile} onRetake={vi.fn()} onEditTaken={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Build my roadmap" }));
    expect(f).not.toHaveBeenCalled();
  });

  it("shows the server's error message", async () => {
    await build(vi.fn(() => json(503, { error: { code: "no_api_key", message: "The roadmap builder isn't set up: the server has no Claude API key." } })));
    expect((await screen.findByRole("alert")).textContent).toMatch(/no Claude API key/);
    expect(screen.getByRole("button", { name: "Build my roadmap" })).toHaveProperty("disabled", false);
  });

  it("shows the empty-plan message", async () => {
    await build(vi.fn(() => json(200, { plan: { ...plan, semesters: [] }, detected: [] })));
    expect(await screen.findByText(/No matching classes were found/)).toBeTruthy();
  });

  it("sends one chat message at a time and recovers from errors", async () => {
    let chatCalls = 0;
    await build(vi.fn((url: string) => {
      if (url === "/api/roadmap") return json(200, { plan, detected: [] });
      chatCalls++;
      return json(429, { error: { code: "rate_limited", message: "Too many requests right now. Wait a minute and try again." } });
    }));
    const quick = await screen.findByRole("button", { name: "Why these classes?" });
    fireEvent.click(quick);
    fireEvent.click(quick);
    expect(await screen.findByText("Too many requests right now. Wait a minute and try again.")).toBeTruthy();
    expect(chatCalls).toBe(1);
    expect(screen.queryByText("Why these classes?", { selector: "li" })).toBeNull();
  });

  it("counts days to the next dated deadline", () => {
    expect(nextDeadline(plan, new Date("2026-11-25T00:00:00"))?.days).toBe(47);
  });
});
