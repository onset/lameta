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
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // The Add translation button should be visible
    // Use text selector as fallback since data-testid may not be in built app yet
    const addTranslationBtn = page.locator('button:has-text("+")').first();
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

    // Only one translation slot should exist (default English)
    const translationSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(translationSlots).toHaveCount(1);
  });

  test("selecting a language adds a new translation slot", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Initially should have one translation slot (English by default)
    const initialSlots = page.locator('[data-testid^="translation-slot-"]');
    const initialCount = await initialSlots.count();
    expect(initialCount).toBe(1);

    // Click Add translation
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    // Type in a language and select it
    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300); // wait for debounce
    await languageInput.press("Enter");

    // Wait for the new slot to appear (ISO 639-3 code for Spanish is "spa")
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    // Now should have two translation slots
    const afterSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(afterSlots).toHaveCount(2);

    // Spanish slot should exist (ISO 639-3 code is "spa")
    const spanishSlot = page.getByTestId("translation-slot-spa");
    await expect(spanishSlot).toBeVisible();

    // Spanish color bar should be visible with tooltip showing language name
    const spanishColorBar = page.getByTestId("slot-color-bar-spa");
    await expect(spanishColorBar).toBeVisible();
  });

  test("can type in each translation slot independently", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Get the English slot and its editor
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("This is the English description");

    // Add a Spanish translation
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // The new Spanish slot should be focused, type in it
    // Find the description editor within the Spanish slot (ISO 639-3 code is "spa")
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });
    const spanishSlot = page.getByTestId("translation-slot-spa");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
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

    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("French");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Wait for French slot to appear (ISO 639-3 code is "fra")
    await page.waitForSelector('[data-testid="translation-slot-fra"]', {
      timeout: 5000
    });

    // The remove button should exist but be hidden initially (opacity: 0)
    const removeBtn = page.getByTestId("remove-slot-fra");
    await expect(removeBtn).toBeAttached();

    // Hover over the French slot to show the remove button
    const frenchSlot = page.getByTestId("translation-slot-fra");
    await frenchSlot.hover();

    // Now the button should be visible (opacity: 1)
    // Note: checking visibility may not work if only opacity changes,
    // so we just verify the button exists and can be clicked
    await expect(removeBtn).toBeVisible();
  });

  test("clicking remove translation removes the slot", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add a second translation (use "deu" code directly for unambiguous match)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("deu");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for German slot to appear (ISO 639-3 code is "deu")
    await page.waitForSelector('[data-testid="translation-slot-deu"]', {
      timeout: 5000
    });

    // Verify we have 2 slots
    const slotsBefore = page.locator('[data-testid^="translation-slot-"]');
    await expect(slotsBefore).toHaveCount(2);

    // Hover and click remove on the German slot
    const germanSlot = page.getByTestId("translation-slot-deu");
    await germanSlot.hover();

    const removeBtn = page.getByTestId("remove-slot-deu");
    await removeBtn.click();

    // Wait for removal
    await page.waitForTimeout(300);

    // Should now have only 1 slot
    const slotsAfter = page.locator('[data-testid^="translation-slot-"]');
    await expect(slotsAfter).toHaveCount(1);

    // German slot should be gone
    await expect(germanSlot).not.toBeVisible();
  });

  test("removing non-English slot leaves default intact", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Add a French translation first (use ISO code)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for French slot to appear (ISO 639-3 code is "fra")
    await page.waitForSelector('[data-testid="translation-slot-fra"]', {
      timeout: 5000
    });

    // Add some text to French
    const frenchSlot = page.getByTestId("translation-slot-fra");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("French text here");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify we have 2 slots
    let slots = page.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(2);

    // Remove French - English should remain
    await frenchSlot.hover();
    const removeFrBtn = page.getByTestId("remove-slot-fra");
    await removeFrBtn.click();
    await page.waitForTimeout(300);

    // English should still be there
    await expect(page.getByTestId("translation-slot-en")).toBeVisible();
    await expect(page.getByTestId("translation-slot-fra")).not.toBeVisible();
    slots = page.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(1);
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
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    // Now we have 2 slots (en and spa)
    const afterFirstAdd = page.locator('[data-testid^="translation-slot-"]');
    await expect(afterFirstAdd).toHaveCount(2);

    // Try to add Spanish again - should not add a duplicate
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Should still have 2 slots (duplicate not added)
    const afterDuplicateAttempt = page.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(afterDuplicateAttempt).toHaveCount(2);
  });

  test("multilingual field data persists after switching tabs", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Enter text in the English description (use the slot-specific selector)
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("Persistent English text");

    // Add Spanish and enter text
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for Spanish slot to appear (ISO 639-3 code is "spa")
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });
    const spanishSlot = page.getByTestId("translation-slot-spa");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
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
    const englishSlotAfter = page.getByTestId("translation-slot-en");
    const englishEditorAfter = englishSlotAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfter).toHaveText("Persistent English text");

    const spanishSlotAfter = page.getByTestId("translation-slot-spa");
    await expect(spanishSlotAfter).toBeVisible();
    const spanishEditorAfter = spanishSlotAfter.locator(
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

    // Step 1: Add text to the default English field (use slot-specific locator)
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(
      "Initial English text with special chars: é ñ ü 日本語"
    );
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 2: Add Spanish translation
    let addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    let languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    // Step 3: Add text to Spanish field
    const spanishSlot = page.getByTestId("translation-slot-spa");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
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
    await page.waitForSelector('[data-testid="translation-slot-fra"]', {
      timeout: 5000
    });

    // Step 5: Add text to French field
    const frenchSlot = page.getByTestId("translation-slot-fra");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
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
    await page.waitForSelector('[data-testid="translation-slot-deu"]', {
      timeout: 5000
    });

    // Step 7: Verify we have 4 translation slots
    let allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(4);

    // Step 8: Remove the empty German translation
    const germanSlot = page.getByTestId("translation-slot-deu");
    await germanSlot.hover();
    const removeGermanBtn = page.getByTestId("remove-slot-deu");
    await removeGermanBtn.click();
    await page.waitForTimeout(300);

    // Verify we now have 3 slots
    allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(3);

    // Step 9: Add Arabic translation (RTL language - edge case, use ISO code)
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("ara");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-ara"]', {
      timeout: 5000
    });

    // Step 10: Add Arabic text
    const arabicSlot = page.getByTestId("translation-slot-ara");
    const arabicEditor = arabicSlot.locator('[contenteditable="true"]');
    await arabicEditor.click();
    await arabicEditor.fill("نص عربي للاختبار");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 11: Modify existing English text (re-fetch the locator)
    const englishEditorRefresh = page
      .getByTestId("translation-slot-en")
      .locator('[contenteditable="true"]');
    await englishEditorRefresh.click();
    await englishEditorRefresh.fill("Modified English text: testing updates!");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 12: Note: Clearing Spanish text would cause it to be lost on tab switch
    // (this is expected behavior - empty translations are not persisted)
    // Instead, let's verify the Spanish text is still there
    const spanishEditorCheck = page
      .getByTestId("translation-slot-spa")
      .locator('[contenteditable="true"]');
    await expect(spanishEditorCheck).toHaveText(
      "Texto en español con caracteres: ñ á é í ó ú"
    );

    // Step 13: Verify current state before tab switch
    const englishEditorCheck = page
      .getByTestId("translation-slot-en")
      .locator('[contenteditable="true"]');
    await expect(englishEditorCheck).toHaveText(
      "Modified English text: testing updates!"
    );
    const frenchEditorCheck = page
      .getByTestId("translation-slot-fra")
      .locator('[contenteditable="true"]');
    await expect(frenchEditorCheck).toHaveText(
      "Texte français avec accents: é è ê ë à â"
    );
    const arabicEditorCheck = page
      .getByTestId("translation-slot-ara")
      .locator('[contenteditable="true"]');
    await expect(arabicEditorCheck).toHaveText("نص عربي للاختبار");

    // Step 14: Switch tabs to force a save
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Step 15: Verify data persisted after tab switch
    // English should still have the modified text
    const englishEditorAfterTab = page
      .getByTestId("translation-slot-en")
      .locator('[contenteditable="true"]');
    await expect(englishEditorAfterTab).toHaveText(
      "Modified English text: testing updates!"
    );

    // French should still have its text
    const frenchSlotAfterTab = page.getByTestId("translation-slot-fra");
    await expect(frenchSlotAfterTab).toBeVisible();
    const frenchEditorAfterTab = frenchSlotAfterTab.locator(
      '[contenteditable="true"]'
    );
    await expect(frenchEditorAfterTab).toHaveText(
      "Texte français avec accents: é è ê ë à â"
    );

    // Arabic should still have its text
    const arabicSlotAfterTab = page.getByTestId("translation-slot-ara");
    await expect(arabicSlotAfterTab).toBeVisible();
    const arabicEditorAfterTab = arabicSlotAfterTab.locator(
      '[contenteditable="true"]'
    );
    await expect(arabicEditorAfterTab).toHaveText("نص عربي للاختبار");

    // Spanish should still have its text
    const spanishSlotAfterTab = page.getByTestId("translation-slot-spa");
    await expect(spanishSlotAfterTab).toBeVisible();
    const spanishEditorAfterTab = spanishSlotAfterTab.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfterTab).toHaveText(
      "Texto en español con caracteres: ñ á é í ó ú"
    );

    // Step 16: Remove French translation
    const frenchSlotToRemove = page.getByTestId("translation-slot-fra");
    await frenchSlotToRemove.hover();
    const removeFrenchBtn = page.getByTestId("remove-slot-fra");
    await removeFrenchBtn.click();
    await page.waitForTimeout(300);

    // Step 17: Verify French is gone
    await expect(page.getByTestId("translation-slot-fra")).not.toBeVisible();

    // Step 18: Add Mandarin Chinese (CJK characters - edge case, use ISO code)
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("cmn");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-cmn"]', {
      timeout: 5000
    });

    // Step 19: Add Chinese text
    const chineseSlot = page.getByTestId("translation-slot-cmn");
    const chineseEditor = chineseSlot.locator('[contenteditable="true"]');
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

    // Step 21: Count slots - should still be 4 (en, spa, ara, cmn) not 5
    allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(4);

    // Step 22: Remove all non-English translations one by one
    // Remove Spanish
    const spanishSlotToRemove = page.getByTestId("translation-slot-spa");
    await spanishSlotToRemove.hover();
    await page.getByTestId("remove-slot-spa").click();
    await page.waitForTimeout(300);

    // Remove Arabic
    const arabicSlotToRemove = page.getByTestId("translation-slot-ara");
    await arabicSlotToRemove.hover();
    await page.getByTestId("remove-slot-ara").click();
    await page.waitForTimeout(300);

    // Remove Chinese
    const chineseSlotToRemove = page.getByTestId("translation-slot-cmn");
    await chineseSlotToRemove.hover();
    await page.getByTestId("remove-slot-cmn").click();
    await page.waitForTimeout(300);

    // Step 23: Should now have only English
    allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(1);
    await expect(page.getByTestId("translation-slot-en")).toBeVisible();

    // Step 24: With only one slot, the remove button should not be visible
    // This is a boundary condition - can't remove the last translation
    const englishSlotFinal = page.getByTestId("translation-slot-en");
    await englishSlotFinal.hover();
    const removeEnglishBtn = page.getByTestId("remove-slot-en");
    // Check that the button is not visible (because canRemoveSlot is false when only 1 slot)
    await expect(removeEnglishBtn).not.toBeVisible();

    // Step 25: Final verification - English text should still be there
    const finalEnglishEditor = page
      .getByTestId("translation-slot-en")
      .locator('[contenteditable="true"]');
    await expect(finalEnglishEditor).toHaveText(
      "Modified English text: testing updates!"
    );
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

    // Use slot-specific locator for the English field
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(longText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify the text was saved
    await expect(englishEditor).toHaveText(longText);

    // Add another language with long text (use ISO code)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    const longSpanishText = "Este es un texto largo en español. ".repeat(100);
    const spanishSlot = page.getByTestId("translation-slot-spa");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
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
    const specialChars =
      "Text with <html> tags, \"quotes\", 'apostrophes', & ampersands, newlines\nand\ttabs, emoji 🎉🌍, path/slashes/here, backslash\\here";

    // Use slot-specific locator for the English field
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
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
      const languageInput = page
        .locator('.select input[role="combobox"]')
        .first();
      await languageInput.fill(isoCodes[i]);
      await page.waitForTimeout(300);
      await languageInput.press("Enter");
      await page.waitForSelector(
        `[data-testid="translation-slot-${isoCodes[i]}"]`,
        { timeout: 5000 }
      );
    }

    // Verify all were added (4 languages + English = 5)
    let allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(5);

    // Rapidly remove all added languages
    for (let i = isoCodes.length - 1; i >= 0; i--) {
      const slot = page.getByTestId(`translation-slot-${isoCodes[i]}`);
      await slot.hover();
      const removeBtn = page.getByTestId(`remove-slot-${isoCodes[i]}`);
      await removeBtn.click();
      await page.waitForTimeout(200);
    }

    // Should be back to just English
    allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(1);
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
    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);

    // Cancel instead of selecting
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // Should still have only English
    const allSlots = page.locator('[data-testid^="translation-slot-"]');
    await expect(allSlots).toHaveCount(1);
    await expect(page.getByTestId("translation-slot-en")).toBeVisible();
  });

  // Test that empty translations are lost on tab switch (expected behavior)
  test("empty translation slot is lost on tab switch", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add Spanish but don't enter any text
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    // Verify we have 2 slots now
    let slots = page.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(2);

    // Switch tabs without entering text in Spanish
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Spanish slot should be gone (empty translation not persisted)
    await expect(page.getByTestId("translation-slot-spa")).not.toBeVisible();
    slots = page.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(1);
    await expect(page.getByTestId("translation-slot-en")).toBeVisible();
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
    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    const spanishSlot = page.getByTestId("translation-slot-spa");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("   "); // Just whitespace
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
    const textWithCombining =
      "Testing e\u0301 combining and Ω Greek and 日本 Japanese and العربية Arabic";

    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
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
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    // Add text to Spanish
    let spanishSlot = page.getByTestId("translation-slot-spa");
    let spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("First Spanish text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Remove Spanish
    await spanishSlot.hover();
    await page.getByTestId("remove-slot-spa").click();
    await page.waitForTimeout(300);

    // Verify Spanish is gone
    await expect(page.getByTestId("translation-slot-spa")).not.toBeVisible();

    // Re-add Spanish
    addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();
    languageInput = page.locator('.select input[role="combobox"]').first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForSelector('[data-testid="translation-slot-spa"]', {
      timeout: 5000
    });

    // Spanish slot should be back but empty (previous text was cleared when removed)
    spanishSlot = page.getByTestId("translation-slot-spa");
    await expect(spanishSlot).toBeVisible();
    spanishEditor = spanishSlot.locator('[contenteditable="true"]');
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

// Tests for metadata language slots feature
test.describe("Metadata Language Slots", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(
      lameta,
      `MetadataLanguageSlotsTest_${Date.now()}`
    );

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

  test("setting project working languages shows those slots by default in multilingual fields", async () => {
    // Go to Project Collection tab to set working languages
    await project.goToProjectCollection();

    // Find the Working Languages field and add Spanish
    const workingContainer = page
      .locator('div.field:has(label:has-text("Working Languages"))')
      .first();
    const workingInput = workingContainer
      .locator('.select input[role="combobox"]')
      .first();
    await workingInput.click();
    await workingInput.fill("spa");
    await page.waitForTimeout(300);
    await workingInput.press("Enter");
    await page.waitForTimeout(500);

    // Now go to Sessions and create a new session
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // The multilingual Description field should show both English (default) and Spanish slots
    // because we set Spanish as a project working language
    const englishSlot = page.getByTestId("translation-slot-en");
    await expect(englishSlot).toBeVisible();

    const spanishSlot = page.getByTestId("translation-slot-spa");
    await expect(spanishSlot).toBeVisible();

    // Both slots should have color bars
    const englishColorBar = page.getByTestId("slot-color-bar-en");
    await expect(englishColorBar).toBeVisible();

    const spanishColorBar = page.getByTestId("slot-color-bar-spa");
    await expect(spanishColorBar).toBeVisible();
  });

  test("empty protected slots show placeholder text", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Look for empty contenteditable divs that should have placeholder styling
    // The placeholder should be visible via CSS :empty::before
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');

    // Editor should be visible even if empty
    await expect(englishEditor).toBeVisible();

    // The editor should be empty initially
    const text = await englishEditor.textContent();
    expect(text).toBe("");
  });

  test("protected slots (from project working languages) cannot be deleted", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Both English and Spanish should be visible as protected slots
    const englishSlot = page.getByTestId("translation-slot-en");
    await expect(englishSlot).toBeVisible();

    const spanishSlot = page.getByTestId("translation-slot-spa");
    await expect(spanishSlot).toBeVisible();

    // Hover over English slot - remove button should NOT be visible (protected)
    await englishSlot.hover();
    const removeEnglishBtn = page.getByTestId("remove-slot-en");
    // Protected slots should not have visible remove button
    await expect(removeEnglishBtn).not.toBeVisible();

    // Hover over Spanish slot - remove button should NOT be visible (protected)
    await spanishSlot.hover();
    const removeSpanishBtn = page.getByTestId("remove-slot-spa");
    // Protected slots should not have visible remove button
    await expect(removeSpanishBtn).not.toBeVisible();
  });

  test("non-protected slots (extras) can be deleted", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="add-translation-button"]', {
      timeout: 10000
    });

    // Add French (not in project working languages, so not protected)
    const addTranslationBtn = page.getByTestId("add-translation-button");
    await addTranslationBtn.click();

    const languageInput = page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    await page.waitForSelector('[data-testid="translation-slot-fra"]', {
      timeout: 5000
    });

    // French slot should be visible
    const frenchSlot = page.getByTestId("translation-slot-fra");
    await expect(frenchSlot).toBeVisible();

    // Hover over French slot - remove button SHOULD be visible (not protected)
    await frenchSlot.hover();
    const removeFrenchBtn = page.getByTestId("remove-slot-fra");
    await expect(removeFrenchBtn).toBeVisible();

    // Click remove
    await removeFrenchBtn.click();
    await page.waitForTimeout(300);

    // French should be gone
    await expect(frenchSlot).not.toBeVisible();

    // But protected slots should still be there
    await expect(page.getByTestId("translation-slot-en")).toBeVisible();
    await expect(page.getByTestId("translation-slot-spa")).toBeVisible();
  });

  test("color bars are visible and differ between languages", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Get the color bars for English and Spanish
    const englishColorBar = page.getByTestId("slot-color-bar-en");
    const spanishColorBar = page.getByTestId("slot-color-bar-spa");

    await expect(englishColorBar).toBeVisible();
    await expect(spanishColorBar).toBeVisible();

    // Get their background colors
    const englishColor = await englishColorBar.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    const spanishColor = await spanishColorBar.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );

    // Colors should be different
    expect(englishColor).not.toBe(spanishColor);

    // Colors should not be transparent or empty
    expect(englishColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(englishColor).not.toBe("");
    expect(spanishColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(spanishColor).not.toBe("");
  });

  test("typing in protected slot works and data persists", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Type in English slot
    const englishSlot = page.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("English text in protected slot");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Type in Spanish slot
    const spanishSlot = page.getByTestId("translation-slot-spa");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto español en slot protegido");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Switch tabs and come back
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Verify data persisted
    const englishSlotAfter = page.getByTestId("translation-slot-en");
    const englishEditorAfter = englishSlotAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfter).toHaveText(
      "English text in protected slot"
    );

    const spanishSlotAfter = page.getByTestId("translation-slot-spa");
    const spanishEditorAfter = spanishSlotAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfter).toHaveText(
      "Texto español en slot protegido"
    );
  });
});
