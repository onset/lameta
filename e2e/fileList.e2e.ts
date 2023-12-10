import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { E2eFileList } from "./e2eFileList";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

test.describe("FileList", () => {
  test.beforeAll(async ({}) => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FileList");
    fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });
  test.afterAll(async ({}) => {
    await lameta.quit();
  });
  test("after adding a file, it shows in the list", async ({}, testInfo) => {
    await project.goToSessions();
    await project.addSession();

    await fileList.addFile("foo.txt");

    const match = () => page.getByRole("gridcell", { name: "foo.txt" });
    await expect(match()).toBeVisible();
    // now leave and come back, should still be there
    await project.goToPeople();
    await project.goToSessions();
    await expect(match()).toBeVisible();
    // NOT POSSIBLE YET
    //await project.deleteFile("foo.txt");
    //await expect(match()).toBeUndefined();
  });
});
