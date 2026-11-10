import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { addFile, entries, groupOf, newSession, openSidebar } from "./problems-e2e-helpers";
import { ContributorsHelper } from "./contributors-e2e-helpers";

// ELAR turns on checks of lameta's own in its settings.json5, among them the ones that
// were in ELAR's rules file. A problem that they find goes where the user can fix it.

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("ELAR's checks", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "ElarChecks", "ELAR");
    page = lameta.page;
    await newSession(project, page, "ELAR-CHECKS");
    // a format that ELAR does not allow
    await addFile(lameta, page, "notes.docx");
    // a contributor with no role
    await page.locator(".fileList .rt-tr", { hasText: "ELAR-CHECKS.session" }).click();
    const contributors = new ContributorsHelper(page, project);
    await contributors.goToContributorsTab();
    await contributors.addContributor("Dami Asan");
    await openSidebar(page);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("a contributor with no role is a problem that a click takes to the Contributors tab", async () => {
    const noRole = groupOf(page, "session:ELAR-CHECKS").locator(
      entries(page, "contributorWithoutRole", "contributions"),
    );
    await expect(noRole).toBeVisible({ timeout: 20000 });
    await project.goToPeople();
    await noRole.click();
    await expect(page.getByRole("tab", { name: /Contributors/i })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.locator(".navigation-highlight")).toHaveAttribute(
      "data-field-key",
      "contributions",
    );
    await expect(page.locator(".fileList .rt-tr.selected")).toContainText("ELAR-CHECKS.session");
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
