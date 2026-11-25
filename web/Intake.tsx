import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { catalog, firstNum, norm, parseCodes, suggestCourses } from "../shared/catalog.ts";
import { ProfileSchema, type Profile } from "../shared/schemas.ts";

import { gradTerms, NOT_SURE, programs, schools, suggestPrograms } from "../shared/programs.ts";

type SingleId = "year" | "school" | "gradTerm" | "goal" | "credits" | "math" | "time";
type MultiId = "interests" | "learn" | "summer";
type Question = { short: string; title: string; hint?: string } & (
  | { kind: "single"; id: SingleId; options: string[] }
  | { kind: "multi"; id: MultiId; options: string[]; max: number }
  | { kind: "programs"; id: "major" }
  | { kind: "long"; id: "extra" }
);

// Small glyphs to make long option lists scannable.
const ICONS: Record<string, string> = {
  "Tech & software": "💻", "UX & design": "✏️", "Data & analytics": "📊", "Business & finance": "💼", "Marketing & media": "📣",
  "Health & science": "🧬", "Education & social impact": "🌱", "Law & policy": "⚖️", "Arts & performance": "🎭", "Not sure yet": "🧭",
  "A full-time job": "💼", "Grad or professional school": "🎓", "Starting my own thing": "🚀",
  "Take summer classes": "📚", "Internship or job": "🏢", "Study abroad": "✈️", "Taking a break": "🌤️",
  "Hands-on projects": "🛠️", "Lectures & reading": "📖", "Discussion & writing": "💬", "Labs & research": "🔬",
};

export const QUIZ: Question[] = [
  { id: "year", kind: "single", short: "Year", title: "What year are you?", options: ["Freshman", "Sophomore", "Junior", "Senior"] },
  { id: "school", kind: "single", short: "School", title: "Which IU school is your major in?", hint: "This narrows the list of majors on the next question.", options: [...schools, NOT_SURE] },
  { id: "major", kind: "programs", short: "Major", title: "What's your major?", hint: "Start typing to search IU Bloomington's majors. Add a minor too if you have one." },
  { id: "gradTerm", kind: "single", short: "Graduation", title: "When do you expect to graduate?", hint: "CrimsonPath plans up to this term.", options: gradTerms(new Date()) },
  { id: "interests", kind: "multi", max: 3, short: "Interests", title: "Which career areas interest you?", hint: "Pick up to 3.",
    options: ["Tech & software", "UX & design", "Data & analytics", "Business & finance", "Marketing & media", "Health & science", "Education & social impact", "Law & policy", "Arts & performance", "Not sure yet"] },
  { id: "goal", kind: "single", short: "Goal", title: "After graduation, what are you aiming for?", options: ["A full-time job", "Grad or professional school", "Starting my own thing", "Not sure yet"] },
  { id: "credits", kind: "single", short: "Load", title: "How many credit hours per semester feels right?", options: ["12–13 (lighter)", "14–15 (typical)", "16–17 (heavier)", "18+ (max)"] },
  { id: "summer", kind: "multi", max: 2, short: "Summers", title: "What do you want to do in the summers?", hint: "Pick up to 2. Summer terms only get classes if you pick summer classes.",
    options: ["Take summer classes", "Internship or job", "Study abroad", "Taking a break"] },
  { id: "learn", kind: "multi", max: 2, short: "Learning", title: "How do you learn best?", hint: "Pick up to 2.", options: ["Hands-on projects", "Lectures & reading", "Discussion & writing", "Labs & research"] },
  { id: "math", kind: "single", short: "Math", title: "How do you feel about math and coding?", options: ["I'd rather avoid them", "Fine in small doses", "I enjoy them"] },
  { id: "time", kind: "single", short: "Time", title: "Hours per week for clubs, a job, or other commitments?", options: ["Under 5", "5–10", "10–20", "20+"] },
  { id: "extra", kind: "long", short: "Anything else", title: "Anything else CrimsonPath should know?", hint: "Optional. For example: you work part-time, plan to study abroad, have AP credit, or want to graduate early." },
];

type Draft = Record<SingleId | "major" | "minor" | "extra", string> & Record<MultiId, string[]>;
const toDraft = (p: Profile | null): Draft => ({
  year: p?.year ?? "", school: p?.school ?? "", gradTerm: p?.gradTerm ?? "", goal: p?.goal ?? "", credits: p?.credits ?? "",
  math: p?.math ?? "", time: p?.time ?? "", major: p?.major ?? "", minor: p?.minor ?? "", extra: p?.extra ?? "",
  interests: p?.interests ?? [], learn: p?.learn ?? [], summer: p?.summer ?? [],
});

function answerOf(q: Question, d: Draft): string {
  if (q.kind === "single") return d[q.id];
  if (q.kind === "multi") return d[q.id].join(", ");
  if (q.kind === "programs") return d.major + (d.minor ? ` + ${d.minor}` : "");
  return d.extra ? "Added" : "";
}

function ProgramPicker({ id, label, value, list, school, onChange, onEnter, autoFocus }: {
  id: string; label: string; value: string; list: { name: string; school: string }[]; school: string;
  onChange: (v: string) => void; onEnter: () => void; autoFocus?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const hits = open ? suggestPrograms(list, value, school) : [];
  const pick = (name: string) => { onChange(name); setOpen(false); };
  const keys = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive(Math.min(active + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
    else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Enter") {
      e.preventDefault();
      const h = hits[active];
      if (h && open && h.name !== value) pick(h.name); else onEnter();
    }
  };
  return (
    <div className="combo">
      <label htmlFor={id} className="label">{label}</label>
      <input id={id} role="combobox" aria-expanded={hits.length > 0} aria-controls={`${id}-list`} aria-autocomplete="list"
        aria-activedescendant={hits[active] ? `${id}-opt-${active}` : undefined} autoComplete="off" autoFocus={autoFocus}
        value={value} placeholder="Start typing" onKeyDown={keys} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(0); }} />
      {hits.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="listbox">
          {hits.map((h, n) => (
            <li key={h.name} id={`${id}-opt-${n}`} role="option" aria-selected={n === active} onMouseDown={(e) => { e.preventDefault(); pick(h.name); }}>
              {h.name} <span className="muted">{h.school.replace(/^(The )?/, "")}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function Quiz({ initial, onDone }: { initial: Profile | null; onDone: (p: Profile) => void }) {
  const [i, setI] = useState(0);
  const [d, setD] = useState<Draft>(() => toDraft(initial));
  const [err, setErr] = useState("");
  const q = QUIZ[i];
  if (!q) throw new Error(`No quiz question ${i}`);

  const missing = (draft: Draft): string => {
    if (q.kind === "single" && !draft[q.id]) return "Pick one to continue.";
    if (q.kind === "multi" && !draft[q.id].length) return "Pick at least one.";
    if (q.kind === "programs" && !draft.major.trim()) return "Enter your major.";
    return "";
  };
  const next = (draft = d) => {
    const m = missing(draft);
    if (m) return setErr(m);
    setErr("");
    if (i < QUIZ.length - 1) return setI(i + 1);
    onDone(ProfileSchema.parse({
      ...draft, major: draft.major.trim(), minor: draft.minor.trim() || undefined, extra: draft.extra.trim() || undefined,
      taken: initial?.taken ?? [], takenOther: initial?.takenOther ?? [],
    }));
  };
  const firstOpen = QUIZ.findIndex((x) => !answerOf(x, d) && x.kind !== "long");

  return (
    <main className="quiz">
      <nav className="qlist" aria-label="Questions">
        <ol>
          {QUIZ.map((x, n) => {
            const a = answerOf(x, d);
            const canJump = n <= (firstOpen < 0 ? QUIZ.length : firstOpen);
            return (
              <li key={x.id} aria-current={n === i ? "step" : undefined} className={a ? "done" : ""}>
                <button type="button" disabled={!canJump} onClick={() => { setErr(""); setI(n); }}>
                  <span className="qshort">{x.short}</span>
                  {a && <span className="qans">{a}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="intake">
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={QUIZ.length} aria-valuenow={i} aria-label="Quiz progress">
          <i style={{ width: `${(i / QUIZ.length) * 100}%` }} />
        </div>
        <div className="qbody" key={i}>
          <p className="eyebrow">Question {i + 1} of {QUIZ.length}</p>
          <h1>{q.title}</h1>
          {q.hint && <p className="hint">{q.hint}</p>}

          {(q.kind === "single" || q.kind === "multi") && (
            <div className={`options${q.options.length > 4 ? " two" : ""}`} role="group" aria-label={q.title}>
              {q.options.map((o) => {
                const on = q.kind === "multi" ? d[q.id].includes(o) : d[q.id] === o;
                return (
                  <button key={o} type="button" className={`option ${q.kind}`} aria-pressed={on} onClick={() => {
                    if (q.kind === "single") {
                      const nd = { ...d, [q.id]: o };
                      if (q.id === "school" && o !== d.school) nd.major = "";
                      setD(nd);
                      next(nd);
                      return;
                    }
                    const cur = d[q.id];
                    if (!on && cur.length >= q.max) return setErr(`Pick up to ${q.max}.`);
                    setErr("");
                    setD({ ...d, [q.id]: on ? cur.filter((x) => x !== o) : [...cur, o] });
                  }}>
                    <span className="box" aria-hidden="true" />
                    {ICONS[o] && <span className="icon" aria-hidden="true">{ICONS[o]}</span>}
                    {o}
                  </button>
                );
              })}
            </div>
          )}
          {q.kind === "programs" && (
            <div className="fields">
              <ProgramPicker id="major" label="Major" value={d.major} list={programs.majors} school={d.school} autoFocus
                onChange={(v) => setD({ ...d, major: v })} onEnter={() => next()} />
              <ProgramPicker id="minor" label="Minor (optional)" value={d.minor} list={programs.minors} school=""
                onChange={(v) => setD({ ...d, minor: v })} onEnter={() => next()} />
              <p className="muted small">Not listed? Type it and continue. Lists from IU's program pages, collected {programs.collectedAt}.</p>
            </div>
          )}
          {q.kind === "long" && (
            <textarea aria-label={q.title} rows={4} placeholder="Optional" value={d.extra} onChange={(e) => setD({ ...d, extra: e.target.value })} />
          )}
        </div>

        <p className="error" role="alert">{err}</p>
        <div className="nav">
          {i > 0 ? <button type="button" className="ghost" onClick={() => { setErr(""); setI(i - 1); }}>Back</button> : <span />}
          <button type="button" className="primary" onClick={() => next()}>{i === QUIZ.length - 1 ? "Continue" : "Next"}</button>
        </div>
      </div>
    </main>
  );
}

export function Taken({ profile, onBack, onDone }: { profile: Profile; onBack: () => void; onDone: (p: Profile) => void }) {
  const [taken, setTaken] = useState(profile.taken);
  const [other, setOther] = useState(profile.takenOther);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState("");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  const hits = suggestCourses(catalog, q);
  const add = (code: string) => { if (!taken.includes(code)) setTaken([...taken, code]); setQ(""); input.current?.focus(); };
  const credits = taken.reduce((a, c) => a + firstNum(catalog.byCode.get(norm(c))?.[0]?.credits ?? ""), 0);

  const keys = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive(Math.min(active + 1, hits.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(Math.max(active - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); const h = hits[active]; if (h) add(h.code); }
    else if (e.key === "Escape") setQ("");
  };
  const addPasted = () => {
    const codes = parseCodes(paste);
    if (!codes.length) return setNote("No course codes found. Use the format DEPT-L 123, like INFO-I 101.");
    const known = codes.filter((c) => catalog.byCode.has(c));
    const unknown = codes.filter((c) => !catalog.byCode.has(c) && !other.includes(c));
    setTaken([...new Set([...taken, ...known])]);
    setOther([...new Set([...other, ...unknown])]);
    setNote(unknown.length ? `Not in the catalog, kept as a note for the AI: ${unknown.join(", ")}` : "");
    setPaste("");
  };

  return (
    <main className="intake">
      <p className="eyebrow">Step 2 of 3</p>
      <h1>Which classes have you already taken?</h1>
      <p className="hint">Include classes you're taking now, plus AP or transfer credit. CrimsonPath won't recommend these again, and uses them to pick your next-level classes.</p>

      <label htmlFor="tsearch" className="label">Search by code or title</label>
      <div className="combo">
        <input id="tsearch" ref={input} role="combobox" aria-expanded={hits.length > 0} aria-controls="tlist" aria-autocomplete="list"
          aria-activedescendant={hits[active] ? `opt-${active}` : undefined} autoComplete="off"
          placeholder='e.g. INFO-I 101 or "intro to informatics"' value={q} onKeyDown={keys}
          onChange={(e) => { setQ(e.target.value); setActive(0); }} />
        {hits.length > 0 && (
          <ul id="tlist" role="listbox" className="listbox">
            {hits.map((c, n) => {
              const done = taken.includes(c.code);
              return (
                <li key={c.code + c.title} id={`opt-${n}`} role="option" aria-selected={n === active} aria-disabled={done}
                  onMouseDown={(e) => { e.preventDefault(); if (!done) add(c.code); }}>
                  <b>{c.code}</b> <span className="title">{c.title.toLowerCase()}</span>{done && <span className="muted"> (added)</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <details className="paste">
        <summary>Or paste a list of course codes</summary>
        <textarea aria-label="Paste course codes" rows={3} value={paste} placeholder="e.g. INFO-I 101, CSCI-C 200, ENG-W 131" onChange={(e) => setPaste(e.target.value)} />
        <button type="button" className="ghost" onClick={addPasted}>Add from list</button>
      </details>
      {note && <p className="warn" role="status">{note}</p>}

      <p className="count">{taken.length || other.length ? `${taken.length} ${taken.length === 1 ? "class" : "classes"} added${credits ? `, about ${credits} credits` : ""}` : "No classes added yet."}</p>
      <ul className="chips">
        {taken.map((c) => (
          <li key={c} className="chip"><b>{c}</b> {catalog.byCode.get(norm(c))?.[0]?.title.toLowerCase()}
            <span className="muted"> {catalog.byCode.get(norm(c))?.[0]?.credits} cr</span>
            <button type="button" aria-label={`Remove ${c}`} onClick={() => setTaken(taken.filter((x) => x !== c))}>×</button></li>
        ))}
        {other.map((c) => (
          <li key={c} className="chip other"><b>{c}</b> not in the catalog
            <button type="button" aria-label={`Remove ${c}`} onClick={() => setOther(other.filter((x) => x !== c))}>×</button></li>
        ))}
      </ul>

      <div className="nav">
        <button type="button" className="ghost" onClick={onBack}>Back</button>
        <span className="nav-right">
          <button type="button" className="link" onClick={() => onDone({ ...profile, taken: [], takenOther: [] })}>I haven't taken any yet</button>
          <button type="button" className="primary" onClick={() => onDone({ ...profile, taken, takenOther: other })}>Continue</button>
        </span>
      </div>
    </main>
  );
}
