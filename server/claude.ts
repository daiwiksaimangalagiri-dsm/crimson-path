import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { GENED_AREAS, listDepartments, lookupCode, searchCourses, type Catalog } from "../shared/catalog.ts";
import type { ErrorCode } from "../shared/schemas.ts";

export class AppError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

// Sends one prompt with the catalog tools and returns the final text.
export type AskClaude = (prompt: string) => Promise<string>;

export function createAskClaude(cat: Catalog, apiKey: string): AskClaude {
  const client = new Anthropic({ apiKey });
  const tools = [
    betaZodTool({
      name: "lookup_course",
      description: "Look up one course code in the 'Classes' file. Accepts loose formats like 'INFO-I 101', 'CSCI C200', 'C200'. Returns status found / similar (with candidates) / not_in_catalog.",
      inputSchema: z.object({ code: z.string() }),
      run: async ({ code }) => JSON.stringify(lookupCode(cat, code)),
    }),
    betaZodTool({
      name: "search_courses",
      description: "Search the 'Classes' file (IU Bloomington undergraduate catalog). Returns up to 20 real courses matching words in the code or title, each with its credits and GenEd areas. Use short keyword queries like 'programming', 'statistics', 'design'. Optionally filter by department code.",
      inputSchema: z.object({
        query: z.string(),
        dept: z.string().optional().describe("Department code, e.g. INFO, CSCI, STAT"),
        max_level: z.number().optional().describe("Highest course level, default 499"),
        gened: z.enum(GENED_AREAS).optional().describe("Only courses approved for this IU Bloomington GenEd area"),
      }),
      run: async ({ query, dept, max_level, gened }) => JSON.stringify(searchCourses(cat, { query, dept: dept ?? "", maxLevel: max_level ?? 499, gened: gened ?? "" })),
    }),
    betaZodTool({
      name: "list_departments",
      description: "List every department code in the Classes file with its course count.",
      inputSchema: z.object({}),
      run: async () => listDepartments(cat),
    }),
  ];

  return async (prompt) => {
    try {
      const msg = await client.beta.messages.toolRunner({
        model: "claude-opus-5-5",
        max_tokens: 16000,
        max_iterations: 25,
        tools,
        messages: [{ role: "user", content: prompt }],
      });
      if (msg.stop_reason === "refusal") throw new AppError("ai_unreadable", "Claude declined this request. Rephrase the notes and try again.");
      return msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (err instanceof Anthropic.RateLimitError) throw new AppError("rate_limited", "Too many requests right now. Wait a minute and try again.");
      if (err instanceof Anthropic.AuthenticationError) throw new AppError("bad_api_key", "Claude rejected the API key. Check ANTHROPIC_API_KEY in .env and restart the server.");
      if (err instanceof Anthropic.APIError) throw new AppError("ai_unavailable", `Claude is unavailable right now (${err.status ?? "network"}). Try again in a minute.`);
      throw err;
    }
  };
}

// Pulls the JSON object out of the model's text.
export function extractJson(text: string): unknown {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s < 0 || e < s) throw new AppError("ai_unreadable", "CrimsonPath couldn't read the AI's answer. Try building again.");
  try {
    return JSON.parse(text.slice(s, e + 1));
  } catch {
    throw new AppError("ai_unreadable", "CrimsonPath couldn't read the AI's answer. Try building again.");
  }
}
