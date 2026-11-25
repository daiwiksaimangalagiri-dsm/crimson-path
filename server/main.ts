import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { catalog, detectCodes, type Catalog } from "../shared/catalog.ts";
import { checkPlan } from "../shared/plan.ts";
import { ChatRequestSchema, PlanSchema, RoadmapRequestSchema, type ErrorCode } from "../shared/schemas.ts";
import { AppError, createAskClaude, extractJson, type AskClaude } from "./claude.ts";
import { chatPrompt, interestsPrompt, notesPrompt, takenText } from "./prompts.ts";

const MAX_BODY = 64 * 1024;
const STATUS: Record<ErrorCode, number> = {
  invalid_request: 400, no_api_key: 503, bad_api_key: 503, rate_limited: 429, ai_unreadable: 502, ai_unavailable: 503,
};

async function readJson(req: IncomingMessage): Promise<unknown> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
    size += buf.length;
    if (size > MAX_BODY) throw new AppError("invalid_request", "Request is too large. Shorten the notes and try again.");
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError("invalid_request", "Request body isn't valid JSON.");
  }
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const r = schema.safeParse(body);
  if (!r.success) {
    const issue = r.error.issues[0];
    throw new AppError("invalid_request", `Invalid request: ${issue?.path.join(".") || "body"} ${issue?.message ?? ""}`.trim());
  }
  return r.data;
}

// ask is null when no API key is set; the server still starts so the quiz works.
export function createHandler(cat: Catalog, ask: AskClaude | null, now: () => Date = () => new Date()) {
  const titleOf = (code: string) => cat.byCode.get(code)?.[0]?.title;
  const needAsk = (): AskClaude => {
    if (!ask) throw new AppError("no_api_key", "The roadmap builder isn't set up: the server has no Claude API key. Add ANTHROPIC_API_KEY to .env and restart the server.");
    return ask;
  };

  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const requestId = randomUUID();
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json", "x-request-id": requestId });
      res.end(JSON.stringify(body));
    };
    try {
      if (req.method === "GET" && req.url === "/api/sources") return send(200, { courses: cat.courses.length });

      if (req.method === "POST" && req.url === "/api/roadmap") {
        const r = parse(RoadmapRequestSchema, await readJson(req));
        const detected = r.mode === "notes" ? detectCodes(cat, r.text) : [];
        const taken = takenText(r.profile, titleOf);
        const prompt = r.mode === "notes" ? notesPrompt(now(), r.text, r.profile, taken, detected) : interestsPrompt(now(), r.text, r.profile, taken);
        const plan = PlanSchema.parse(extractJson(await needAsk()(prompt)));
        return send(200, { plan: checkPlan(cat, plan, detected, r.mode, r.profile.taken), detected });
      }

      if (req.method === "POST" && req.url === "/api/chat") {
        const r = parse(ChatRequestSchema, await readJson(req));
        const out = z.object({ reply: z.string().catch("Done."), plan: z.unknown() })
          .parse(extractJson(await needAsk()(chatPrompt(now(), r, takenText(r.profile, titleOf)))));
        const plan = out.plan && typeof out.plan === "object" ? checkPlan(cat, PlanSchema.parse(out.plan), r.detected, r.mode, r.profile.taken) : null;
        return send(200, { reply: out.reply, plan });
      }

      send(404, { error: { code: "invalid_request", message: `No route for ${req.method} ${req.url}` } });
    } catch (err) {
      if (err instanceof AppError) {
        // Structured log with fixed fields only; student text is never logged.
        console.warn(JSON.stringify({ level: "warn", requestId, route: req.url, code: err.code }));
        return send(STATUS[err.code], { error: { code: err.code, message: err.message } });
      }
      console.error(JSON.stringify({ level: "error", requestId, route: req.url, error: err instanceof Error ? err.stack : String(err) }));
      send(500, { error: { code: "ai_unavailable", message: `Unexpected server error (request ${requestId}). Check the server log.` } });
    }
  };
}

if (import.meta.main) {
  const key = process.env.ANTHROPIC_API_KEY;
  const port = Number(process.env.PORT ?? 8787);
  if (!key) console.warn(JSON.stringify({ level: "warn", msg: "ANTHROPIC_API_KEY is not set; roadmap building is disabled" }));
  createServer(createHandler(catalog, key ? createAskClaude(catalog, key) : null)).listen(port, () =>
    console.log(JSON.stringify({ level: "info", msg: "server listening", port })),
  );
}
