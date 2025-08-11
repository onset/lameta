import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { shouldSeeExactlyOnce } from "./e2e.expects";
import { xorBy } from "lodash";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("ArchiveConfiguration", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();

    // Wait for the home page to be ready
    await page.waitForSelector("#creatNewProjectLink", { timeout: 10000 });

    await lameta.cancelRegistration();

    project = await createNewProject(lameta, "ArchiveConfiguration");

    // Now wait for the project to be loaded and sessions tab to be available
    await page.waitForSelector('[data-testid="sessions-tab"]', {
      timeout: 10000
    });
    //fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });
  test("New project gets 'Other' and can enter custom access protocols", async () => {
    await project.goToProjectConfiguration();
    await shouldSeeExactlyOnce(page, ["Other"]);

    // Wait for the custom access choices field to be visible and ready for interaction
    const customAccessChoicesInput = page.getByTestId(
      "field-customAccessChoices-edit"
    );
    await customAccessChoicesInput.waitFor({
      state: "visible",
      timeout: 10000
    });

    // Click and fill the input
    await customAccessChoicesInput.click();
    await customAccessChoicesInput.fill("good, bad");
    await customAccessChoicesInput.press("Tab");
    await project.goToSessions();
    await project.addSession();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, ["good", "bad"]);
    await project.goToProjectConfiguration();
    await page
      .getByTestId("field-customAccessChoices-edit")
      .fill("good, bad, ugly");
    await project.goToSessions();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, ["good", "bad", "ugly"]);
  });
  test("Changing to ELAR gives Collection Tab, Steward, and ELAR access protocols", async () => {
    // collection tab should be visible now because the default lameta configuration
    // includes collection fields with visibility: "always"

    // First navigate to the project tab to make sure we're in the right place
    await page.locator(`[data-testid="project-tab"]`).click();
    await page.waitForTimeout(500); // Give it time to load the project tab content

    // Check that collection tab is visible
    const collectionTab = page.locator(
      `[data-testid="project-collection-tab"]`
    );
    const visible = await collectionTab.isVisible();
    expect(visible).toBeTruthy();

    // now go change to ELAR
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click(); // will do a soft reload in e2e context

    // Wait for the app to reload after configuration change
    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });

    // check that this tab is there now
    await project.goToProjectCollection();

    // check for one of the expected fields
    await page
      .locator('[data-testid="field-collectionSteward-edit"]')
      .fill("Steward McGill");

    // check the access protocols
    await project.goToSessions();
    await project.addSession();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, [
      "O: fully open",
      "U: open to users",
      "S: open to subscribers"
    ]);
  });
});
