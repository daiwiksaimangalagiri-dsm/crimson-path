import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { catalog } from "../shared/catalog.ts";
import type { AskClaude } from "./claude.ts";
import { createHandler } from "./main.ts";

const profile = {
  year: "Sophomore", major: "Informatics", interests: ["UX & design"], goal: "A full-time job", credits: "14–15 (typical)",
  learn: ["Hands-on projects"], math: "Fine in small doses", time: "5–10", taken: ["INFO-I 101"], takenOther: [],
};
const notes = "Take INFO-I 201 next semester. Coach also mentioned BUS-M 999. Join a UX club.";

let server: Server | undefined;
afterEach(() => server?.close());

async function start(ask: AskClaude | null): Promise<string> {
  server = createServer(createHandler(catalog, ask, () => new Date("2026-11-25T12:00:00Z")));
  await new Promise<void>((ok) => server?.listen(0, ok));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("server has no port");
  return `http://localhost:${addr.port}`;
}
const post = (base: string, path: string, body: unknown) =>
  fetch(base + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("server", () => {
  it("rejects a bad body with invalid_request", async () => {
    const res = await post(await start(null), "/api/roadmap", { mode: "notes", text: "", profile });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_request");
  });

  it("explains a missing API key", async () => {
    const res = await post(await start(null), "/api/roadmap", { mode: "notes", text: notes, profile });
    expect(res.status).toBe(503);
    expect((await res.json()).error.message).toMatch(/Add ANTHROPIC_API_KEY to .env/);
  });

  it("builds a checked roadmap with a stubbed Claude", async () => {
    let prompt = "";
    const ask: AskClaude = async (p) => {
      prompt = p;
      return 'Here you go: {"profile_summary":"x","suggestions":["Take INFO-I 201"],"semesters":[{"term":"Spring 2027","items":[' +
        '{"type":"class","origin":"suggested","code":"INFO-I 201","name":"","deadline":"d","reason":"r"},' +
        '{"type":"class","code":"INFO-I 101","name":"","deadline":"d","reason":"r"}]}],"ask_advisor":[]}';
    };
    const res = await post(await start(ask), "/api/roadmap", { mode: "notes", text: notes, profile });
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(prompt).toContain("Today is November 25, 2026");
    expect(prompt).toContain("Classes begin Jan 11, 2027");
    expect(body.plan.semesters[0].items).toEqual([expect.objectContaining({ code: "INFO-I 201", origin: "counselor" })]);
    const needs = body.plan.ask_advisor.map((a: { need: string }) => a.need).join(" | ");
    expect(needs).toContain("BUS-M 999");
    expect(needs).toContain("INFO-I 101");
  });

  it("returns ai_unreadable when the answer has no JSON", async () => {
    const res = await post(await start(async () => "sorry"), "/api/roadmap", { mode: "interests", text: "sports", profile });
    expect(res.status).toBe(502);
    expect((await res.json()).error.code).toBe("ai_unreadable");
  });

  it("answers a chat question without a plan", async () => {
    const plan = { profile_summary: "", suggestions: [], semesters: [], ask_advisor: [] };
    const res = await post(await start(async () => '{"reply":"Because you asked.","plan":null}'), "/api/chat",
      { message: "Why?", profile, mode: "notes", text: notes, detected: [], plan, history: [] });
    expect(await res.json()).toEqual({ reply: "Because you asked.", plan: null });
  });
});
