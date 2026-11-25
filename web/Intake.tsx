import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { catalog, firstNum, norm, parseCodes, suggestCourses } from "../shared/catalog.ts";
import { ProfileSchema, type Profile } from "../shared/schemas.ts";

type Choice = { id: "year" | "goal" | "credits" | "math" | "time"; kind: "single"; title: string; options: string[]; hint?: string };
type Multi = { id: "interests" | "learn"; kind: "multi"; title: string; options: string[]; max: number; hint: string };
type Text = { id: "major"; kind: "text"; title: string; hint: string };
type Long = { id: "extra"; kind: "long"; title: string; hint: string };
type Question = Choice | Multi | Text | Long;

export const QUIZ: Question[] = [
  { id: "year", kind: "single", title: "What year are you?", options: ["Freshman", "Sophomore", "Junior", "Senior"] },
  { id: "major", kind: "text", title: "What's your major?", hint: "Add a minor too if you have one." },
  { id: "interests", kind: "multi", max: 3, title: "Which career areas interest you?", hint: "Pick up to 3.",
    options: ["Tech & software", "UX & design", "Data & analytics", "Business & finance", "Marketing & media", "Health & science", "Education & social impact", "Law & policy", "Arts & performance", "Not sure yet"] },
  { id: "goal", kind: "single", title: "After graduation, what are you aiming for?", options: ["A full-time job", "Grad or professional school", "Starting my own thing", "Not sure yet"] },
  { id: "credits", kind: "single", title: "How many credit hours per semester feels right?", options: ["12–13 (lighter)", "14–15 (typical)", "16–17 (heavier)", "18+ (max)"] },
  { id: "learn", kind: "multi", max: 2, title: "How do you learn best?", hint: "Pick up to 2.", options: ["Hands-on projects", "Lectures & reading", "Discussion & writing", "Labs & research"] },
  { id: "math", kind: "single", title: "How do you feel about math and coding?", options: ["I'd rather avoid them", "Fine in small doses", "I enjoy them"] },
  { id: "time", kind: "single", title: "Hours per week for clubs, a job, or other commitments?", options: ["Under 5", "5–10", "10–20", "20+"] },
  { id: "extra", kind: "long", title: "Anything else CrimsonPath should know?", hint: "Optional. For example: you work part-time, plan to study abroad, have AP credit, or want to graduate early." },
];

type Draft = { [K in "year" | "goal" | "credits" | "math" | "time" | "major" | "minor" | "extra"]: string } & { interests: string[]; learn: string[] };
const toDraft = (p: Profile | null): Draft => ({
  year: p?.year ?? "", goal: p?.goal ?? "", credits: p?.credits ?? "", math: p?.math ?? "", time: p?.time ?? "",
  major: p?.major ?? "", minor: p?.minor ?? "", extra: p?.extra ?? "", interests: p?.interests ?? [], learn: p?.learn ?? [],
});

export function Quiz({ initial, onDone }: { initial: Profile | null; onDone: (p: Profile) => void }) {
  const [i, setI] = useState(0);
  const [d, setD] = useState<Draft>(() => toDraft(initial));
  const [err, setErr] = useState("");
  const q = QUIZ[i];
  if (!q) throw new Error(`No quiz question ${i}`);

  const missing = (): string => {
    if (q.kind === "single" && !d[q.id]) return "Pick one to continue.";
    if (q.kind === "multi" && !d[q.id].length) return "Pick at least one.";
    if (q.kind === "text" && !d.major.trim()) return "Enter your major.";
    return "";
  };
  const next = (draft = d) => {
    const m = q.kind === "single" && draft[q.id] ? "" : missing();
    if (m) return setErr(m);
    setErr("");
    if (i < QUIZ.length - 1) return setI(i + 1);
    onDone(ProfileSchema.parse({
      ...draft, major: draft.major.trim(), minor: draft.minor.trim() || undefined, extra: draft.extra.trim() || undefined,
      taken: initial?.taken ?? [], takenOther: initial?.takenOther ?? [],
    }));
  };
  const enter = (e: KeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); next(); } };

  return (
    <main className="intake">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={QUIZ.length} aria-valuenow={i} aria-label="Quiz progress">
        <i style={{ width: `${(i / QUIZ.length) * 100}%` }} />
      </div>
      <p className="eyebrow">Question {i + 1} of {QUIZ.length}</p>
      <h1>{q.title}</h1>
      {q.hint && <p className="hint">{q.hint}</p>}

      {(q.kind === "single" || q.kind === "multi") && (
        <div className={`options${q.options.length > 4 ? " two" : ""}`} role="group" aria-label={q.title}>
          {q.options.map((o) => {
            const on = q.kind === "multi" ? d[q.id].includes(o) : d[q.id] === o;
            return (
              <button key={o} type="button" className={`option ${q.kind}`} aria-pressed={on} onClick={() => {
                if (q.kind === "single") { const nd = { ...d, [q.id]: o }; setD(nd); next(nd); return; }
                const cur = d[q.id];
                if (!on && cur.length >= q.max) return setErr(`Pick up to ${q.max}.`);
                setErr("");
                setD({ ...d, [q.id]: on ? cur.filter((x) => x !== o) : [...cur, o] });
              }}>
                <span className="box" aria-hidden="true" />{o}
              </button>
            );
          })}
        </div>
      )}
      {q.kind === "text" && (
        <div className="fields">
          <label>Major<input autoFocus value={d.major} placeholder="e.g. Informatics" onChange={(e) => setD({ ...d, major: e.target.value })} onKeyDown={enter} /></label>
          <label>Minor (optional)<input value={d.minor} placeholder="e.g. Business" onChange={(e) => setD({ ...d, minor: e.target.value })} onKeyDown={enter} /></label>
        </div>
      )}
      {q.kind === "long" && (
        <textarea aria-label={q.title} rows={4} placeholder="Optional" value={d.extra} onChange={(e) => setD({ ...d, extra: e.target.value })} />
      )}

      <p className="error" role="alert">{err}</p>
      <div className="nav">
        {i > 0 ? <button type="button" className="ghost" onClick={() => { setErr(""); setI(i - 1); }}>Back</button> : <span />}
        <button type="button" className="primary" onClick={() => next()}>{i === QUIZ.length - 1 ? "Continue" : "Next"}</button>
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
