import { useState } from "react";
import type { Profile } from "../shared/schemas.ts";
import { getSavedProfile, saveProfile } from "./api.ts";
import { Quiz, Taken } from "./Intake.tsx";
import { Planner } from "./Planner.tsx";
import { Welcome } from "./Welcome.tsx";

type Step = "welcome" | "quiz" | "taken" | "plan";
const STEPS: [Step, string][] = [["quiz", "About you"], ["taken", "Classes taken"], ["plan", "Your roadmap"]];

export function App() {
  const [profile, setProfile] = useState<Profile | null>(getSavedProfile);
  const [step, setStep] = useState<Step>(() => (!profile ? "welcome" : profile.takenDone ? "plan" : "taken"));

  const go = (next: Step, p: Profile | null = profile) => {
    if (p) saveProfile(p);
    setProfile(p);
    setStep(next);
    window.scrollTo?.(0, 0);
  };

  return (
    <>
      <header className="masthead">
        <div className="masthead-in">
          <span className="mark" aria-hidden="true">
            <svg width="18" height="22" viewBox="0 0 22 26"><path d="M4 2h14M4 24h14M7 2v22M15 2v22M7 8h-3v10h3M15 8h3v10h-3" stroke="currentColor" strokeWidth="2.6" fill="none" strokeLinecap="round" /></svg>
          </span>
          <span className="brand">CrimsonPath</span>
          <ol className="steps" aria-label="Progress">
            {step !== "welcome" && STEPS.map(([s, label], i) => (
              <li key={s} aria-current={s === step ? "step" : undefined}>{i + 1}. {label}</li>
            ))}
          </ol>
        </div>
      </header>
      {step === "welcome" && <Welcome onStart={() => go("quiz")} />}
      {step === "quiz" && <Quiz initial={profile} onDone={(p) => go("taken", p)} />}
      {step === "taken" && profile && (
        <Taken profile={profile} onBack={() => go("quiz")} onDone={(p) => go("plan", { ...p, takenDone: true })} />
      )}
      {step === "plan" && profile && <Planner profile={profile} onRetake={() => go("quiz")} onEditTaken={() => go("taken")} />}
      <footer className="foot">
        CrimsonPath plans from IU's course catalog. Confirm when a class is offered in iGPS, and check your plan with your academic advisor.
      </footer>
    </>
  );
}
