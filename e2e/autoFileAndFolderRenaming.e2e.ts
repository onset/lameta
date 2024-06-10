import fs from "fs";
import * as Path from "path";
import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";
import { E2eFileList } from "./e2eFileList";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

test.describe("AutoFileAndFolderRenaming Tests", () => {
  test.beforeEach(async () => {
    //console.log("************** beforeAll renamingFolder ");
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(
      lameta,
      "AutoFileAndFolderRenaming" + /*random*/ Math.random().toString()
    );
    fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });
  test.afterEach(async () => {
    await lameta.quit();
  });

  test("changing FullName renames the file", async () => {
    await project.goToPeople();
    await project.addPerson();
    await setFullName("Bono Vox");
    await expectFileNameInGrid("Bono_Vox.person");
    await setFullName("Bono");
    await expectFileNameInGrid("Bono.person");
    await setFullName("Paul Hewson");
    await expectFileNameInGrid("Paul_Hewson.person");
    // remove dangerous characters
    await setFullName(">Bono?Vox/Paul");
    await expectFileNameInGrid("_Bono_Vox_Paul.person");
  });
  test("changing FullName renames other files that have been renamed to match the person", async () => {
    await project.goToPeople();
    await project.addPerson();
    await setFullName("Paul Hewson");
    // wait 1 second for the directory to be created
    await page.waitForTimeout(1000);
    expect(
      fs.existsSync(
        Path.join(
          project.projectDirectory,
          "People",
          "Paul_Hewson",
          "Paul_Hewson.person"
        )
      )
    ).toBeTruthy();
    const original = Path.join(
      project.projectDirectory,
      "People",
      "Paul_Hewson",
      "Paul_Hewson_foo.txt"
    );
    await fileList.addFile("Paul_Hewson_foo.txt", { page, path: original });
    await expectFileNameInGrid("Paul_Hewson_foo.txt");

    await expect(
      fs.existsSync(original),
      `Expected to find ${original}`
    ).toBeTruthy();

    await setFullName("Bono");
    await expectFileNameInGrid("Bono_foo.txt");
    const after = Path.join(
      project.projectDirectory,
      "People",
      "Bono",
      "Bono_foo.txt"
    );
    expect(
      fs.existsSync(original),
      `Expected to NOT find ${original}`
    ).toBeFalsy();
    expect(fs.existsSync(after), `Expected to find ${after}`).toBeTruthy();
  });
});

async function expectFileNameInGrid(name: string) {
  await expect(
    page.getByRole("gridcell", {
      name: name
    }),
    `Expected the file list to have a file named "${name}"`
  ).toBeVisible({ timeout: 1000 });
}
async function setFullName(name: string) {
  const fullNameField = await page.waitForSelector("#name");
  await fullNameField.click();
  await fullNameField.fill(name);
  await page.keyboard.press("Tab");
}
