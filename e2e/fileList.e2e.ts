import { test, expect as expect, Page } from "@playwright/test";
import { Lameta } from "./Lameta";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: Lameta;
let page: Page;
let project: E2eProject;

test.describe("FileList", () => {
  test.beforeAll(async ({}) => {
    lameta = new Lameta();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FileList");
  });
  test("after adding a file, it shows in the list", async ({}, testInfo) => {
    await project.goToSessions();
    await project.addSession();
    await project.addFile("foo.txt");

    const match = () => page.getByRole("gridcell", { name: "foo.txt" });
    //await page.pause();
    await expect(match()).toBeVisible();
    // now leave and come back, should still be there
    await project.goToPeople();
    await project.goToSessions();
    await expect(match()).toBeVisible();
    // NOT POSSIBLE YET
    //await project.deleteFile("foo.txt");
    //await expect(match()).toBeUndefined();
    await page.pause();
    await lameta.quit();
  });
});
