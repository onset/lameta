import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Folder Search UI", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FolderSearch[weird ✓ name]/测试");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  async function expectSearchUiPresent() {
    await expect(page.getByTestId("folder-search-input")).toBeVisible();
    // subtle icon (no button yet because empty)
    await expect(page.getByTestId("folder-search-icon")).toBeVisible();
  }

  test("sessions tab search field typing enter and clearing", async () => {
    await project.goToSessions();
    // add a couple sessions to filter
    await project.addSession();
    await project.addSession();
    await expectSearchUiPresent();
    const input = page.getByTestId("folder-search-input");
    await input.click();
    await input.fill("alpha βeta / quirky ✨");
    // now should have a button (same element as icon but wrapped in button) and a clear X
    await expect(page.getByTestId("folder-search-button")).toBeVisible();
    await expect(page.getByTestId("folder-search-clear")).toBeVisible();
    // press enter to trigger search
    await input.press("Enter");
    // data attribute should reflect last search
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      "alpha βeta / quirky ✨"
    );
    // click clear
    await page.getByTestId("folder-search-clear").click();
    await expect(input).toHaveValue("");
    // icon (non-button) should be back
    await expect(page.getByTestId("folder-search-icon")).toBeVisible();

    // now actually test filtering: search for 'Session' should match all sessions
    await input.fill("Session");
    await input.press("Enter");
    // expect at least one gridcell with id containing New_Session
    const matchingCells = page.getByRole("gridcell", { name: /New_Session/i });
    await expect(matchingCells.first()).toBeVisible();
    // now search for nonsense; we only verify the search registered (result count may be 0 depending on app state)
    await input.fill("ZZZZ_NO_MATCH_§§");
    await input.press("Enter");
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      "ZZZZ_NO_MATCH_§§"
    );
    // clear again
    await page.getByTestId("folder-search-clear").click();
  });

  test("people tab search field independent state", async () => {
    await project.goToPeople();
    await expectSearchUiPresent();
    const input = page.getByTestId("folder-search-input");
    await input.click();
    await input.type("Person XYZ ???");
    await expect(page.getByTestId("folder-search-button")).toBeVisible();
    await input.press("Enter");
    await expect(page.getByTestId("folder-search-bar")).toHaveAttribute(
      "data-last-search",
      "Person XYZ ???"
    );
  });
});
