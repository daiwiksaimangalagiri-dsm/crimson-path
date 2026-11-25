import termRows from "../shared/data/terms.json" with { type: "json" };
import { z } from "zod";
import { TermSchema, type ChatRequest, type Detected, type Plan, type Profile } from "../shared/schemas.ts";

const terms = z.array(TermSchema).parse(termRows);

// Ported from .research/app/index.html. Rules first (stable), student data last.
const today = (now: Date): string => now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const calendar = (now: Date): string =>
  `Today is ${today(now)}. Upcoming terms: ${terms.map((t) => (t.dates ? `${t.term} (${t.dates})` : t.term)).join(", ")}.`;

const FILES = `Files available: ONLY "Classes" (IU course catalog: code, title, credits; most entries do not list which terms they are offered). There is NO file of clubs, workshops, events, or internships.`;

const SHAPE = `Return ONLY JSON, no prose, in this shape:
{"profile_summary":"...","suggestions":["..."],
 "semesters":[{"term":"Spring 2027","items":[{"type":"class","origin":"counselor|suggested","name":"exact title","code":"INFO-I 101","source":"Classes","deadline":"...","reason":"...","fit":"..."}]}],
 "ask_advisor":[{"need":"...","why":"..."}]}`;

const DEADLINE = `a deadline (a target date or "before <term> classes begin (<date>)" using only the dates above; otherwise "check One.IU for the registration date")`;

export function profileText(p: Profile): string {
  return `- Year: ${p.year}
- School: ${p.school}
- Major: ${p.major}${p.minor ? ` · Minor: ${p.minor}` : ""}
- Expected graduation: ${p.gradTerm}
- Summer plans: ${p.summer.join(", ")}
- Career interests: ${p.interests.join(", ")}
- Goal after graduation: ${p.goal}
- Preferred load: ${p.credits} credit hours per semester
- Learns best through: ${p.learn.join(", ")}
- Math/coding comfort: ${p.math}
- Weekly hours for outside commitments: ${p.time}
- Other notes: ${p.extra || "none"}`;
}

export const SUMMER_CLASSES = "Take summer classes";

// Which terms the roadmap may use: next term through graduation; summers only if the student wants summer classes.
export function planWindow(p: Profile): string {
  return `PLANNING WINDOW: plan semesters from the next term through ${p.gradTerm} (the student's expected graduation). ${
    p.summer.includes(SUMMER_CLASSES) ? "The student wants summer classes, so summer terms may hold classes." : "Do NOT put classes in summer terms; the student has other summer plans."
  }`;
}

export function takenText(p: Profile, titleOf: (code: string) => string | undefined): string {
  const t = p.taken.map((c) => `${c} ${titleOf(c) ?? ""}`.trim());
  if (!t.length && !p.takenOther.length) return "none listed";
  return t.join("; ") + (p.takenOther.length ? `${t.length ? "; " : ""}also (not in the Classes file): ${p.takenOther.join(", ")}` : "");
}

export function notesPrompt(now: Date, notes: string, p: Profile, taken: string, detected: Detected[]): string {
  return `You are CrimsonPath, a career roadmap assistant for Indiana University Bloomington students.

${FILES}

Rules:
1. List the counselor's main suggestions.
2. Build a semester-by-semester roadmap.
3. COUNSELOR PICKS: every class the counselor named (by code or title) goes in the roadmap with "origin":"counselor" if it is in the Classes file. If a code is "similar", pick the candidate that best matches the notes. If it is "not_in_catalog", do NOT put it in the roadmap; put it in ask_advisor and say the counselor mentioned it but it isn't in the file.
4. YOUR SUGGESTIONS: add classes the counselor did not name but that serve their advice AND fit this student's profile, with "origin":"suggested". Find them only with search_courses. Respect the student's math/coding comfort, learning style and goal. Keep CrimsonPath classes to at most 3 per term.
5. Use exact codes and titles from the tools, with source "Classes". Never invent courses, clubs, or dates.
6. Each step needs ${DEADLINE} and a one-line reason tied to the counselor's advice. For suggested classes, also add "fit": one short line on why it suits this student's profile.
7. Clubs, workshops, events and internships: no file has them, so put each one in "ask_advisor", not in the roadmap.
8. ALREADY TAKEN: never put a class the student already took in the roadmap. Use their past classes to choose the right next level. If the counselor named a class the student already took, put it in ask_advisor and say to ask the counselor whether they meant a different class.
9. "profile_summary": one sentence on how the plan was tailored to this student.

${SHAPE}

${calendar(now)}

STUDENT PROFILE (from their intake quiz):
${profileText(p)}

${planWindow(p)}

CLASSES THE STUDENT HAS ALREADY TAKEN (or is taking now):
${taken}

COURSE CODES DETECTED IN THE NOTES (already checked against the Classes file):
${detected.length ? JSON.stringify(detected) : "none detected; the counselor may still have named classes by title, so use search_courses to find them."}

COUNSELOR / CAREER COACH NOTES:
"""
${notes}
"""`;
}

export function interestsPrompt(now: Date, text: string, p: Profile, taken: string): string {
  return `You are CrimsonPath, a career roadmap assistant for Indiana University Bloomington students.

${FILES}

Rules:
1. "suggestions": list the 3-6 interest themes you heard, each as a short phrase (e.g. "Sports analytics").
2. Build a semester-by-semester roadmap of classes that explore those interests and fit the profile. Every class has "origin":"suggested".
3. Search broadly with search_courses: try several keywords per interest and look across departments, not just the student's major. If the student names a specific course code, check it with lookup_course.
4. Use exact codes and titles from the tools, with source "Classes" (some codes have several topic titles: copy the exact title). Never invent courses, clubs, or dates.
5. Respect math/coding comfort, learning style, goal, and preferred load: at most 3 CrimsonPath classes per term. Never include a class they already took; use past classes to pick the right next level.
6. Each class needs ${DEADLINE}, a one-line "reason" naming the interest it serves, and a "fit" line on why it suits this student.
7. If an interest has no matching class in the file (or is really a club, job or activity), put it in "ask_advisor".
8. "profile_summary": one sentence on how the plan connects their interests and profile.

${SHAPE}

${calendar(now)}

STUDENT PROFILE (from their intake quiz):
${profileText(p)}

${planWindow(p)}

CLASSES THE STUDENT HAS ALREADY TAKEN (or is taking now):
${taken}

THE STUDENT DESCRIBED THEIR INTERESTS (there are no counselor notes):
"""
${text}
"""`;
}

const slim = (plan: Plan) => ({
  ...plan,
  semesters: plan.semesters.map((t) => ({
    term: t.term,
    items: t.items.map(({ type, origin, name, code, credits, deadline, reason, fit }) => ({ type, origin, name, code, credits, deadline, reason, fit })),
  })),
});

export function chatPrompt(now: Date, r: ChatRequest, taken: string): string {
  return `You are CrimsonPath, a career roadmap assistant for IU Bloomington students. A student is asking about the roadmap you already built.

Rules:
- Recommend ONLY classes found with search_courses or lookup_course in the "Classes" file. Never invent courses, clubs, or dates.
- Never recommend a class the student already took.
- Keep the counselor's picks unless the student explicitly asks to drop one; if they do, say in "reply" that they should check with their counselor first.
- Clubs, workshops, events, internships aren't in any file: point the student to their advisor.
- At most 3 CrimsonPath classes per term. Each class keeps ${DEADLINE}, a one-line reason, and for suggested classes a "fit" line.
- If the message is only a question, answer it and return "plan": null. If it asks for a change, return the full updated plan.
- "reply": 1-3 friendly sentences, plain text, saying what you changed or answering the question.

Return ONLY JSON: {"reply":"...","plan": null or <the full plan, same shape as CURRENT PLAN>}

${calendar(now)}

STUDENT PROFILE:
${profileText(r.profile)}
${planWindow(r.profile)}
ALREADY TAKEN: ${taken}
${r.mode === "interests" ? "STUDENT'S OWN INTERESTS (no counselor notes)" : "COUNSELOR NOTES"}:
"""
${r.text}
"""
COUNSELOR-NAMED CODES (checked against the Classes file): ${JSON.stringify(r.detected)}
CURRENT PLAN: ${JSON.stringify(slim(r.plan))}
EARLIER CONVERSATION: ${JSON.stringify(r.history)}
STUDENT'S NEW MESSAGE:
"""
${r.message}
"""`;
}
