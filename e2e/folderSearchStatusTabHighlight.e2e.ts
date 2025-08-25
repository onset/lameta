import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// Reproduces LAM-17: searching for a Status value should highlight the Status tab,
// not the Session tab.

test.describe("Folder Search Status Tab Highlight", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FolderSearchStatusTab/ΔStatus");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("searching a status value highlights Status tab only", async () => {
    await project.goToSessions();
    await project.addSession();
    // select a session to show tabs
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();

    // Open Status tab and set to "Finished"
    await page.getByRole("tab", { name: /Status/i }).click();
    // click the Finished radio; label text is localized, but English key "Finished" should appear by default locale in tests
    await page.getByLabel(/Finished/i).click();

    // Now search for "finished" in the folder search bar
    const input = page.getByTestId("folder-search-input");
    await input.fill("finished");
    await page.waitForTimeout(250);

    // Status tab should be highlighted
    await expect(page.getByTestId("status-tab-highlight")).toBeVisible();
    // Session tab should not be highlighted for a pure status match
    await expect(page.getByTestId("session-tab-highlight")).toHaveCount(0);
  });
});
