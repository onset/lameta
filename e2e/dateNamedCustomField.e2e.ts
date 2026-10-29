import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let project: E2eProject;

test.describe('A custom field whose name contains "date"', () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "DateNamedField");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("keeps its text, and the session still saves", async () => {
    const page = lameta.page;
    await project.goToSessions();
    await project.addSession();

    const name = page.locator(".customFieldsTable textarea").first();
    await name.fill("transcription_date");
    await name.blur();
    await page.getByTestId("field-transcription_date-edit").click();
    await page.keyboard.type("done by Ana");
    await page.keyboard.press("Tab");

    await page.getByTestId("field-title-edit").click();
    await page.keyboard.type("Story one");
    await page.keyboard.press("Tab");
    // leaving the session saves it
    await project.goToPeople();

    const sessionFile = Path.join(
      project.projectDirectory,
      "Sessions",
      "New_Session",
      "New_Session.session",
    );
    await expect
      .poll(() => fs.readFileSync(sessionFile, "utf8"), { timeout: 10000 })
      .toContain("Story one");
    expect(fs.readFileSync(sessionFile, "utf8")).toContain("done by Ana");
  });
});
