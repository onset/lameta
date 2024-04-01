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
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "ArchiveConfiguration");
    //fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });
  test("New project gets 'Other' and can enter custom access protocols", async () => {
    await project.goToProjectConfiguration();
    await shouldSeeExactlyOnce(page, ["Other"]);
    await page.locator("#customAccessChoices").click();
    await page.locator("#customAccessChoices").fill("good, bad");
    await page.locator("#customAccessChoices").press("Tab");
    await project.goToSessions();
    await project.addSession();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, ["good", "bad"]);
    await project.goToProjectConfiguration();
    await page.locator("#customAccessChoices").fill("good, bad, ugly");
    await project.goToSessions();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, ["good", "bad", "ugly"]);
  });
  test("Changing to ELAR gives Collection Tab, Steward, and ELAR access protocols", async () => {
    // should not see a collection tab yet because we start out in "Other" which doesn't have that tab
    const visible = await page
      .locator(`[data-testid="project-collection-tab"]`)
      .isVisible();
    expect(visible).toBeFalsy();

    // now go change to ELAR
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click(); // will do a soft reload in e2e context

    // check that this tab is there now
    await project.goToProjectCollection();

    // check for one of the expected fields
    await page.locator("#collectionSteward").fill("Steward McGill");

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
