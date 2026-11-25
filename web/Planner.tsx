import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import termRows from "../shared/data/terms.json" with { type: "json" };
import { catalog, firstNum } from "../shared/catalog.ts";
import type { ChatMessage, Detected, Mode, Plan, Profile } from "../shared/schemas.ts";
import { createChatReply, createRoadmap } from "./api.ts";

const SAMPLE_NOTES = `Career coach meeting, Nov 20
- Student is an Informatics major interested in UX design and user research.
- Take INFO-I 201 next semester; it builds on INFO-I 101.
- Take CSCI-C 200 to get comfortable with programming, since a lot of UX roles want some coding.
- For research skills, take PSY-P 101.
- Coach also recommended INFO-H 400 for the design side.
- Look into a statistics class for next fall to help with analyzing survey data.
- Join a UX club and add a writing class at some point.`;
const SAMPLE_INTERESTS = "I love sports and numbers. I'd like to work in sports analytics or in marketing for a pro team. I'm also curious about photography and want at least one creative class. I'd rather avoid heavy coding.";
const QUICK = ["Make it lighter", "Swap in an easier class", "Add a class for my interests", "Why these classes?"];
const TERM_SHORT = new Map(termRows.map((t) => [t.term, t.short]));

type Built = { plan: Plan; detected: Detected[]; mode: Mode; text: string };

export function nextDeadline(plan: Plan, now: Date): { days: number; label: string } | null {
  let best: { d: Date; label: string } | null = null;
  for (const it of plan.semesters.flatMap((t) => t.items)) {
    const m = /([A-Z][a-z]{2,8}\.? \d{1,2}, \d{4})/.exec(it.deadline);
    if (!m?.[1]) continue;
    const d = new Date(m[1].replace(".", ""));
    if (!Number.isNaN(d.getTime()) && d >= now && (!best || d < best.d)) best = { d, label: m[1] };
  }
  return best && { days: Math.ceil((best.d.getTime() - now.getTime()) / 86400000), label: best.label };
}

export function Planner({ profile, onRetake, onEditTaken }: { profile: Profile; onRetake: () => void; onEditTaken: () => void }) {
  const [mode, setMode] = useState<Mode>("notes");
  const [texts, setTexts] = useState<Record<Mode, string>>({ notes: "", interests: "" });
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState("");
  const [built, setBuilt] = useState<Built | null>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const text = texts[mode];

  const build = async (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return box.current?.focus();
    setBuilding(true);
    setError("");
    try {
      const r = await createRoadmap({ mode, text, profile });
      setBuilt({ ...r, mode, text });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  };

  const chips = [profile.year, profile.major + (profile.minor ? ` + ${profile.minor} minor` : ""), ...profile.interests, profile.goal, profile.credits, `Math and coding: ${profile.math.toLowerCase()}`];
  const ideas = [...profile.interests.filter((x) => x !== "Not sure yet"), `More ${profile.major}`];
  const nTaken = profile.taken.length + profile.takenOther.length;

  return (
    <main className="planner">
      <aside className="side">
        <section className="you" aria-label="Your profile">
          <div className="row"><h2>You</h2><button type="button" className="link" onClick={onRetake}>Retake quiz</button></div>
          <ul className="tags">{chips.map((c) => <li key={c}>{c}</li>)}</ul>
          <div className="row"><span>Classes taken: {nTaken || "none yet"}</span><button type="button" className="link" onClick={onEditTaken}>Edit</button></div>
        </section>

        <div className="tabs" role="tablist" aria-label="Build from">
          {(["notes", "interests"] as const).map((m) => (
            <button key={m} type="button" role="tab" id={`tab-${m}`} aria-controls="build-panel" aria-selected={mode === m} onClick={() => setMode(m)}>
              {m === "notes" ? "Counselor notes" : "My interests"}
            </button>
          ))}
        </div>
        <form id="build-panel" role="tabpanel" aria-labelledby={`tab-${mode}`} onSubmit={build}>
          <p className="hint">{mode === "notes"
            ? "Paste notes from a counselor or career coach meeting, including any classes they named."
            : "No counselor notes? Describe what you're into: subjects, hobbies, dream jobs. CrimsonPath will find classes for it."}</p>
          <textarea ref={box} aria-label={mode === "notes" ? "Counselor notes" : "Your interests"} rows={10} value={text}
            placeholder={mode === "notes" ? "e.g. Coach said take INFO-I 101 next spring, add a stats class, and join a UX club" : "e.g. I love sports and numbers, and I'm curious about photography"}
            onChange={(e) => setTexts({ ...texts, [mode]: e.target.value })} />
          {mode === "interests" && (
            <div className="ideas">{ideas.map((x) => (
              <button key={x} type="button" className="idea" onClick={() => setTexts({ ...texts, interests: text.trim() ? `${text.trim()}, ${x}` : `I'm interested in ${x}` })}>+ {x}</button>
            ))}</div>
          )}
          <div className="actions">
            <button type="submit" className="primary" disabled={building}>{building ? "Building…" : "Build my roadmap"}</button>
            <button type="button" className="ghost" onClick={() => setTexts({ ...texts, [mode]: mode === "notes" ? SAMPLE_NOTES : SAMPLE_INTERESTS })}>
              {mode === "notes" ? "Try sample notes" : "Try a sample"}
            </button>
          </div>
        </form>

        <dl className="sources">
          <dt>Classes</dt><dd className="on">{catalog.courses.length.toLocaleString()} undergrad courses</dd>
          <dt>Clubs</dt><dd>not loaded</dd>
          <dt>Events and workshops</dt><dd>not loaded</dd>
          <dt>Internships</dt><dd>not loaded</dd>
        </dl>
      </aside>

      <section className="result" aria-live="polite" aria-busy={building}>
        {building && <p className="status"><span className="spin" aria-hidden="true" />{mode === "notes" ? "Reading your notes and checking every class against the catalog…" : "Reading your interests and searching the catalog…"}</p>}
        {!building && error && <p className="error-box" role="alert">{error}</p>}
        {!building && !error && !built && (
          <div className="empty">
            <PathGlyph />
            <p>Your roadmap will appear here, one semester at a time.</p>
          </div>
        )}
        {!building && built && <Roadmap built={built} profile={profile} onPlan={(plan) => setBuilt({ ...built, plan })} />}
      </section>
    </main>
  );
}

function PathGlyph() {
  return (
    <svg width="160" height="40" viewBox="0 0 160 40" aria-hidden="true">
      <path d="M10 20 H150" stroke="currentColor" strokeWidth="3" strokeDasharray="2 8" strokeLinecap="round" />
      {[10, 56, 104, 150].map((x) => <circle key={x} cx={x} cy="20" r="7" fill="var(--paper)" stroke="currentColor" strokeWidth="3" />)}
    </svg>
  );
}

function Roadmap({ built, profile, onPlan }: { built: Built; profile: Profile; onPlan: (p: Plan) => void }) {
  const { plan, mode } = built;
  const all = plan.semesters.flatMap((t) => t.items);
  const nC = all.filter((i) => i.origin === "counselor").length;
  const nd = nextDeadline(plan, new Date());
  const target = Number(profile.credits.match(/\d+/g)?.at(-1) ?? 15);

  return (
    <article className="roadmap">
      {plan.profile_summary && <p className="summary">{plan.profile_summary}</p>}
      <p className="figures">
        <span><b>{all.length}</b> classes over {plan.semesters.length} {plan.semesters.length === 1 ? "semester" : "semesters"}</span>
        {mode === "notes" && <span className="c"><b>{nC}</b> counselor's picks</span>}
        <span className="s"><b>{all.length - nC}</b> suggested for you</span>
        <span><b>{nd ? nd.days : "–"}</b> {nd ? `days until ${nd.label}` : "no dated deadline yet"}</span>
      </p>

      {plan.semesters.length === 0
        ? <p className="hint">No matching classes were found in the catalog. Ask your advisor which courses fit these goals.</p>
        : (
          <>
            <p className="legend">
              {mode === "notes" && <span><i className="stop c" aria-hidden="true" /> Counselor's pick</span>}
              <span><i className="stop s" aria-hidden="true" /> Suggested for you</span>
              <span className="muted">Select a class to see its deadline and why it's there.</span>
            </p>
            <ol className="path">
              {plan.semesters.map((t) => {
                const cr = t.items.reduce((a, i) => a + firstNum(i.credits), 0);
                const style: CSSProperties & Record<"--load", number> = { "--load": Math.min(cr / target, 1) };
                return (
                  <li key={t.term} className="term" style={style}>
                    <div className="node" aria-hidden="true" />
                    <h3>{t.term}</h3>
                    <p className="when">{TERM_SHORT.get(t.term) || "Dates: check One.IU"}</p>
                    <p className="load">{cr} of about {target} credits from this plan</p>
                    <ul>{t.items.map((it) => (
                      <li key={it.code + it.name}>
                        <details className={`class ${it.origin === "counselor" ? "c" : "s"}`}>
                          <summary>
                            <i className={`stop ${it.origin === "counselor" ? "c" : "s"}`} aria-label={it.origin === "counselor" ? "Counselor's pick" : "Suggested for you"} />
                            <span className="code">{it.code}</span><span className="cr">{it.credits} cr</span>
                            <span className="name">{it.name.toLowerCase()}</span>
                          </summary>
                          <p><b>Deadline</b> {it.deadline}</p>
                          <p><b>Why</b> {it.reason}</p>
                          {it.origin === "suggested" && it.fit && <p><b>Fits you</b> {it.fit}</p>}
                          {!it.offered && <p className="muted">Confirm the term in iGPS.</p>}
                        </details>
                      </li>
                    ))}</ul>
                  </li>
                );
              })}
            </ol>
          </>
        )}

      {plan.suggestions.length > 0 && (
        <section>
          <h3>{mode === "interests" ? "What you're interested in" : "What your counselor suggested"}</h3>
          <ul className="said">{plan.suggestions.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      )}
      {plan.ask_advisor.length > 0 && (
        <section>
          <h3>Ask your advisor</h3>
          <ul className="advisor">{plan.ask_advisor.map((a) => <li key={a.need + a.why}><b>{a.need}</b> {a.why}</li>)}</ul>
        </section>
      )}
      <Chat built={built} profile={profile} onPlan={onPlan} />
    </article>
  );
}

type Line = ChatMessage & { kind?: "wait" | "bad" };

function Chat({ built, profile, onPlan }: { built: Built; profile: Profile; onPlan: (p: Plan) => void }) {
  const [lines, setLines] = useState<Line[]>([]);
  const [draft, setDraft] = useState("");
  const pending = useRef(false);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { list.current?.scrollTo?.(0, list.current.scrollHeight); }, [lines]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || pending.current) return;
    pending.current = true;
    const history = lines.filter((l) => !l.kind).slice(-8).map(({ role, text }) => ({ role, text }));
    setDraft("");
    setLines((l) => [...l, { role: "user", text: m }, { role: "ai", text: "Thinking…", kind: "wait" }]);
    try {
      const r = await createChatReply({ message: m, profile, mode: built.mode, text: built.text, detected: built.detected, plan: built.plan, history });
      setLines((l) => [...l.slice(0, -1), { role: "ai", text: r.reply }]);
      if (r.plan) onPlan(r.plan);
    } catch (err) {
      // Drop the failed question from history; show the error in its place.
      setLines((l) => [...l.slice(0, -2), { role: "ai", text: err instanceof Error ? err.message : String(err), kind: "bad" }]);
    } finally {
      pending.current = false;
    }
  };

  return (
    <section className="chat">
      <h3>Ask about your plan</h3>
      <p className="hint">Ask a question or say what to change, like "Can I take an easier stats class?"</p>
      <ol className="lines" ref={list} aria-live="polite">
        {lines.map((l, n) => <li key={n} className={`line ${l.role} ${l.kind ?? ""}`}>{l.text}</li>)}
      </ol>
      <form className="ask" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
        <textarea aria-label="Your question or change" rows={2} value={draft} placeholder="Type a question or a change"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }} />
        <button type="submit" className="primary">Send</button>
      </form>
      <div className="quick">{QUICK.map((q) => <button key={q} type="button" className="idea" onClick={() => void send(q)}>{q}</button>)}</div>
    </section>
  );
}
