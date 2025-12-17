import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import {
  launchWithProject,
  createNewProject,
  E2eProject
} from "./various-e2e-helpers";
import * as fs from "fs";
import * as path from "path";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

/**
 * Tests for automatic navigation to Languages tab when multilingualConversionPending is true.
 * When a project opens with multilingualConversionPending set to true (either just set or
 * previously set), the app should navigate to Project > Languages tab to show the migration panel.
 */
test.describe(
  "Multilingual Conversion Pending - Languages Tab Navigation",
  () => {
    test.beforeAll(async () => {
      lameta = new LametaE2ERunner();
      // Start with a fast launch project
      project = await launchWithProject(
        lameta,
        `SlashSyntaxTest_${Date.now()}`
      );
      page = lameta.page;
    });

    test.afterAll(async () => {
      await lameta.quit();
    });

    test("should open to Languages tab when project has slash-syntax content in ELAR mode", async () => {
      // Create a session with slash-syntax content (like "English / Spanish")
      await project.goToSessions();
      await project.addSession();

      // Wait for the session form to load
      const titleEditor = page.locator('[data-testid="field-title-edit"]');
      await titleEditor.waitFor({ timeout: 10000 });
      await titleEditor.click();

      // Enter slash-syntax content that simulates old multilingual format
      await page.keyboard.type(
        "Under the House / Bajo la Casa / Sous la Maison"
      );
      await page.keyboard.press("Tab");
      await page.waitForTimeout(500);

      // Now switch to ELAR configuration (which has multilingual fields)
      // This should trigger multilingualConversionPending detection
      await project.goToProjectConfiguration();
      await page.locator("#archiveConfigurationName-select").click();
      await page.getByText("ELAR", { exact: true }).click();
      await page.locator("button:has-text('Change')").click();

      // After configuration change, the app reloads
      // With multilingualConversionPending true, it should navigate to Languages tab
      await page.waitForSelector('[data-testid="project-tab"]', {
        timeout: 10000
      });

      // The Languages tab should be visible and selected (or at least the migration panel visible)
      // Wait for Languages tab content to be visible
      const languagesTab = page.getByTestId("project-collection-languages-tab");
      await languagesTab.waitFor({ state: "visible", timeout: 10000 });

      // The Languages tab should be selected (has aria-selected="true" or similar indicator)
      // We can verify by checking if the migration panel is visible
      const migrationPanel = page.getByTestId("multilingual-migration-panel");
      await migrationPanel.waitFor({ state: "visible", timeout: 10000 });

      // The migration panel should be visible, indicating we're on the Languages tab
      await expect(migrationPanel).toBeVisible();

      // The Migrate button should be visible (but disabled until working languages are configured)
      const migrateButton = page.getByTestId("convert-multilingual-button");
      await expect(migrateButton).toBeVisible();
    });
  }
);

// TODO: These tests need to be updated once the migration feature is complete.
// Currently, multilingual UI only shows when there are multiple metadata slots configured.
// See: https://github.com/onset/lameta/issues/XXX

test.describe.skip("Multilingual Field Migration", () => {
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

    // In default mode, title is a text field with contentEditable div
    const titleEditor = page.locator('[data-testid="field-title-edit"]');
    await titleEditor.waitFor({ timeout: 10000 });
    await titleEditor.click();
    await page.keyboard.type("Under the House");
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

    // Go back to the session using the helper method that waits for UI to be ready
    await project.goToSessions();

    // Click on the session we created (sessions are displayed as gridcells)
    const sessionRow = page
      .getByRole("gridcell", { name: /New_Session/i })
      .first();
    await sessionRow.click();
    await page.waitForTimeout(500);

    // Wait for the Session tab to be active
    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    // The Title field should now be multilingual with the plain text in English axis
    const titleField = page.locator('[data-testid="field-title-edit"]');

    // Check if we can see any translation slots at all
    const allSlots = titleField.locator('[data-testid^="translation-slot-"]');
    const slotsCount = await allSlots.count();

    if (slotsCount === 0) {
      throw new Error("No translation slots found - migration failed!");
    }

    const titleSlotEn = titleField.locator(
      '[data-testid="translation-slot-en"]'
    );
    await expect(titleSlotEn).toBeVisible({ timeout: 5000 });

    const titleEditorEn = titleSlotEn.locator('[contenteditable="true"]');

    // This should show "Under the House" - the migration should have worked
    await expect(titleEditorEn).toHaveText("Under the House");

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
      '[data-testid="translation-slot-en"]'
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
      '[data-testid="field-title-edit"] [data-testid="translation-slot-spa"]',
      {
        timeout: 5000
      }
    );

    const spanishAxis = titleField.locator(
      '[data-testid="translation-slot-spa"]'
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

    // Go back to the session using proper helper
    await project.goToSessions();

    const sessionRow = page
      .getByRole("gridcell", { name: /New_Session/i })
      .first();
    await sessionRow.click();
    await page.waitForTimeout(500);

    // In monolingual mode, the Title field should show the raw tagged text
    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    const titleEditor = page.locator('[data-testid="field-title-edit"]');

    // Should show the tagged format preserving all data
    const titleValue = await titleEditor.textContent();
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

    // Go back to the session using proper helper
    await project.goToSessions();

    const sessionRowAgain = page
      .getByRole("gridcell", { name: /New_Session/i })
      .first();
    await sessionRowAgain.click();
    await page.waitForTimeout(500);

    // Both translations should still be there
    await page.waitForSelector('[data-testid="field-title-edit"]', {
      timeout: 10000
    });

    const titleFieldAfter = page.locator('[data-testid="field-title-edit"]');
    const englishAxisAfter = titleFieldAfter.locator(
      '[data-testid="translation-slot-en"]'
    );
    const englishEditorAfter = englishAxisAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfter).toHaveText("English Title");

    const spanishAxisAfter = titleFieldAfter.locator(
      '[data-testid="translation-slot-spa"]'
    );
    await expect(spanishAxisAfter).toBeVisible();
    const spanishEditorAfter = spanishAxisAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfter).toHaveText("Título Español");
  });
});
