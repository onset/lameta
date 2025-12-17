import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { FolderSearchUtilities } from "./folderSearch-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let searchUtils: FolderSearchUtilities;

// LAM-13: Not highlighting in More Fields
test.describe("Folder Search More Fields Highlight", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "FolderSearchMoreFields/ΔMore");
    page = lameta.page;
    searchUtils = new FolderSearchUtilities(page);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("highlights match inside More Fields row (Country)", async () => {
    await project.goToSessions();
    await project.addSession();
    // select a session row so the details pane shows
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();

    // Wait for More Fields block to render
    await page.getByText(/More Fields/i).waitFor();
    // Sanity: Country select is present in More Fields
    await expect(page.locator("select[name='Country']").first()).toBeVisible();

    // In More Fields, set Country to Andorra via project helper
    await project.setChooserFieldValue("Country", "Andorra");

    // Now search for a substring of Andorra using utilities
    await searchUtils.performSearch("andor");

    // Expect the ClosedChoiceEdit container to indicate a highlight (data-has-highlight)
    const countryChoice = page.locator(".field.locationCountry");
    await expect(countryChoice).toHaveAttribute("data-has-highlight", "true");
  });
});
