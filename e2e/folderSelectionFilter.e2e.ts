import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Folder selection behavior during filtering", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "SelectionFilterProj");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("selection adjusts when current selection filtered out and clears when zero results", async () => {
    await project.goToSessions();
    // add sessions so we have multiple rows
    await project.addSession();
    await project.addSession();
    // select the 2nd session row
    const sessionCells = page.getByRole("gridcell", { name: /New_Session/i });
    await sessionCells.nth(1).click();
    // filter to something that should match only first session (using full name base 'New_Session')
    const input = page.getByTestId("folder-search-input");
    await input.fill("New_Session");
    await page.waitForTimeout(250);
    // selection should now be on a visible session row (first). We detect by a row having class 'selected'.
    const selectedRow = page.locator(".folderList .rt-tr.selected");
    await expect(selectedRow).toHaveCount(1);

    // now enter nonsense query to yield zero results
    await input.fill("__NO_MATCH_123__");
    await page.waitForTimeout(250);
    // Expect folder count shows 0 matches
    await expect(page.getByTestId("folder-count")).toHaveText(/0\s+matches/);
    // No row should be selected when selectedIndex = -1
    await expect(page.locator(".folderList .rt-tr.selected")).toHaveCount(0);
  });
});
