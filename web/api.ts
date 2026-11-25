import type { z } from "zod";
import {
  ChatResponseSchema, ErrorResponseSchema, ProfileSchema, RoadmapResponseSchema,
  type ChatRequest, type ChatResponse, type Profile, type RoadmapRequest, type RoadmapResponse,
} from "../shared/schemas.ts";

async function call<T>(path: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error("Can't reach the CrimsonPath server. Check that `npm run dev` is running, then try again.");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = ErrorResponseSchema.safeParse(json);
    throw new Error(err.success ? err.data.error.message : `The server answered ${res.status}. Check the server log.`);
  }
  return schema.parse(json);
}

export const createRoadmap = (r: RoadmapRequest): Promise<RoadmapResponse> => call("/api/roadmap", r, RoadmapResponseSchema);
export const createChatReply = (r: ChatRequest): Promise<ChatResponse> => call("/api/chat", r, ChatResponseSchema);

const KEY = "crimsonpath_profile_v3";

export function getSavedProfile(): Profile | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const p = ProfileSchema.safeParse(JSON.parse(raw));
    return p.success ? p.data : null;
  } catch {
    return null; // corrupt JSON: start the quiz over (spec: "Saved profile is unreadable")
  }
}

export const saveProfile = (p: Profile): void => localStorage.setItem(KEY, JSON.stringify(p));
