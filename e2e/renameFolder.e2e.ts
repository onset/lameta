import { test, expect as expect, Page } from "@playwright/test";
import { Lameta } from "./Lameta";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: Lameta;
let page: Page;
let project: E2eProject;

test.describe("Changing person full name", () => {
  test.beforeAll(async ({}) => {
    lameta = new Lameta();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FileList");
  });
  test("changing FullName renames the file", async ({}, testInfo) => {
    await project.goToPeople();
    await project.addPerson();
    await page.pause();
    await setFullName("Bono Vox");
    await expectFileNameInGrid("Bono Vox.person");
    await setFullName("Bono");
    await expectFileNameInGrid("Bono.person");
    await setFullName("Paul Hewson");
    await expectFileNameInGrid("Bono.person");
    await page.pause();
    await lameta.quit();
  });
});

async function expectFileNameInGrid(name: string) {
  await page.getByRole("gridcell", {
    name: name,
  });
}
async function setFullName(name: string) {
  const fullNameField = await page.getByLabel("Full Name");
  console.log(JSON.stringify(fullNameField, null, 2));
  await fullNameField.click();
  await fullNameField.fill(name);
  // type a tab to move to the next field
  await page.keyboard.press("Tab");
}
