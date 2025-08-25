import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import { E2eFileList } from "./FileList-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

test.describe("FileList", () => {
  test.beforeAll(async ({}) => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FileList[don't break]");
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
    // the "[don't break]" in the path would break after a reload in lameta 2.3 due to changes in glob behavior
    await lameta.softReload();
    await project.goToSessions();
    await expect(match()).toBeVisible();

    // NOT POSSIBLE YET
    //await project.deleteFile("foo.txt");
    //await expect(match()).toBeUndefined();
  });

  test("after adding a file, it becomes the selected file", async ({}, testInfo) => {
    await project.goToSessions();
    await project.addSession();

    // Add the first file
    await fileList.addFile("first-file.txt");

    // Wait for the file to appear and then check it's selected (has the "selected" class)
    const firstFileRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("gridcell", { name: "first-file.txt" }) });
    await expect(firstFileRow).toBeVisible();
    await expect(firstFileRow).toHaveClass(/selected/);

    // Add a second file
    await fileList.addFile("second-file.txt");

    // Wait for the second file to appear and check it becomes selected
    const secondFileRow = page
      .getByRole("row")
      .filter({ has: page.getByRole("gridcell", { name: "second-file.txt" }) });
    await expect(secondFileRow).toBeVisible();
    await expect(secondFileRow).toHaveClass(/selected/);

    // The first file should no longer be selected
    await expect(firstFileRow).not.toHaveClass(/selected/);
  });
});
