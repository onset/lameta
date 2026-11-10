import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let project: E2eProject;

test.describe("IMDI export of a project whose title a file name cannot hold", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "TitleCharacters");
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("exports, with the corpus file named without those characters", async () => {
    const page = lameta.page;
    await project.goToProjectCollection();
    const title = page.getByTestId("field-title-edit");
    await title.click();
    await page.keyboard.type("Kakabe: stories?");
    await page.keyboard.press("Tab");
    await project.goToSessions();
    await project.addSession();

    const exportDirectory = Path.join(
      project.projectDirectory,
      "..",
      `title-characters-export ${Date.now()}`,
    );
    await lameta.electronApp.evaluate(async ({ dialog }, exportPath) => {
      dialog.showSaveDialog = async () =>
        Promise.resolve({ canceled: false, filePath: exportPath });
    }, exportDirectory);
    await lameta.clickMenu("File", "Export Project...");
    await page.locator('input[type="radio"][value="imdi"]').check();
    await page.getByRole("button", { name: "Export" }).click();
    await expect(page.locator("h3:has-text('Done')")).toBeVisible({
      timeout: 30000,
    });

    const corpusFiles = fs.readdirSync(exportDirectory).filter((name) => name.endsWith(".imdi"));
    expect(corpusFiles).toHaveLength(1);
    expect(corpusFiles[0]).toMatch(/Kakabe.*stories\.imdi$/);
    expect(corpusFiles[0]).not.toMatch(/[<>:"/\\|?*]/);
  });
});
