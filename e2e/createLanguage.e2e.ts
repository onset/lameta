import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Create Custom Language", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "CreateLanguageTest");
    page = lameta.page;
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("creating a new custom language should add it to the field", async () => {
    // Navigate to Project > Collection Languages tab where canCreateNew is true
    await project.goToProjectLanguages();

    // Find the Subject Languages field which has canCreateNew: true
    const subjectContainer = page
      .locator('div.field:has(label:has-text("Subject Languages"))')
      .first();
    await subjectContainer.waitFor({ state: "visible", timeout: 10000 });

    const subjectInput = subjectContainer
      .locator('.select input[role="combobox"]')
      .first();
    await subjectInput.click();

    // Type a custom language name that won't match any existing language
    const customLanguageName = "MyCustomLang123";
    await subjectInput.fill(customLanguageName);
    await page.waitForTimeout(300); // let async options load

    // Set up the dialog handler before clicking to create
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("You created");
      expect(dialog.message()).toContain(customLanguageName);
      await dialog.accept();
    });

    // Look for the "Create" option in the dropdown - it shows as 'Create "name"'
    const createOption = page.getByRole("option", {
      name: new RegExp(`Create.*${customLanguageName}`)
    });
    await createOption.waitFor({ state: "visible", timeout: 5000 });
    await createOption.click();

    // Wait for dialog to be handled and UI to update
    await page.waitForTimeout(500);

    // Verify the language was added to the field
    // Look for the Remove button associated with the language pill
    const removePillButton = subjectContainer.getByRole("button", {
      name: new RegExp(`Remove.*${customLanguageName}`)
    });
    await expect(removePillButton).toBeVisible({ timeout: 5000 });
  });

  test("creating a language with special characters should work", async () => {
    // Navigate to Project > Collection Languages tab
    await project.goToProjectLanguages();

    // Find the Subject Languages field
    const subjectContainer = page
      .locator('div.field:has(label:has-text("Subject Languages"))')
      .first();
    await subjectContainer.waitFor({ state: "visible", timeout: 10000 });

    const subjectInput = subjectContainer
      .locator('.select input[role="combobox"]')
      .first();
    await subjectInput.click();

    // Type a custom language name with unicode characters
    const customLanguageName = "Tëst Läng üñíçödé";
    await subjectInput.fill(customLanguageName);
    await page.waitForTimeout(300);

    // Set up the dialog handler before clicking
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    // Look for the "Create" option in the dropdown
    const createOption = page.getByRole("option", {
      name: new RegExp(
        `Create.*${customLanguageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      )
    });
    await createOption.waitFor({ state: "visible", timeout: 5000 });
    await createOption.click();

    await page.waitForTimeout(500);

    // Verify the language was added - look for the Remove button for the language pill
    const removePillButton = subjectContainer.getByRole("button", {
      name: new RegExp(
        `Remove.*${customLanguageName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
      )
    });
    await expect(removePillButton).toBeVisible({ timeout: 5000 });
  });
});
