import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { addFile, entries, groupOf, newSession, openSidebar } from "./problems-e2e-helpers";
import { ContributorsHelper } from "./contributors-e2e-helpers";

// The archive's rules file runs in a separate hidden window (mainProcess/rulesSandbox.ts).
// These tests go through that real path: the main process, the sandbox and back. ELAR
// has a rules file, and also turns on checks of lameta's own in its settings.json5.

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Rules file", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "RulesFile", "ELAR");
    page = lameta.page;
    await newSession(project, page, "ELAR-CHECKS");
    // a format that ELAR does not allow
    await addFile(lameta, page, "notes.docx");
    // a contributor with no role, which ELAR's rules.js reports
    await page.locator(".fileList .rt-tr", { hasText: "ELAR-CHECKS.session" }).click();
    const contributors = new ContributorsHelper(page, project);
    await contributors.goToContributorsTab();
    await contributors.addContributor("Dami Asan");
    await openSidebar(page);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("ELAR's built-in rules file reports a problem", async () => {
    await expect(
      groupOf(page, "session:ELAR-CHECKS").locator(entries(page, "checkActorRole")),
    ).toBeVisible({ timeout: 20000 });
  });

  test("a check of lameta's own that ELAR's settings turn on reports a problem, which a click takes to the file", async () => {
    const format = groupOf(page, "session:ELAR-CHECKS").locator(entries(page, "fileExtension"));
    await expect(format).toBeVisible({ timeout: 20000 });
    // the project's name has a space, which ELAR does not allow
    await expect(entries(page, "projectName")).toBeVisible();
    await project.goToPeople();
    await format.click();
    await expect(page.getByTestId("sessions-tab")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".fileList .rt-tr.selected")).toContainText("notes.docx");
  });
});
