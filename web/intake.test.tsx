// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getSavedProfile } from "./api.ts";
import { Quiz, Taken } from "./Intake.tsx";

afterEach(() => { cleanup(); localStorage.clear(); });
const click = (name: string) => fireEvent.click(screen.getByRole("button", { name }));

describe("quiz", () => {
  it("asks for a major before moving on, and limits interests to 3", () => {
    render(<Quiz initial={null} onDone={vi.fn()} />);
    click("Junior");
    click("Kelley School of Business");
    click("Next");
    expect(screen.getByRole("alert").textContent).toBe("Enter your major.");
    fireEvent.change(screen.getByRole("combobox", { name: "Major" }), { target: { value: "My own major" } });
    click("Next");
    click("Spring 2029");
    for (const o of ["Tech & software", "UX & design", "Data & analytics", "Law & policy"]) click(o);
    expect(screen.getByRole("alert").textContent).toBe("Pick up to 3.");
    expect(screen.getByRole("button", { name: "Law & policy" }).getAttribute("aria-pressed")).toBe("false");
  });
});

describe("classes taken", () => {
  const profile = { year: "Junior", school: "Luddy School of Informatics, Computing, and Engineering", major: "Informatics", gradTerm: "Spring 2028", summer: ["Internship"], interests: ["UX & design"], goal: "A full-time job", credits: "14–15 (typical)", learn: ["Hands-on projects"], math: "I enjoy them", time: "5–10", taken: [], takenOther: [] };

  it("keeps unknown pasted codes as notes and explains empty pastes", () => {
    const onDone = vi.fn();
    render(<Taken profile={profile} onBack={vi.fn()} onDone={onDone} />);
    fireEvent.click(screen.getByText("Or paste a list of course codes"));
    const box = screen.getByLabelText("Paste course codes");
    fireEvent.change(box, { target: { value: "nothing here" } });
    click("Add from list");
    expect(screen.getByRole("status").textContent).toMatch(/No course codes found/);
    fireEvent.change(box, { target: { value: "INFO-I 101, ABCD-X 999" } });
    click("Add from list");
    expect(screen.getByRole("status").textContent).toMatch(/ABCD-X 999/);
    click("Continue");
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ taken: ["INFO-I 101"], takenOther: ["ABCD-X 999"] }));
  });

  it("skip empties the list", () => {
    const onDone = vi.fn();
    render(<Taken profile={{ ...profile, taken: ["INFO-I 101"] }} onBack={vi.fn()} onDone={onDone} />);
    click("I haven't taken any yet");
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ taken: [], takenOther: [] }));
  });
});

describe("saved profile", () => {
  it("ignores a corrupt or incomplete profile", () => {
    localStorage.setItem("crimsonpath_profile_v4", "{not json");
    expect(getSavedProfile()).toBeNull();
    localStorage.setItem("crimsonpath_profile_v4", JSON.stringify({ year: "Junior" }));
    expect(getSavedProfile()).toBeNull();
  });
});
