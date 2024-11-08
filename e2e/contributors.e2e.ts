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
    await page.keyboard.type("foo");
    await page.keyboard.press("Enter");

    // regression test that there is not a second item named just "foo" instead of "foo ?"
    await page.locator(".PersonChooser").first().click();
    await page.keyboard.press("Control+ArrowDown");
    await expect(page.getByText("foo", { exact: true })).toHaveCount(0);

    await project.goToNotesOfThisSession();
    await project.goToContributorsOfThisSession();
    // open the dropdown
    const name = "foo ❓";
    await page.getByRole("gridcell", { name: name }).click();
    await page.getByRole("option", { name: name }).click();

    //    now try to use it in a new session
    await project.addSession();
    await project.goToContributorsOfThisSession();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Control+ArrowDown");

    await page.getByText(name).click();

    await lameta.softReload();

    await project.goToSessions();
    await project.addSession();
    await project.goToContributorsOfThisSession();
    // using the locator, find the first element with class "PersonChooser"
    await page.locator(".PersonChooser").click();
    await page.keyboard.press("Control+ArrowDown");
    await page.getByText(name).click();
  });
});
