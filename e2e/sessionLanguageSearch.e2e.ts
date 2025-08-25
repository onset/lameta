import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import { FolderSearchUtilities } from "./folderSearch-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let searchUtils: FolderSearchUtilities;

test.describe("Session Language Search (LAM-14)", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "SessionLanguageSearchTest");
    searchUtils = new FolderSearchUtilities(page);
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  async function addLanguagesToSession() {
    await project.goToSessions();
    await project.addSession();

    // Select the newly added session row so the details form appears
    const firstSessionCell = page
      .getByRole("gridcell", { name: /^New_Session/ })
      .first();
    await firstSessionCell.waitFor({ state: "visible", timeout: 10000 });
    await firstSessionCell.click();

    // Set Subject Languages -> add French
    const subjectContainer = page
      .locator('div.field:has(label:has-text("Subject Languages"))')
      .first();
    const subjectInput = subjectContainer
      .locator('.select input[role="combobox"]')
      .first();
    await subjectInput.click();
    await subjectInput.fill("French");
    await page.waitForTimeout(300); // let async options load
    await subjectInput.press("Enter");

    // Set Working Languages -> include German (force ISO code to avoid ambiguous matches like Plautdietsch)
    const workingContainer = page
      .locator('div.field:has(label:has-text("Working Languages"))')
      .first();
    const workingInput = workingContainer
      .locator('.select input[role="combobox"]')
      .first();
    await workingInput.click();
    await workingInput.fill("deu");
    await page.waitForTimeout(300);
    await workingInput.press("Enter");

    // Small settle time for autosave/observable updates
    await page.waitForTimeout(500);
  }

  test("searching by language name filters sessions and highlights", async () => {
    await addLanguagesToSession();

    // Back to sessions list ensures search UI is visible
    await project.goToSessions();
    // Ensure at least one session row is visible before searching
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await searchUtils.expectSearchUiPresent();

    // Search by subject language name (french)
    await searchUtils.performSearch("french");
    await searchUtils.expectFolderCount(1);
    // Expect an inline highlight to be visible somewhere (language pill or fields)
    await searchUtils.expectHighlightsVisible(true);

    // Clear and search by working language name (german)
    await searchUtils.clearSearch();
    await searchUtils.performSearch("german");
    await searchUtils.expectFolderCount(1);
    await searchUtils.expectHighlightsVisible(true);

    // Clear and verify the list shows at least one session again
    await searchUtils.clearSearch();
    // At least one row (the created session)
    await searchUtils.expectFolderCount(1);
  });
});
