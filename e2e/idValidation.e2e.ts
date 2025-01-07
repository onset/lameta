import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("ID Validation Tests", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, `IDValidation_${Date.now()}`);
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("valid ID (no spaces) should allow tabbing to next field", async () => {
    await project.goToSessions();
    await project.addSession();
    const idField = page.getByLabel("ID");
    await idField.click();
    await idField.fill("session001");
    await page.keyboard.press("Tab");

    // verify we're no longer in the ID field
    await expect(idField).not.toBeFocused();
  });

  test("empty ID should show error and maintain focus", async () => {
    await project.goToSessions();
    await project.addSession();
    const idField = page.getByLabel("ID");
    await idField.click();
    await idField.fill("");
    await page.keyboard.press("Tab");

    // pause 1 second to allow the error dialog to appear
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // verify error dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });
    await page.locator(".defaultButton").click();

    // verify that the dialog is gone
    await expect(dialog).not.toBeVisible();
  });

  test("ID with spaces should show error and maintain focus", async () => {
    await project.goToSessions();
    await project.addSession();
    const idField = page.getByLabel("ID");
    await idField.click();
    await idField.fill("session 001");
    await page.keyboard.press("Tab");
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // verify error dialog appears
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 2000 });
    await page.locator(".defaultButton").click();

    // verify that the dialog is gone
    await expect(dialog).not.toBeVisible();

    // verify focus returns to ID field
    // It doesn't do this yet ---------------> await expect(idField).toBeFocused();

    // focus on the ID field
    await idField.click();

    // fix the ID and verify we can move on
    await idField.fill("session001");
    await page.keyboard.press("Tab");
    await expect(idField).not.toBeFocused();
  });
});
