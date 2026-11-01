import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { addFile, entries, groupOf, newSession, openSidebar } from "./problems-e2e-helpers";

// For an archive that takes IMDI, a session whose IMDI lameta cannot generate is a
// problem in the Problems sidebar, which a click takes to the session.

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("A session whose IMDI lameta cannot generate", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "ImdiNotGenerated", "ELAR");
    page = lameta.page;
    await newSession(project, page, "NO-IMDI");
    // a file with no name before its extension has no type, which the IMDI needs
    await addFile(lameta, page, ".wav");
    await openSidebar(page);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("is an error in the sidebar that a click takes to the session", async () => {
    const problem = groupOf(page, "session:NO-IMDI").locator(entries(page, "imdiNotGenerated"));
    await expect(problem).toBeVisible({ timeout: 20000 });
    await expect(problem.getByTestId("severity-icon-error")).toBeVisible();
    await project.goToPeople();
    await problem.click();
    await expect(page.getByTestId("sessions-tab")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".fileList .rt-tr.selected")).toContainText("NO-IMDI.session");
  });
});
