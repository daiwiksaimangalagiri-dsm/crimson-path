import { z } from "zod";

// Single source of truth for data shapes shared by web/ and server/.

export const CourseRowSchema = z.tuple([z.string(), z.string(), z.string(), z.string(), z.string(), z.string()]);

export type Course = {
  code: string;
  title: string;
  credits: string;
  offered: string;
  attributes: string;
  description: string;
  dept: string;
};

export const ProfileSchema = z.object({
  year: z.string().min(1),
  major: z.string().min(1).max(200),
  minor: z.string().max(200).optional(),
  interests: z.array(z.string().max(100)).max(3),
  goal: z.string().min(1),
  credits: z.string().min(1),
  learn: z.array(z.string().max(100)).max(2),
  math: z.string().min(1),
  time: z.string().min(1),
  extra: z.string().max(2000).optional(),
  taken: z.array(z.string().max(20)).max(200).default([]),
  takenOther: z.array(z.string().max(20)).max(200).default([]),
  takenDone: z.boolean().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

const CourseBriefSchema = z.object({ code: z.string(), title: z.string(), credits: z.string(), offered: z.string() });
export type CourseBrief = z.infer<typeof CourseBriefSchema>;

export const DetectedSchema = z.object({
  mentioned: z.string(),
  status: z.enum(["found", "similar", "not_in_catalog", "not_a_code"]),
  course: CourseBriefSchema.optional(),
  candidates: z.array(CourseBriefSchema).optional(),
});
export type Detected = z.infer<typeof DetectedSchema>;
export type Lookup = Omit<Detected, "mentioned">;

const str = z.string().catch("");

// The AI's answer is untrusted: missing fields become defaults, then plan.ts checks every class.
export const PlanItemSchema = z.object({
  type: z.string().catch("class"),
  origin: z.enum(["counselor", "suggested"]).catch("suggested"),
  name: str,
  code: str,
  deadline: str,
  reason: str,
  fit: str,
  credits: str,
  offered: str,
});
export type PlanItem = z.infer<typeof PlanItemSchema>;

export const AdvisorItemSchema = z.object({ need: z.string(), why: z.string() });
export type AdvisorItem = z.infer<typeof AdvisorItemSchema>;

export const PlanSchema = z.object({
  profile_summary: str,
  suggestions: z.array(z.string()).catch([]),
  semesters: z.array(z.object({ term: str, items: z.array(PlanItemSchema).catch([]) })).catch([]),
  ask_advisor: z.array(AdvisorItemSchema).catch([]),
});
export type Plan = z.infer<typeof PlanSchema>;

export const ModeSchema = z.enum(["notes", "interests"]);
export type Mode = z.infer<typeof ModeSchema>;

export const RoadmapRequestSchema = z.object({
  mode: ModeSchema,
  text: z.string().trim().min(1).max(8000),
  profile: ProfileSchema,
});
export type RoadmapRequest = z.infer<typeof RoadmapRequestSchema>;

export const ChatMessageSchema = z.object({ role: z.enum(["user", "ai"]), text: z.string().max(8000) });
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatRequestSchema = z.object({
  message: z.string().trim().min(1).max(8000),
  profile: ProfileSchema,
  mode: ModeSchema,
  text: z.string().max(8000),
  detected: z.array(DetectedSchema).max(50),
  plan: PlanSchema,
  history: z.array(ChatMessageSchema).max(8),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const RoadmapResponseSchema = z.object({ plan: PlanSchema, detected: z.array(DetectedSchema) });
export type RoadmapResponse = z.infer<typeof RoadmapResponseSchema>;

export const ChatResponseSchema = z.object({ reply: z.string(), plan: PlanSchema.nullable() });
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

export const ErrorCodeSchema = z.enum(["invalid_request", "no_api_key", "rate_limited", "ai_unreadable", "ai_unavailable"]);
export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export const ErrorResponseSchema = z.object({ error: z.object({ code: ErrorCodeSchema, message: z.string() }) });

export const SourcesSchema = z.object({ courses: z.number() });
