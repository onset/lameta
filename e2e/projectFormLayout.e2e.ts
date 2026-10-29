import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Project form layout", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await page.waitForSelector("#creatNewProjectLink", { timeout: 10000 });
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "ProjectFormLayout");
    await page.waitForSelector('[data-testid="sessions-tab"]', { timeout: 10000 });
    // ELAR's Project form has the steward and depositor fields too
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();
    await page.waitForSelector('[data-testid="project-tab"]', { timeout: 10000 });
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("keeps the fields in one column that scrolls when the window is short", async () => {
    // too short for the Project form's fields
    // the rules sandbox has a hidden window of its own
    await lameta.electronApp.evaluate(({ BrowserWindow }) => {
      const window = BrowserWindow.getAllWindows().find((w) => w.isVisible())!;
      window.unmaximize();
      window.setSize(1100, 400);
    });
    await project.goToProjectCollection();
    const form = page.locator("form.project").first();
    await page.getByTestId("field-collectionSteward-edit").waitFor({ state: "visible" });

    expect(await form.evaluate((f) => f.scrollHeight > f.clientHeight)).toBe(true);
    const fieldLefts = await form
      .locator(".field")
      .evaluateAll((fields) => fields.map((f) => Math.round(f.getBoundingClientRect().left)));
    expect(fieldLefts.length).toBeGreaterThan(3);
    expect(new Set(fieldLefts).size).toBe(1);
  });
});
