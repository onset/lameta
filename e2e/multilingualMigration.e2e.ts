import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import * as fs from "fs";
import * as path from "path";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Multilingual Field Migration", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("should handle monolingual Title when opening session in ELAR mode", async () => {
    // Create a new project in default (monolingual) mode
    project = await createNewProject(lameta, `MigrationTest_${Date.now()}`);

    // Create a session with monolingual Title
    await project.goToSessions();
    await project.addSession();

    // In default mode, title is just a regular text input
    const titleInput = page.locator('[data-testid="field-title-edit"] input');
    await titleInput.waitFor({ timeout: 10000 });
    await titleInput.fill("Under the House");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);

    // Now switch to ELAR configuration (makes Title multilingual)
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();

    // Wait for the app to reload after configuration change
    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });

    // Go back to the session
    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.waitForTimeout(500);

    const sessionRow = page.locator(".session-card").first();
    await sessionRow.click();
    await page.waitForTimeout(1000);

    // Wait for the Session tab to be active
    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    // The Title field should now be multilingual with the plain text in English axis
    const titleField = page.locator('[data-testid="field-title-edit"]');

    // Check if we can see any translation axes at all
    const allAxes = titleField.locator('[data-testid^="translation-axis-"]');
    const axesCount = await allAxes.count();
    console.log(`Number of translation axes found: ${axesCount}`);

    if (axesCount === 0) {
      // No axes found - this is the bug!
      // Let's check what we do see
      const fieldHTML = await titleField.innerHTML();
      console.log("Field HTML:", fieldHTML);
      throw new Error("No translation axes found - migration failed!");
    }

    const titleAxisEn = titleField.locator(
      '[data-testid="translation-axis-en"]'
    );
    await expect(titleAxisEn).toBeVisible({ timeout: 5000 });

    const titleEditor = titleAxisEn.locator('[contenteditable="true"]');

    // This should show "Under the House" - the migration should have worked
    await expect(titleEditor).toHaveText("Under the House");

    // We should be able to add a translation
    const addTranslationBtn = titleField
      .locator('[data-testid="add-translation-button"]')
      .first();
    await expect(addTranslationBtn).toBeVisible();
  });

  test("should preserve multilingual Title data when switching between configs", async () => {
    // Create a new project and switch to ELAR mode
    project = await createNewProject(
      lameta,
      `MultilingualPreserve_${Date.now()}`
    );

    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();

    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });

    // Create a session with multilingual title
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    // Add English title
    const titleField = page.locator('[data-testid="field-title-edit"]');
    const englishAxis = titleField.locator(
      '[data-testid="translation-axis-en"]'
    );
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("English Title");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Add Spanish translation
    const addTranslationBtn = titleField
      .locator('[data-testid="add-translation-button"]')
      .first();
    await addTranslationBtn.click();

    const languageInput = titleField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    await page.waitForSelector(
      '[data-testid="field-title-edit"] [data-testid="translation-axis-spa"]',
      {
        timeout: 5000
      }
    );

    const spanishAxis = titleField.locator(
      '[data-testid="translation-axis-spa"]'
    );
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Título Español");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);

    // Switch back to default configuration (monolingual)
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("lameta", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();

    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });

    // Go back to the session
    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.waitForTimeout(500);

    const sessionRow = page.locator(".session-card").first();
    await sessionRow.click();
    await page.waitForTimeout(500);

    // In monolingual mode, the Title field should show the raw tagged text
    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    const titleInput = page.locator('[data-testid="field-title-edit"] input');

    // Should show the tagged format preserving all data
    const titleValue = await titleInput.inputValue();
    expect(titleValue).toContain("[[en]]English Title");
    expect(titleValue).toContain("[[spa]]Título Español");

    // Switch back to ELAR (multilingual mode)
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();

    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });

    // Go back to the session
    await page.getByRole("tab", { name: "Sessions" }).click();
    await page.waitForTimeout(500);

    await sessionRow.click();
    await page.waitForTimeout(500);

    // Both translations should still be there
    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    const titleFieldAfter = page.locator('[data-testid="field-title-edit"]');
    const englishAxisAfter = titleFieldAfter.locator(
      '[data-testid="translation-axis-en"]'
    );
    const englishEditorAfter = englishAxisAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfter).toHaveText("English Title");

    const spanishAxisAfter = titleFieldAfter.locator(
      '[data-testid="translation-axis-spa"]'
    );
    await expect(spanishAxisAfter).toBeVisible();
    const spanishEditorAfter = spanishAxisAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfter).toHaveText("Título Español");
  });
});
