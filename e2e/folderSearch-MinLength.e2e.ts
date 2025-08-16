import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Folder Search minimum length", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FolderSearchMinLenProj");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("typing one character does not filter or highlight; two characters does", async () => {
    await project.goToSessions();
    // Ensure some rows exist
    await project.addSession();
    await project.addSession();

    // Capture initial count
    const allRowsSelector = ".folderList .rt-tbody .rt-tr";
    const initialCount = await page.locator(allRowsSelector).count();
    expect(initialCount).toBeGreaterThan(0);

    const input = page.getByTestId("folder-search-input");
    await input.fill("S"); // single character
    await page.waitForTimeout(250);

    // Expect no highlights in the folder list area and no filtered count indicator
    await expect(
      page.locator(".folderList [data-testid='inline-highlight']").first()
    ).toHaveCount(0);
    const countNow = await page.locator(allRowsSelector).count();
    expect(countNow).toBe(initialCount);

    // Now type 2 characters
    await input.fill("Se");
    await page.waitForTimeout(300);
    // Now we should either have highlights or a different count (can't assume exact), but at least a filter is active
    const maybeHighlights = await page
      .locator(".folderList [data-testid='inline-highlight']")
      .count();
    const countAfter = await page.locator(allRowsSelector).count();
    expect(maybeHighlights > 0 || countAfter !== initialCount).toBeTruthy();
  });
});
