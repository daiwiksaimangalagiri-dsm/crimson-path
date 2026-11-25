import { catalog } from "../shared/catalog.ts";
import { programs } from "../shared/programs.ts";

const STEPS = [
  ["Tell us about you", "Twelve quick questions: your major, when you graduate, what you're aiming for."],
  ["Add classes you've taken", "So CrimsonPath never suggests them again and picks the right next level."],
  ["Paste your counselor's notes", "Or describe your interests. You get a semester-by-semester plan you can ask questions about."],
] as const;

export function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="welcome">
      <div className="welcome-in">
        <h1>Turn one advising meeting into a plan for every semester until graduation.</h1>
        <p className="lede">
          CrimsonPath reads your counselor's notes, checks every class against IU Bloomington's catalog, and lays out what to take and when.
        </p>
        <ol className="how">
          {STEPS.map(([t, d]) => <li key={t}><b>{t}</b><span>{d}</span></li>)}
        </ol>
        <button type="button" className="primary big" onClick={onStart} autoFocus>Start</button>
        <p className="muted small">
          Plans from {catalog.courses.length.toLocaleString()} undergraduate courses and {programs.majors.length} majors at IU Bloomington.
          Your answers stay in this browser.
        </p>
      </div>
    </main>
  );
}
