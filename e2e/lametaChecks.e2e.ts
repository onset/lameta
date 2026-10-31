import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { addFile, entries, groupOf, newSession, openSidebar } from "./problems-e2e-helpers";

// The checks in src/problems/lametaChecks.ts, which run for every archive
// configuration. These use lameta's own configuration, with no archive chosen.

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("lameta's checks for every configuration", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "LametaChecks");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("a session that has no files is a problem that a click goes to, and a file fixes it", async () => {
    await newSession(project, page, "NO-FILES");
    await openSidebar(page);
    const noFiles = groupOf(page, "session:NO-FILES").locator(entries(page, "sessionWithoutFiles"));
    await expect(noFiles).toBeVisible({ timeout: 15000 });

    // from another session on the People tab, a click comes back to this session
    await newSession(project, page, "OTHER");
    await project.goToPeople();
    await noFiles.click();
    await expect(page.getByTestId("sessions-tab")).toHaveAttribute("aria-selected", "true");
    await expect(page.locator(".fileList .rt-tr", { hasText: "NO-FILES.session" })).toBeVisible();

    await addFile(lameta, page, "notes.txt");
    await expect(noFiles).toHaveCount(0, { timeout: 15000 });
  });
});
