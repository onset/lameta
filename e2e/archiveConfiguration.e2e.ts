import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { shouldSeeExactlyOnce } from "./e2e.expects";

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
    project.goToSessions();
    project.addSession();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, ["good", "bad"]);
    await project.goToProjectConfiguration();
    await page.locator("#customAccessChoices").fill("good, bad, ugly");
    project.goToSessions();
    await page.locator("#access-chooser").click();
    await shouldSeeExactlyOnce(page, ["good", "bad", "ugly"]);
  });
});
