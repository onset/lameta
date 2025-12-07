import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Multilingual Text Fields", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, `MultilingualTest_${Date.now()}`);

    // Switch to ELAR configuration to get the multilingual description field
    await project.goToProjectConfiguration();
    await page.locator("#archiveConfigurationName-select").click();
    await page.getByText("ELAR", { exact: true }).click();
    await page.locator("button:has-text('Change')").click();

    // Wait for the app to reload after configuration change
    await page.waitForSelector('[data-testid="project-tab"]', {
      timeout: 10000
    });
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("multilingual description field shows Add translation button", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for the session form to load - look for the Description label
    await page.waitForSelector('text=Description', {
      timeout: 10000
    });

    // The Add translation button should be visible
    // Use text selector as fallback since data-testid may not be in built app yet
    const addTranslationBtn = page.locator('button:has-text("+ Add translation")').first();
    await expect(addTranslationBtn).toBeVisible();
  });

  test("clicking Add translation button shows language chooser", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    // Cancel button should now be visible
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // A language selector input should be visible (from SingleLanguageChooser)
    const languageInput = page.locator('.select input[role="combobox"]');
    await expect(languageInput.first()).toBeVisible();
  });

  test("clicking Cancel hides language chooser without adding", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    // Cancel button should be visible
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // Click cancel
    await cancelBtn.click();

    // Add translation button should be back, cancel should be hidden
    await expect(addTranslationBtn).toBeVisible();
    await expect(cancelBtn).not.toBeVisible();

    // Only one translation axis should exist (default English)
    const translationAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(translationAxes).toHaveCount(1);
  });

  test("selecting a language adds a new translation axis", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Initially should have one translation axis (English by default)
    const initialAxes = page.locator('[data-testid^="translation-axis-"]');
    const initialCount = await initialAxes.count();
    expect(initialCount).toBe(1);

    // Click Add translation
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    // Type in a language and select it
    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300); // wait for debounce
    await languageInput.press("Enter");

    // Wait for the new axis to appear
    await page.waitForTimeout(500);

    // Now should have two translation axes
    const afterAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(afterAxes).toHaveCount(2);

    // Spanish axis should exist
    const spanishAxis = page.getByTestId("translation-axis-es");
    await expect(spanishAxis).toBeVisible();

    // Spanish label should be visible
    const spanishLabel = page.getByTestId("translation-language-label-es");
    await expect(spanishLabel).toBeVisible();
    await expect(spanishLabel).toHaveText(/Spanish/i);
  });

  test("can type in each translation axis independently", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Type in the English description
    const descriptionField = page.getByTestId("field-description-edit");
    await descriptionField.click();
    await descriptionField.fill("This is the English description");

    // Add a Spanish translation
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // The new Spanish axis should be focused, type in it
    // Find the description editor within the Spanish axis
    const spanishAxis = page.getByTestId("translation-axis-es");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Esta es la descripción en español");

    // Verify both translations have their text
    await expect(descriptionField).toHaveText("This is the English description");
    await expect(spanishEditor).toHaveText("Esta es la descripción en español");
  });

  test("remove translation button appears on hover", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add a second translation so remove button can appear
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("French");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // The remove button should exist but be hidden initially (opacity: 0)
    const removeBtn = page.getByTestId("remove-translation-fr");
    await expect(removeBtn).toBeAttached();

    // Hover over the French axis to show the remove button
    const frenchAxis = page.getByTestId("translation-axis-fr");
    await frenchAxis.hover();

    // Now the button should be visible (opacity: 1)
    // Note: checking visibility may not work if only opacity changes,
    // so we just verify the button exists and can be clicked
    await expect(removeBtn).toBeVisible();
  });

  test("clicking remove translation removes the axis", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add a second translation
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("German");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Verify we have 2 axes
    const axesBefore = page.locator('[data-testid^="translation-axis-"]');
    await expect(axesBefore).toHaveCount(2);

    // Hover and click remove on the German axis
    const germanAxis = page.getByTestId("translation-axis-de");
    await germanAxis.hover();

    const removeBtn = page.getByTestId("remove-translation-de");
    await removeBtn.click();

    // Wait for removal
    await page.waitForTimeout(300);

    // Should now have only 1 axis
    const axesAfter = page.locator('[data-testid^="translation-axis-"]');
    await expect(axesAfter).toHaveCount(1);

    // German axis should be gone
    await expect(germanAxis).not.toBeVisible();
  });

  test("removing last translation falls back to English", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Add a French translation first
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("French");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Now remove the English axis
    const englishAxis = page.getByTestId("translation-axis-en");
    await englishAxis.hover();

    const removeEnBtn = page.getByTestId("remove-translation-en");
    await removeEnBtn.click();
    await page.waitForTimeout(300);

    // Now only French should remain
    await expect(page.getByTestId("translation-axis-fr")).toBeVisible();
    await expect(page.getByTestId("translation-axis-en")).not.toBeVisible();

    // Remove French - should fall back to English
    const frenchAxis = page.getByTestId("translation-axis-fr");
    await frenchAxis.hover();

    const removeFrBtn = page.getByTestId("remove-translation-fr");
    await removeFrBtn.click();
    await page.waitForTimeout(300);

    // English should be back as the default
    await expect(page.getByTestId("translation-axis-en")).toBeVisible();
    const axes = page.locator('[data-testid^="translation-axis-"]');
    await expect(axes).toHaveCount(1);
  });

  test("cannot add duplicate language translation", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // English axis already exists by default
    const initialAxes = page.locator('[data-testid^="translation-axis-"]');
    const initialCount = await initialAxes.count();

    // Try to add English again
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("English");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Should still have the same number of axes (duplicate not added)
    const afterAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(afterAxes).toHaveCount(initialCount);
  });

  test("multilingual field data persists after switching tabs", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Enter text in the English description
    const descriptionField = page.getByTestId("field-description-edit");
    await descriptionField.click();
    await descriptionField.fill("Persistent English text");

    // Add Spanish and enter text
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    const spanishAxis = page.getByTestId("translation-axis-es");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto persistente en español");

    // Blur to ensure save
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);

    // Switch to Notes tab and back
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);

    // Go back to Session tab (which shows the description)
    await page.getByRole("tab", { name: "Session" }).click();
    await page.waitForTimeout(300);

    // Verify the translations are still there
    await expect(descriptionField).toHaveText("Persistent English text");
    const spanishAxisAfter = page.getByTestId("translation-axis-es");
    await expect(spanishAxisAfter).toBeVisible();
    const spanishEditorAfter = spanishAxisAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfter).toHaveText("Texto persistente en español");
  });
});
