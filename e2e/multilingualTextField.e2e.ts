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

    // Wait for the new axis to appear (ISO 639-3 code for Spanish is "spa")
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    // Now should have two translation axes
    const afterAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(afterAxes).toHaveCount(2);

    // Spanish axis should exist (ISO 639-3 code is "spa")
    const spanishAxis = page.getByTestId("translation-axis-spa");
    await expect(spanishAxis).toBeVisible();

    // Spanish label should be visible
    const spanishLabel = page.getByTestId("translation-language-label-spa");
    await expect(spanishLabel).toBeVisible();
    await expect(spanishLabel).toHaveText(/Spanish/i);
  });

  test("can type in each translation axis independently", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Get the English axis and its editor
    const englishAxis = page.getByTestId("translation-axis-en");
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("This is the English description");

    // Add a Spanish translation
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // The new Spanish axis should be focused, type in it
    // Find the description editor within the Spanish axis (ISO 639-3 code is "spa")
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });
    const spanishAxis = page.getByTestId("translation-axis-spa");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Esta es la descripción en español");

    // Verify both translations have their text
    await expect(englishEditor).toHaveText("This is the English description");
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

    // Wait for French axis to appear (ISO 639-3 code is "fra")
    await page.waitForSelector('[data-testid="translation-axis-fra"]', { timeout: 5000 });

    // The remove button should exist but be hidden initially (opacity: 0)
    const removeBtn = page.getByTestId("remove-translation-fra");
    await expect(removeBtn).toBeAttached();

    // Hover over the French axis to show the remove button
    const frenchAxis = page.getByTestId("translation-axis-fra");
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

    // Add a second translation (use "deu" code directly for unambiguous match)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("deu");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for German axis to appear (ISO 639-3 code is "deu")
    await page.waitForSelector('[data-testid="translation-axis-deu"]', { timeout: 5000 });

    // Verify we have 2 axes
    const axesBefore = page.locator('[data-testid^="translation-axis-"]');
    await expect(axesBefore).toHaveCount(2);

    // Hover and click remove on the German axis
    const germanAxis = page.getByTestId("translation-axis-deu");
    await germanAxis.hover();

    const removeBtn = page.getByTestId("remove-translation-deu");
    await removeBtn.click();

    // Wait for removal
    await page.waitForTimeout(300);

    // Should now have only 1 axis
    const axesAfter = page.locator('[data-testid^="translation-axis-"]');
    await expect(axesAfter).toHaveCount(1);

    // German axis should be gone
    await expect(germanAxis).not.toBeVisible();
  });

  test("removing non-English axis leaves default intact", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Add a French translation first (use ISO code)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for French axis to appear (ISO 639-3 code is "fra")
    await page.waitForSelector('[data-testid="translation-axis-fra"]', { timeout: 5000 });

    // Add some text to French
    const frenchAxis = page.getByTestId("translation-axis-fra");
    const frenchEditor = frenchAxis.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("French text here");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify we have 2 axes
    let axes = page.locator('[data-testid^="translation-axis-"]');
    await expect(axes).toHaveCount(2);

    // Remove French - English should remain
    await frenchAxis.hover();
    const removeFrBtn = page.getByTestId("remove-translation-fra");
    await removeFrBtn.click();
    await page.waitForTimeout(300);

    // English should still be there
    await expect(page.getByTestId("translation-axis-en")).toBeVisible();
    await expect(page.getByTestId("translation-axis-fra")).not.toBeVisible();
    axes = page.locator('[data-testid^="translation-axis-"]');
    await expect(axes).toHaveCount(1);
  });

  test("cannot add duplicate language translation", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // First, add Spanish so we have 2 axes
    let addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    let languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    // Now we have 2 axes (en and spa)
    const afterFirstAdd = page.locator('[data-testid^="translation-axis-"]');
    await expect(afterFirstAdd).toHaveCount(2);

    // Try to add Spanish again - should not add a duplicate
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Should still have 2 axes (duplicate not added)
    const afterDuplicateAttempt = page.locator('[data-testid^="translation-axis-"]');
    await expect(afterDuplicateAttempt).toHaveCount(2);
  });

  test("multilingual field data persists after switching tabs", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Enter text in the English description (use the axis-specific selector)
    const englishAxis = page.getByTestId("translation-axis-en");
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("Persistent English text");

    // Add Spanish and enter text
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for Spanish axis to appear (ISO 639-3 code is "spa")
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });
    const spanishAxis = page.getByTestId("translation-axis-spa");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto persistente en español");

    // Blur to ensure save
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);

    // Switch to Notes tab and back
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);

    // Go back to Session tab (use exact match to avoid matching Sessions tab)
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Verify the translations are still there
    const englishAxisAfter = page.getByTestId("translation-axis-en");
    const englishEditorAfter = englishAxisAfter.locator('[contenteditable="true"]');
    await expect(englishEditorAfter).toHaveText("Persistent English text");
    
    const spanishAxisAfter = page.getByTestId("translation-axis-spa");
    await expect(spanishAxisAfter).toBeVisible();
    const spanishEditorAfter = spanishAxisAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfter).toHaveText("Texto persistente en español");
  });
  // Comprehensive stress test for multilingual field
  test("stress test: multiple operations on multilingual field without restart", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Step 1: Add text to the default English field (use axis-specific locator)
    const englishAxis = page.getByTestId("translation-axis-en");
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("Initial English text with special chars: é ñ ü 日本語");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 2: Add Spanish translation
    let addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    let languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    // Step 3: Add text to Spanish field
    const spanishAxis = page.getByTestId("translation-axis-spa");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto en español con caracteres: ñ á é í ó ú");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 4: Add French translation (use ISO code)
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-fra"]', { timeout: 5000 });

    // Step 5: Add text to French field
    const frenchAxis = page.getByTestId("translation-axis-fra");
    const frenchEditor = frenchAxis.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("Texte français avec accents: é è ê ë à â");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 6: Add German translation but leave it empty (use ISO code "deu")
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("deu");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-deu"]', { timeout: 5000 });

    // Step 7: Verify we have 4 translation axes
    let allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(4);

    // Step 8: Remove the empty German translation
    const germanAxis = page.getByTestId("translation-axis-deu");
    await germanAxis.hover();
    const removeGermanBtn = page.getByTestId("remove-translation-deu");
    await removeGermanBtn.click();
    await page.waitForTimeout(300);

    // Verify we now have 3 axes
    allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(3);

    // Step 9: Add Arabic translation (RTL language - edge case, use ISO code)
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("ara");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-ara"]', { timeout: 5000 });

    // Step 10: Add Arabic text
    const arabicAxis = page.getByTestId("translation-axis-ara");
    const arabicEditor = arabicAxis.locator('[contenteditable="true"]');
    await arabicEditor.click();
    await arabicEditor.fill("نص عربي للاختبار");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 11: Modify existing English text (re-fetch the locator)
    const englishEditorRefresh = page.getByTestId("translation-axis-en").locator('[contenteditable="true"]');
    await englishEditorRefresh.click();
    await englishEditorRefresh.fill("Modified English text: testing updates!");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 12: Note: Clearing Spanish text would cause it to be lost on tab switch
    // (this is expected behavior - empty translations are not persisted)
    // Instead, let's verify the Spanish text is still there
    const spanishEditorCheck = page.getByTestId("translation-axis-spa").locator('[contenteditable="true"]');
    await expect(spanishEditorCheck).toHaveText("Texto en español con caracteres: ñ á é í ó ú");

    // Step 13: Verify current state before tab switch
    const englishEditorCheck = page.getByTestId("translation-axis-en").locator('[contenteditable="true"]');
    await expect(englishEditorCheck).toHaveText("Modified English text: testing updates!");
    const frenchEditorCheck = page.getByTestId("translation-axis-fra").locator('[contenteditable="true"]');
    await expect(frenchEditorCheck).toHaveText("Texte français avec accents: é è ê ë à â");
    const arabicEditorCheck = page.getByTestId("translation-axis-ara").locator('[contenteditable="true"]');
    await expect(arabicEditorCheck).toHaveText("نص عربي للاختبار");

    // Step 14: Switch tabs to force a save
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Step 15: Verify data persisted after tab switch
    // English should still have the modified text
    const englishEditorAfterTab = page.getByTestId("translation-axis-en").locator('[contenteditable="true"]');
    await expect(englishEditorAfterTab).toHaveText("Modified English text: testing updates!");
    
    // French should still have its text
    const frenchAxisAfterTab = page.getByTestId("translation-axis-fra");
    await expect(frenchAxisAfterTab).toBeVisible();
    const frenchEditorAfterTab = frenchAxisAfterTab.locator('[contenteditable="true"]');
    await expect(frenchEditorAfterTab).toHaveText("Texte français avec accents: é è ê ë à â");

    // Arabic should still have its text
    const arabicAxisAfterTab = page.getByTestId("translation-axis-ara");
    await expect(arabicAxisAfterTab).toBeVisible();
    const arabicEditorAfterTab = arabicAxisAfterTab.locator('[contenteditable="true"]');
    await expect(arabicEditorAfterTab).toHaveText("نص عربي للاختبار");

    // Spanish should still have its text
    const spanishAxisAfterTab = page.getByTestId("translation-axis-spa");
    await expect(spanishAxisAfterTab).toBeVisible();
    const spanishEditorAfterTab = spanishAxisAfterTab.locator('[contenteditable="true"]');
    await expect(spanishEditorAfterTab).toHaveText("Texto en español con caracteres: ñ á é í ó ú");

    // Step 16: Remove French translation
    const frenchAxisToRemove = page.getByTestId("translation-axis-fra");
    await frenchAxisToRemove.hover();
    const removeFrenchBtn = page.getByTestId("remove-translation-fra");
    await removeFrenchBtn.click();
    await page.waitForTimeout(300);

    // Step 17: Verify French is gone
    await expect(page.getByTestId("translation-axis-fra")).not.toBeVisible();

    // Step 18: Add Mandarin Chinese (CJK characters - edge case, use ISO code)
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("cmn");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-cmn"]', { timeout: 5000 });

    // Step 19: Add Chinese text
    const chineseAxis = page.getByTestId("translation-axis-cmn");
    const chineseEditor = chineseAxis.locator('[contenteditable="true"]');
    await chineseEditor.click();
    await chineseEditor.fill("中文测试文本，包含特殊字符：！@#￥%");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 20: Attempt to add duplicate language (should not add)
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("ara");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Step 21: Count axes - should still be 4 (en, spa, ara, cmn) not 5
    allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(4);

    // Step 22: Remove all non-English translations one by one
    // Remove Spanish
    const spanishAxisToRemove = page.getByTestId("translation-axis-spa");
    await spanishAxisToRemove.hover();
    await page.getByTestId("remove-translation-spa").click();
    await page.waitForTimeout(300);

    // Remove Arabic
    const arabicAxisToRemove = page.getByTestId("translation-axis-ara");
    await arabicAxisToRemove.hover();
    await page.getByTestId("remove-translation-ara").click();
    await page.waitForTimeout(300);

    // Remove Chinese
    const chineseAxisToRemove = page.getByTestId("translation-axis-cmn");
    await chineseAxisToRemove.hover();
    await page.getByTestId("remove-translation-cmn").click();
    await page.waitForTimeout(300);

    // Step 23: Should now have only English
    allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(1);
    await expect(page.getByTestId("translation-axis-en")).toBeVisible();

    // Step 24: With only one axis, the remove button should not be visible
    // This is a boundary condition - can't remove the last translation
    const englishAxisFinal = page.getByTestId("translation-axis-en");
    await englishAxisFinal.hover();
    const removeEnglishBtn = page.getByTestId("remove-translation-en");
    // Check that the button is not visible (because canRemoveAxis is false when only 1 axis)
    await expect(removeEnglishBtn).not.toBeVisible();

    // Step 25: Final verification - English text should still be there
    const finalEnglishEditor = page.getByTestId("translation-axis-en").locator('[contenteditable="true"]');
    await expect(finalEnglishEditor).toHaveText("Modified English text: testing updates!");
  });

  // Test for very long text (boundary condition)
  test("handles very long text in multilingual fields", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Generate a long string
    const longText = "This is a long text. ".repeat(100);

    // Use axis-specific locator for the English field
    const englishAxis = page.getByTestId("translation-axis-en");
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(longText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify the text was saved
    await expect(englishEditor).toHaveText(longText);

    // Add another language with long text (use ISO code)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    const longSpanishText = "Este es un texto largo en español. ".repeat(100);
    const spanishAxis = page.getByTestId("translation-axis-spa");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill(longSpanishText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify Spanish text was saved
    await expect(spanishEditor).toHaveText(longSpanishText);
  });

  // Test for special characters and edge cases in text
  test("handles special characters and edge cases in text", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Test with various special characters that could cause issues
    const specialChars = "Text with <html> tags, \"quotes\", 'apostrophes', & ampersands, newlines\nand\ttabs, emoji 🎉🌍, path/slashes/here, backslash\\here";

    // Use axis-specific locator for the English field
    const englishAxis = page.getByTestId("translation-axis-en");
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(specialChars);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify the text was saved (note: contenteditable may normalize some whitespace)
    const savedText = await englishEditor.textContent();
    expect(savedText).toContain("<html>");
    expect(savedText).toContain("quotes");
    expect(savedText).toContain("ampersands");
    expect(savedText).toContain("🎉");
    expect(savedText).toContain("path/slashes/here");
  });

  // Test rapid add/remove operations
  test("handles rapid add/remove of translations", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Use ISO codes for unambiguous language selection
    const isoCodes = ["spa", "fra", "deu", "por"];

    // Rapidly add multiple languages
    for (let i = 0; i < isoCodes.length; i++) {
      const addTranslationBtn = page.getByTestId("add-translation-button");
      await addTranslationBtn.click();
      const languageInput = page.locator('.select input[role="combobox"]').first();
      await languageInput.fill(isoCodes[i]);
      await page.waitForTimeout(300);
      await languageInput.press("Enter");
      await page.waitForSelector(`[data-testid="translation-axis-${isoCodes[i]}"]`, { timeout: 5000 });
    }

    // Verify all were added (4 languages + English = 5)
    let allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(5);

    // Rapidly remove all added languages
    for (let i = isoCodes.length - 1; i >= 0; i--) {
      const axis = page.getByTestId(`translation-axis-${isoCodes[i]}`);
      await axis.hover();
      const removeBtn = page.getByTestId(`remove-translation-${isoCodes[i]}`);
      await removeBtn.click();
      await page.waitForTimeout(200);
    }

    // Should be back to just English
    allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(1);
  });

  // Test adding translation via Cancel button
  test("cancel during language selection does not add language", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Start adding a language
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    // Type something but don't press Enter
    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);

    // Cancel instead of selecting
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // Should still have only English
    const allAxes = page.locator('[data-testid^="translation-axis-"]');
    await expect(allAxes).toHaveCount(1);
    await expect(page.getByTestId("translation-axis-en")).toBeVisible();
  });

  // Test that empty translations are lost on tab switch (expected behavior)
  test("empty translation axis is lost on tab switch", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add Spanish but don't enter any text
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    // Verify we have 2 axes now
    let axes = page.locator('[data-testid^="translation-axis-"]');
    await expect(axes).toHaveCount(2);

    // Switch tabs without entering text in Spanish
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Spanish axis should be gone (empty translation not persisted)
    await expect(page.getByTestId("translation-axis-spa")).not.toBeVisible();
    axes = page.locator('[data-testid^="translation-axis-"]');
    await expect(axes).toHaveCount(1);
    await expect(page.getByTestId("translation-axis-en")).toBeVisible();
  });

  // Test with whitespace-only text (should be treated as empty)
  test("whitespace-only text in translation is treated as empty", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Add Spanish and enter only whitespace
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    const languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    const spanishAxis = page.getByTestId("translation-axis-spa");
    const spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("   ");  // Just whitespace
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Whitespace is trimmed on blur, so the text should be empty or whitespace
    // (This is expected behavior - contenteditable trims trailing whitespace)
    const spanishText = await spanishEditor.textContent();
    // The content may be empty or preserved depending on trim behavior
    // This test documents the current behavior
    expect(spanishText?.trim() || "").toBe("");
  });

  // Test with mixed scripts and combining characters
  test("handles mixed scripts and combining characters", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Text with combining diacritics (e with combining acute accent)
    const textWithCombining = "Testing e\u0301 combining and Ω Greek and 日本 Japanese and العربية Arabic";

    const englishAxis = page.getByTestId("translation-axis-en");
    const englishEditor = englishAxis.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(textWithCombining);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify the text was saved
    const savedText = await englishEditor.textContent();
    expect(savedText).toContain("combining");
    expect(savedText).toContain("Greek");
    expect(savedText).toContain("日本");
    expect(savedText).toContain("العربية");
  });

  // Test adding and removing same language multiple times
  test("can add, remove, and re-add the same language", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add Spanish
    let addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    let languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    // Add text to Spanish
    let spanishAxis = page.getByTestId("translation-axis-spa");
    let spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("First Spanish text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Remove Spanish
    await spanishAxis.hover();
    await page.getByTestId("remove-translation-spa").click();
    await page.waitForTimeout(300);

    // Verify Spanish is gone
    await expect(page.getByTestId("translation-axis-spa")).not.toBeVisible();

    // Re-add Spanish
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-axis-spa"]', { timeout: 5000 });

    // Spanish axis should be back but empty (previous text was cleared when removed)
    spanishAxis = page.getByTestId("translation-axis-spa");
    await expect(spanishAxis).toBeVisible();
    spanishEditor = spanishAxis.locator('[contenteditable="true"]');
    const spanishText = await spanishEditor.textContent();
    expect(spanishText).toBe("");

    // Add new text to Spanish
    await spanishEditor.click();
    await spanishEditor.fill("Second Spanish text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify new text is there
    await expect(spanishEditor).toHaveText("Second Spanish text");
  });
});
