import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let project: E2eProject;

test.describe("New Person", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "AddPerson");
    await project.goToPeople();
  });
  test.afterAll(async () => {
    // the test stops lameta itself unless it failed before that
    const lametaProcess = lameta.electronApp.process();
    if (!lametaProcess.killed && lametaProcess.exitCode === null)
      await lameta.quit();
  });

  test("the new person's name is on disk even if lameta stops right away", async () => {
    await lameta.page.getByTestId("new-person-button").click();
    // the person's row in the list, not the New Person button
    await expect(
      lameta.page.getByRole("gridcell", { name: "New Person", exact: true })
    ).toBeVisible();

    // as if lameta crashed or the computer lost power: nothing more gets saved
    lameta.electronApp.process().kill();

    const personFile = Path.join(
      project.projectDirectory,
      "People",
      "New_Person",
      "New_Person.person"
    );
    expect(fs.readFileSync(personFile, "utf8")).toContain("New Person");
  });
});
