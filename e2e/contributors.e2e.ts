import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { E2eFileList } from "./e2eFileList";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

test.describe("FileList", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "Contributors");
    fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });
  test.afterAll(async () => {
    await lameta.quit();
  });
  test("adding a new contributor with name only, then that contributor is available", async () => {
    await project.goToSessions();
    await project.addSession();
    await project.goToContributorsOfThisSession();
    await page.keyboard.press("Tab");
    await page.keyboard.type("foo bar");
    await page.keyboard.press("Enter");
    await project.goToNotesOfThisSession();
    await project.goToContributorsOfThisSession();
    // reg exp to match starting with "Foo Bar ❓"
    const startsWithFooBar = new RegExp("^Foo Bar ❓");
    await page.getByText(startsWithFooBar).click();

    // now try to use it in a new session
    await project.addSession();
    await project.goToContributorsOfThisSession();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Control+ArrowDown");
    await page.getByText(startsWithFooBar).click();

    await lameta.softReload();

    // pause for a moment to see the result

    await project.goToSessions();
    await project.addSession();
    await project.goToContributorsOfThisSession();
    // using the locator, find the first element with class "PersonChooser"
    await page.locator(".PersonChooser").click();
    await page.keyboard.press("Control+ArrowDown");
    await page.getByText(startsWithFooBar).click();
  });
});
