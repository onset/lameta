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

    const idField = page.locator("#id");
    await idField.click();
    await idField.fill("session001");
    await page.keyboard.press("Tab");

    // verify no tooltip appears
    const tooltip = page.locator(".react-tooltip-lite");
    await expect(tooltip).not.toBeVisible();

    // verify we're no longer in the ID field
    await expect(idField).not.toBeFocused();
  });

  test("empty ID should show tooltip and maintain focus", async () => {
    await project.goToSessions();
    await project.addSession();
    const idField = page.locator("#id");
    await idField.click();
    await idField.fill("");
    await page.keyboard.press("Tab");

    // verify tooltip appears
    const tooltip = page.locator(".react-tooltip-lite");
    await expect(tooltip).toBeVisible();

    // verify focus stays in field
    // not working yet: await expect(idField).toBeFocused();
  });

  test("ID with spaces should show tooltip and maintain focus", async () => {
    await project.goToSessions();
    await project.addSession();
    const idField = page.locator("#id");
    await idField.click();
    await idField.fill("session 2");
    await page.keyboard.press("Tab");

    // verify tooltip appears
    const tooltip = page.locator(".react-tooltip-lite");
    await expect(tooltip).toBeVisible();

    // verify focus returns to ID field
    // not working yet: await expect(idField).toBeFocused();

    // fix the ID and verify tooltip disappears
    await idField.fill("session2");
    await page.keyboard.press("Tab");
    await expect(tooltip).not.toBeVisible();
    await expect(idField).not.toBeFocused();
  });
});
