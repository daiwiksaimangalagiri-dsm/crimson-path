import { expect, test, type Page } from "@playwright/test";

// Full student flow with Claude stubbed at the API boundary (the server's own tests cover the real handler).
const plan = {
  profile_summary: "Hands-on design classes with light coding, since you learn by doing and want a UX job.",
  suggestions: ["Take INFO-I 201 next semester", "Take CSCI-C 200 for programming", "Add a statistics class next fall", "Join a UX club"],
  semesters: [
    { term: "Spring 2027", items: [
      { type: "class", origin: "counselor", name: "MATHEMATICAL FOUNDATIONS OF INFORMATICS", code: "INFO-I 201", deadline: "Before Spring 2027 classes begin (Jan 11, 2027)", reason: "Your coach named it as the next step after INFO-I 101.", fit: "", credits: "4", offered: "", gened: [] },
      { type: "class", origin: "counselor", name: "INTRODUCTION TO PROGRAMMING", code: "CSCI-C 200", deadline: "Before Spring 2027 classes begin (Jan 11, 2027)", reason: "UX roles often want some coding.", fit: "", credits: "4", offered: "", gened: ["N&M", "Mathematical Modeling"] } ] },
    { term: "Fall 2027", items: [
      { type: "class", origin: "suggested", name: "INTRODUCTION TO STATISTICS", code: "STAT-S 300", deadline: "Check One.IU for the registration date", reason: "Your coach asked for a stats class to analyze survey data.", fit: "Applied and light on theory.", credits: "3", offered: "", gened: ["N&M"] } ] },
  ],
  ask_advisor: [
    { need: "INFO-H 400", why: "Your counselor mentioned this, but it isn't in the catalog. Double-check the code with them." },
    { need: "UX club", why: "Clubs, events and internships aren't in CrimsonPath's files yet." },
  ],
};

async function shot(page: Page, name: string) {
  for (const [w, h] of [[375, 812], [1280, 900]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.waitForTimeout(500); // resizing crosses the phone breakpoint and restarts the path animation
    await page.screenshot({ path: `e2e/.results/${name}-${w}.png`, fullPage: true });
  }
}

test("quiz, classes taken, build, chat change", async ({ page }) => {
  await page.route("**/api/roadmap", (r) => r.fulfill({ json: { plan, detected: [] } }));
  await page.route("**/api/chat", (r) => r.fulfill({ json: {
    reply: "Moved statistics to Spring 2028 to lighten your fall.",
    plan: { ...plan, semesters: [plan.semesters[0], { ...plan.semesters[1], term: "Spring 2028" }] },
  } }));
  await page.goto("/");

  await shot(page, "0-welcome");
  await page.getByRole("button", { name: "Start" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByRole("alert")).toHaveText("Pick one to continue.");
  await page.getByRole("button", { name: "Sophomore" }).click();
  await page.getByRole("button", { name: "Luddy School of Informatics, Computing, and Engineering" }).click();
  await page.getByRole("combobox", { name: "Major" }).fill("inform");
  await shot(page, "1-quiz-major");
  await page.getByRole("option", { name: /^Informatics/ }).click();
  await page.getByRole("combobox", { name: "Minor (optional)" }).fill("busin");
  await page.getByRole("option", { name: /^Business/ }).first().click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Spring 2029" }).click();
  for (const o of ["UX & design", "Data & analytics"]) await page.getByRole("button", { name: o }).click();
  await shot(page, "1-quiz-interests");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "A full-time job" }).click();
  await page.getByRole("button", { name: "14–15 (typical)" }).click();
  await page.getByRole("button", { name: "Internship or job" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Hands-on projects" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: "Fine in small doses" }).click();
  await page.getByRole("button", { name: "5–10" }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  await page.getByRole("combobox").fill("intro to informatics");
  await page.getByRole("option", { name: /INFO-I 101/ }).click();
  await expect(page.getByText("1 class added, about 4 credits")).toBeVisible();
  await shot(page, "2-taken");
  await page.getByRole("button", { name: "Continue" }).click();

  await shot(page, "3-empty");
  await page.getByRole("button", { name: "Try sample notes" }).click();
  await page.getByRole("button", { name: "Build my roadmap" }).click();
  await expect(page.getByText(plan.profile_summary)).toBeVisible();
  await page.getByText("INFO-I 201", { exact: true }).click();
  await expect(page.getByText("Your coach named it as the next step")).toBeVisible();
  await shot(page, "4-roadmap");

  await page.getByRole("button", { name: "Make it lighter" }).click();
  await expect(page.getByText("Moved statistics to Spring 2028")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Spring 2028" })).toBeVisible();

  await page.emulateMedia({ colorScheme: "dark" });
  await shot(page, "5-dark");

  await page.reload();
  await expect(page.getByRole("button", { name: "Build my roadmap" })).toBeVisible();
});
