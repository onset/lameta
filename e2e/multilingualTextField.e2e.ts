import { test, expect, Page, Locator } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import {
  getDescriptionField,
  getDescriptionSlots,
  getDescriptionSlot,
  getDescriptionColorBar,
  getDescriptionEditor,
  hoverOverDescriptionField,
  addLanguageViaMenu,
  deleteLanguageFromDescription,
  typeInSlotAndBlur,
  fillLanguageChooserAndSelect
} from "./multilingualTextField-e2e-helpers";

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

    // Set up Working Languages with BOTH English AND Spanish
    // (multilingual UI only shows when there are 2+ metadata slots)
    await project.goToProjectLanguages();
    const workingContainer = page
      .locator('.field:has(label:has-text("Working Languages"))')
      .first();
    await workingContainer.waitFor({ state: "visible", timeout: 10000 });
    const workingInput = workingContainer
      .locator('.select input[role="combobox"]')
      .first();
    // Add English first
    await workingInput.click();
    await fillLanguageChooserAndSelect(page, workingInput, "eng");
    // Add Spanish second
    await workingInput.click();
    await fillLanguageChooserAndSelect(page, workingInput, "spa");
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("multilingual description field shows color bar menu with Add option", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for the session form to load - look for the Description label
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to the Description field to avoid multiple multilingual fields
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // The "Add language slot" menu item should be visible
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await expect(addLanguageMenuItem).toBeVisible();

    // Close the menu
    await page.keyboard.press("Escape");
  });

  test("clicking Add language slot menu item shows language chooser", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Click "Add language slot" menu item
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await expect(addLanguageMenuItem).toBeVisible();
    await addLanguageMenuItem.click();

    // Wait for menu to close
    await page.locator(".MuiMenu-root").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});

    // Cancel button should now be visible
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // A language selector input should be visible (from SingleLanguageChooser)
    const languageInput = getDescriptionField(page).locator(
      '.select input[role="combobox"]'
    );
    await expect(languageInput.first()).toBeVisible();
  });

  test("clicking Cancel hides language chooser without adding", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Click "Add language slot" menu item
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await addLanguageMenuItem.click();

    // Wait for menu to close
    await page.locator(".MuiMenu-root").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});

    // Cancel button should be visible
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // Click cancel
    await cancelBtn.click();

    // After cancel, Cancel button should be hidden
    await expect(cancelBtn).not.toBeVisible();

    // Should have 2 translation slots (English and Spanish from beforeAll setup)
    const translationSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(translationSlots).toHaveCount(2);
  });

  test("selecting a language adds a new translation slot", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to the Description field
    const descriptionField = getDescriptionField(page);

    // Initially should have 2 translation slots (English and Spanish from beforeAll setup)
    const initialSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    const initialCount = await initialSlots.count();
    expect(initialCount).toBe(2);

    // Add French via menu (clicking on English color bar)
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Now should have 3 translation slots in Description field
    const afterSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(afterSlots).toHaveCount(3);

    // French slot should exist (BCP47 code is "fr")
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    await expect(frenchSlot).toBeVisible();

    // French color bar should be visible
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await expect(frenchColorBar).toBeVisible();
  });

  test("can type in each translation slot independently", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = getDescriptionField(page);

    // Get the English slot and its editor in Description field
    const englishSlot = descriptionField.getByTestId("translation-slot-en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("This is the English description");

    // Spanish slot already exists from beforeAll setup - just type in it
    const spanishSlot = descriptionField.getByTestId("translation-slot-es");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Esta es la descripción en español");

    // Verify both translations have their text
    await expect(englishEditor).toHaveText("This is the English description");
    await expect(spanishEditor).toHaveText("Esta es la descripción en español");
  });

  test("color bar menu allows deleting non-protected slots", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = getDescriptionField(page);

    // Add French via menu (English and Spanish are already set up in beforeAll)
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Click the French color bar to open menu
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await expect(frenchColorBar).toBeVisible();
    await frenchColorBar.click();

    // Menu should be visible with language name and delete option
    const deleteMenuItem = page.getByTestId("delete-slot-menu-fr");
    await expect(deleteMenuItem).toBeVisible();
    // Delete should be enabled for non-protected slots
    await expect(deleteMenuItem).toBeEnabled();

    // Close the menu so it doesn't interfere with subsequent tests
    await page.keyboard.press("Escape");
  });

  test("clicking delete in menu removes the slot", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = getDescriptionField(page);

    // Add German via menu
    await addLanguageViaMenu(page, "en", "deu", "de");

    // Verify we have 3 slots in Description (en, es from beforeAll + de)
    const slotsBefore = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(slotsBefore).toHaveCount(3);

    // Click color bar to open menu and delete the German slot
    const germanColorBar = descriptionField.getByTestId("slot-color-bar-de");
    await germanColorBar.click();

    const deleteMenuItem = page.getByTestId("delete-slot-menu-de");
    await deleteMenuItem.click();

    // Wait for German slot to disappear
    await descriptionField.getByTestId("translation-slot-de").waitFor({ state: "hidden" });

    // Close any residual MUI menu that might be covering the UI
    await page.keyboard.press("Escape");

    // Should now have 2 slots in Description (en, es)
    const slotsAfter = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(slotsAfter).toHaveCount(2);

    // German slot should be gone
    const germanSlot = descriptionField.getByTestId("translation-slot-de");
    await expect(germanSlot).not.toBeVisible();
  });

  test("'Add language slot' menu item opens language chooser", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to the Description field to avoid multiple multilingual fields
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );

    // First verify English slot exists in this field
    const englishSlot = descriptionField.getByTestId("translation-slot-en");
    await expect(englishSlot).toBeVisible();

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Click "Add language slot" menu item
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await expect(addLanguageMenuItem).toBeVisible();
    await addLanguageMenuItem.click();

    // Wait for MUI menu to disappear
    await page.locator(".MuiMenu-root").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});

    // The language chooser should now be visible (Cancel button is a good indicator)
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // A language selector input should be visible (from SingleLanguageChooser)
    const languageInput = descriptionField.locator(
      '.select input[role="combobox"]'
    );
    await expect(languageInput.first()).toBeVisible();

    // Select a language to add using ISO code for unambiguous matching
    await fillLanguageChooserAndSelect(page, languageInput.first(), "fra");

    // Wait for French slot to appear (BCP47 code is "fr")
    await descriptionField.getByTestId("translation-slot-fr").waitFor({
      timeout: 5000
    });

    // Verify French was added in the Description field
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    await expect(frenchSlot).toBeVisible();

    // Should now have 3 slots in the Description field (en, es from beforeAll + fr)
    const slots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(slots).toHaveCount(3);
  });

  test("removing non-English slot leaves default intact", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = getDescriptionField(page);

    // Add French via menu
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Add some text to French
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("French text here");
    await page.keyboard.press("Tab");

    // Verify we have 3 slots in Description (en, es from beforeAll + fr)
    let slots = descriptionField.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(3);

    // Remove French via color bar menu - English and Spanish should remain
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await frenchColorBar.click();
    const deleteFrBtn = page.getByTestId("delete-slot-menu-fr");
    await deleteFrBtn.click();
    // Wait for French slot to disappear (DOM-based wait)
    await descriptionField.getByTestId("translation-slot-fr").waitFor({ state: "hidden" });

    // English and Spanish should still be there
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();
    slots = descriptionField.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(2);
  });

  test("cannot add duplicate language translation", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = getDescriptionField(page);

    // We already have en and es from beforeAll - verify we have 2 slots
    const initialSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(initialSlots).toHaveCount(2);

    // Add French first
    await addLanguageViaMenu(page, "en", "fra", "fr");
    
    // Now we have 3 slots (en, es, fr)
    await expect(
      descriptionField.locator('[data-testid^="translation-slot-"]')
    ).toHaveCount(3);

    // Try to add French again via menu - should not add a duplicate
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await frenchColorBar.click();
    const addMenuItem = page.getByTestId("add-language-slot-menu-fr");
    await addMenuItem.click();
    
    // Wait for menu to close
    await page.locator(".MuiMenu-root").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    
    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("French");
    // Wait for dropdown to appear before pressing Enter (may not appear if duplicate detected)
    try {
      await page.locator(".select__menu").waitFor({ state: "visible", timeout: 2000 });
    } catch {
      // Dropdown may not appear - continue anyway
    }
    await languageInput.press("Enter");

    // Should still have 3 slots (no duplicate added)
    await expect(
      descriptionField.locator('[data-testid^="translation-slot-"]')
    ).toHaveCount(3);
  });

  test("multilingual field data persists after switching tabs", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Enter text in the English description (use the slot-specific selector)
    const englishSlot = getDescriptionSlot(page, "en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("Persistent English text");

    // Spanish slot already exists from beforeAll - just enter text
    const spanishSlot = getDescriptionSlot(page, "es");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto persistente en español");

    // Blur to ensure save
    await page.keyboard.press("Tab");

    // Switch to Notes tab and back
    await project.goToNotesOfThisSession();

    // Go back to Session tab (use exact match to avoid matching Sessions tab)
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    // Wait for Description field to be visible after tab switch
    await page.waitForSelector('[data-testid="field-description-edit"]');

    // Verify the translations are still there
    const englishSlotAfter = getDescriptionSlot(page, "en");
    const englishEditorAfter = englishSlotAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfter).toHaveText("Persistent English text");

    const spanishSlotAfter = getDescriptionSlot(page, "es");
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
    // Note: English and Spanish are already set up from beforeAll
    const englishSlot = getDescriptionSlot(page, "en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(
      "Initial English text with special chars: é ñ ü 日本語"
    );
    await page.keyboard.press("Tab");

    // Step 2: Add text to Spanish field (already exists from beforeAll)
    const spanishSlot = getDescriptionSlot(page, "es");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto en español con caracteres: ñ á é í ó ú");
    await page.keyboard.press("Tab");

    // Step 3: Add French translation via menu
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Step 4: Add text to French field
    const frenchSlot = getDescriptionSlot(page, "fr");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("Texte français avec accents: é è ê ë à â");
    await page.keyboard.press("Tab");

    // Step 5: Add German translation but leave it empty via menu
    await addLanguageViaMenu(page, "en", "deu", "de");

    // Step 6: Verify we have 4 translation slots (en, es, fr, de)
    let allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(4);

    // Step 7: Remove the empty German translation via color bar menu
    const germanColorBar = getDescriptionColorBar(page, "de");
    await germanColorBar.click();
    const deleteGermanBtn = page.getByTestId("delete-slot-menu-de");
    await deleteGermanBtn.click();
    // Wait for German slot to disappear
    await getDescriptionSlot(page, "de").waitFor({ state: "hidden" });

    // Verify we now have 3 slots (en, es, fr)
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(3);

    // Step 8: Add Arabic translation via menu (RTL language - edge case)
    // Note: 'ara' normalizes to 'ar' since Arabic has a 2-letter BCP47 code
    await addLanguageViaMenu(page, "en", "ara", "ar");

    // Step 10: Add Arabic text
    const arabicSlot = getDescriptionSlot(page, "ar");
    const arabicEditor = arabicSlot.locator('[contenteditable="true"]');
    await arabicEditor.click();
    await arabicEditor.fill("نص عربي للاختبار");
    await page.keyboard.press("Tab");

    // Step 11: Modify existing English text (re-fetch the locator)
    const englishEditorRefresh = getDescriptionSlot(page, "en").locator(
      '[contenteditable="true"]'
    );
    await englishEditorRefresh.click();
    await englishEditorRefresh.fill("Modified English text: testing updates!");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 12: Note: Clearing Spanish text would cause it to be lost on tab switch
    // (this is expected behavior - empty translations are not persisted)
    // Instead, let's verify the Spanish text is still there
    const spanishEditorCheck = getDescriptionSlot(page, "es").locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorCheck).toHaveText(
      "Texto en español con caracteres: ñ á é í ó ú"
    );

    // Step 13: Verify current state before tab switch
    const englishEditorCheck = getDescriptionSlot(page, "en").locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorCheck).toHaveText(
      "Modified English text: testing updates!"
    );
    const frenchEditorCheck = getDescriptionSlot(page, "fr").locator(
      '[contenteditable="true"]'
    );
    await expect(frenchEditorCheck).toHaveText(
      "Texte français avec accents: é è ê ë à â"
    );
    const arabicEditorCheck = getDescriptionSlot(page, "ar").locator(
      '[contenteditable="true"]'
    );
    await expect(arabicEditorCheck).toHaveText("نص عربي للاختبار");

    // Step 14: Switch tabs to force a save
    await project.goToNotesOfThisSession();
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    // Wait for Description field to be visible after tab switch
    await page.waitForSelector('[data-testid="field-description-edit"]');

    // Step 15: Verify data persisted after tab switch
    // English should still have the modified text
    const englishEditorAfterTab = getDescriptionSlot(page, "en").locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfterTab).toHaveText(
      "Modified English text: testing updates!"
    );

    // French should still have its text
    const frenchSlotAfterTab = getDescriptionSlot(page, "fr");
    await expect(frenchSlotAfterTab).toBeVisible();
    const frenchEditorAfterTab = frenchSlotAfterTab.locator(
      '[contenteditable="true"]'
    );
    await expect(frenchEditorAfterTab).toHaveText(
      "Texte français avec accents: é è ê ë à â"
    );

    // Arabic should still have its text
    const arabicSlotAfterTab = getDescriptionSlot(page, "ar");
    await expect(arabicSlotAfterTab).toBeVisible();
    const arabicEditorAfterTab = arabicSlotAfterTab.locator(
      '[contenteditable="true"]'
    );
    await expect(arabicEditorAfterTab).toHaveText("نص عربي للاختبار");

    // Spanish should still have its text
    const spanishSlotAfterTab = getDescriptionSlot(page, "es");
    await expect(spanishSlotAfterTab).toBeVisible();
    const spanishEditorAfterTab = spanishSlotAfterTab.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfterTab).toHaveText(
      "Texto en español con caracteres: ñ á é í ó ú"
    );

    // Step 16: Remove French translation via color bar menu
    const frenchColorBarToRemove = getDescriptionColorBar(page, "fr");
    await frenchColorBarToRemove.click();
    const deleteFrenchBtn = page.getByTestId("delete-slot-menu-fr");
    await deleteFrenchBtn.click();
    // Wait for French slot to disappear
    await getDescriptionSlot(page, "fr").waitFor({ state: "hidden" });

    // Step 17: Verify French is gone
    await expect(getDescriptionSlot(page, "fr")).not.toBeVisible();

    // Step 18: Add Mandarin Chinese via menu (CJK characters - edge case)
    await addLanguageViaMenu(page, "en", "cmn", "cmn");

    // Step 19: Add Chinese text
    const chineseSlot = getDescriptionSlot(page, "cmn");
    const chineseEditor = chineseSlot.locator('[contenteditable="true"]');
    await chineseEditor.click();
    await chineseEditor.fill("中文测试文本，包含特殊字符：！@#￥%");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 20: Attempt to add duplicate language (should not add)
    // Note: We try to add 'ara' again, which normalizes to 'ar' - should be detected as duplicate
    const arabicColorBar = getDescriptionColorBar(page, "ar");
    await arabicColorBar.click();
    const addMenuItemForDup = page.getByTestId("add-language-slot-menu-ar");
    await addMenuItemForDup.click();
    
    // Wait for menu to close
    await page.locator(".MuiMenu-root").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});
    
    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("ara");
    // Wait for dropdown to appear before pressing Enter (may not appear if duplicate detected)
    try {
      await page.locator(".select__menu").waitFor({ state: "visible", timeout: 2000 });
    } catch {
      // Dropdown may not appear - continue anyway
    }
    await languageInput.press("Enter");

    // Step 21: Count slots - should still be 4 (en, es, ar, cmn) not 5
    // (Duplicate detection should prevent adding ara again since it maps to 'ar')
    await expect(getDescriptionSlots(page)).toHaveCount(4);

    // Step 22: Remove all non-protected translations via color bar menu
    // Note: English and Spanish are protected slots (set up in beforeAll), so we can't delete them
    // Remove Arabic
    await getDescriptionColorBar(page, "ar").click();
    await page.getByTestId("delete-slot-menu-ar").click();
    await getDescriptionSlot(page, "ar").waitFor({ state: "hidden" });

    // Remove Chinese
    await getDescriptionColorBar(page, "cmn").click();
    await page.getByTestId("delete-slot-menu-cmn").click();
    await getDescriptionSlot(page, "cmn").waitFor({ state: "hidden" });

    // Step 23: Should now have English and Spanish (the protected slots)
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(2);
    await expect(getDescriptionSlot(page, "en")).toBeVisible();
    await expect(getDescriptionSlot(page, "es")).toBeVisible();

    // Step 24: Protected slots should have delete menu item disabled
    const englishColorBarFinal = getDescriptionColorBar(page, "en");
    await englishColorBarFinal.click();
    const deleteEnglishBtn = page.getByTestId("delete-slot-menu-en");
    // Check that the delete is disabled (because it's a protected slot)
    await expect(deleteEnglishBtn).toBeDisabled();
    // Close the menu
    await page.keyboard.press("Escape");

    // Step 25: Final verification - English text should still be there
    const finalEnglishEditor = getDescriptionSlot(page, "en").locator(
      '[contenteditable="true"]'
    );
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
    const englishSlot = getDescriptionSlot(page, "en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(longText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify the text was saved
    await expect(englishEditor).toHaveText(longText);

    // Spanish slot already exists from beforeAll - add long text to it
    const longSpanishText = "Este es un texto largo en español. ".repeat(100);
    const spanishSlot = getDescriptionSlot(page, "es");
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
    const englishSlot = getDescriptionSlot(page, "en");
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

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Use ISO codes for selection, track matching BCP47 codes for selectors
    // Note: Spanish (es) is already set up as a working language in beforeAll
    const languages = [
      { iso: "fra", bcp: "fr" },
      { iso: "deu", bcp: "de" },
      { iso: "por", bcp: "pt" },
      { iso: "jpn", bcp: "ja" }
    ];

    // Rapidly add multiple languages via menu
    for (const language of languages) {
      await addLanguageViaMenu(page, "en", language.iso, language.bcp);
    }

    // Verify all were added (4 new languages + en, es from beforeAll = 6)
    let allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(6);

    // Rapidly remove all added languages via color bar menu
    for (let i = languages.length - 1; i >= 0; i--) {
      const { bcp } = languages[i];
      const slot = getDescriptionSlot(page, bcp);
      const colorBar = getDescriptionColorBar(page, bcp);
      await colorBar.click();
      const deleteBtn = page.getByTestId(`delete-slot-menu-${bcp}`);
      await deleteBtn.click();
      // Wait for slot to disappear
      await slot.waitFor({ state: "hidden" });
    }

    // Should be back to just English and Spanish (the working languages)
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(2);
  });

  // Test adding translation via Cancel button
  test("cancel during language selection does not add language", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Click English color bar to open menu
    const englishColorBar = getDescriptionColorBar(page, "en");
    await englishColorBar.click();
    
    // Click "Add language slot" menu item
    const addMenuItem = page.getByTestId("add-language-slot-menu-en");
    await addMenuItem.click();
    
    // Wait for menu to close
    await page.locator(".MuiMenu-root").waitFor({ state: "hidden", timeout: 3000 }).catch(() => {});

    // Type something but don't press Enter
    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("French"); // Use French since Spanish is already there
    // Wait for dropdown to appear so we're in a consistent state
    try {
      await page.locator(".select__menu").waitFor({ state: "visible", timeout: 2000 });
    } catch {
      // Dropdown may not appear - continue anyway
    }

    // Cancel instead of selecting
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await cancelBtn.click();
    // Wait for language chooser to disappear
    await cancelBtn.waitFor({ state: "hidden" });

    // Should still have English and Spanish (from beforeAll setup)
    const allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(2);
    await expect(getDescriptionSlot(page, "en")).toBeVisible();
    await expect(getDescriptionSlot(page, "es")).toBeVisible();
  });

  // Test that empty translations are lost on tab switch (expected behavior)
  test("empty translation slot is lost on tab switch", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Add French via menu but don't enter any text
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Verify we have 3 slots now (en, es from beforeAll + fr)
    let slots = getDescriptionSlots(page);
    await expect(slots).toHaveCount(3);

    // Switch tabs without entering text in French
    await project.goToNotesOfThisSession();
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    // Wait for Description field to be visible after tab switch
    await page.waitForSelector('[data-testid="field-description-edit"]');

    // French slot should be gone (empty translation not persisted)
    await expect(getDescriptionSlot(page, "fr")).not.toBeVisible();
    slots = getDescriptionSlots(page);
    await expect(slots).toHaveCount(2); // en, es remain
    await expect(getDescriptionSlot(page, "en")).toBeVisible();
    await expect(getDescriptionSlot(page, "es")).toBeVisible();
  });

  // Test with whitespace-only text (should be treated as empty)
  test("whitespace-only text in translation is treated as empty", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Add French via menu and enter only whitespace
    await addLanguageViaMenu(page, "en", "fra", "fr");

    const frenchSlot = getDescriptionSlot(page, "fr");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("   "); // Just whitespace
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Whitespace is trimmed on blur, so the text should be empty or whitespace
    // (This is expected behavior - contenteditable trims trailing whitespace)
    const frenchText = await frenchEditor.textContent();
    // The content may be empty or preserved depending on trim behavior
    // This test documents the current behavior
    expect(frenchText?.trim() || "").toBe("");
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

    const englishSlot = getDescriptionSlot(page, "en");
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

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Add French via menu (can't use Spanish - it's a working language and protected)
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Add text to French
    let frenchSlot = getDescriptionSlot(page, "fr");
    let frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("First French text");
    await page.keyboard.press("Tab");

    // Remove French via color bar menu
    await getDescriptionColorBar(page, "fr").click();
    await page.getByTestId("delete-slot-menu-fr").click();
    // Wait for French slot to disappear
    await frenchSlot.waitFor({ state: "hidden" });

    // Verify French is gone
    await expect(getDescriptionSlot(page, "fr")).not.toBeVisible();

    // Re-add French via menu
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // French slot should be back but empty (previous text was cleared when removed)
    frenchSlot = getDescriptionSlot(page, "fr");
    await expect(frenchSlot).toBeVisible();
    frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    const frenchText = await frenchEditor.textContent();
    expect(frenchText).toBe("");

    // Add new text to French
    await frenchEditor.click();
    await frenchEditor.fill("Second French text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify new text is there
    await expect(frenchEditor).toHaveText("Second French text");
  });

  // ============================================================
  // Metadata Language Slots tests (reusing same Electron instance)
  // ============================================================

  test("setting project working languages shows those slots by default in multilingual fields", async () => {
    // Go to Project Languages tab to set working languages
    await project.goToProjectLanguages();

    // Find the Working Languages field - need to add BOTH English AND Spanish
    // (multilingual UI only shows when there are 2+ metadata slots)
    const workingContainer = page
      .locator('.field:has(label:has-text("Working Languages"))')
      .first();
    await workingContainer.waitFor({ state: "visible", timeout: 10000 });

    const workingInput = workingContainer
      .locator('.select input[role="combobox"]')
      .first();

    // Add English first
    await workingInput.click();
    await fillLanguageChooserAndSelect(page, workingInput, "eng");

    // Add Spanish second
    await workingInput.click();
    await fillLanguageChooserAndSelect(page, workingInput, "spa");

    // Now go to Sessions and create a new session
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // The multilingual Description field should show both English (default) and Spanish slots
    // because we set Spanish as a project working language
    const englishSlot = getDescriptionSlot(page, "en");
    await expect(englishSlot).toBeVisible();

    const spanishSlot = getDescriptionSlot(page, "es");
    await expect(spanishSlot).toBeVisible();

    // Both slots should have color bars
    const englishColorBar = getDescriptionColorBar(page, "en");
    await expect(englishColorBar).toBeVisible();

    const spanishColorBar = getDescriptionColorBar(page, "es");
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
    const englishSlot = getDescriptionSlot(page, "en");
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
    const englishSlot = getDescriptionSlot(page, "en");
    await expect(englishSlot).toBeVisible();

    const spanishSlot = getDescriptionSlot(page, "es");
    await expect(spanishSlot).toBeVisible();

    // Click English color bar - delete menu item should be disabled (protected)
    const englishColorBar = getDescriptionColorBar(page, "en");
    await englishColorBar.click();
    const deleteEnglishBtn = page.getByTestId("delete-slot-menu-en");
    // Protected slots should have disabled delete menu item
    await expect(deleteEnglishBtn).toBeDisabled();
    await page.keyboard.press("Escape");

    // Click Spanish color bar - delete menu item should be disabled (protected)
    const spanishColorBar = getDescriptionColorBar(page, "es");
    await spanishColorBar.click();
    const deleteSpanishBtn = page.getByTestId("delete-slot-menu-es");
    // Protected slots should have disabled delete menu item
    await expect(deleteSpanishBtn).toBeDisabled();
    await page.keyboard.press("Escape");
  });

  test("non-protected slots (extras) can be deleted", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Add French (not in project working languages, so not protected) via menu
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // French slot should be visible
    const frenchSlot = getDescriptionSlot(page, "fr");
    await expect(frenchSlot).toBeVisible();

    // Click French color bar - delete menu item SHOULD be enabled (not protected)
    const frenchColorBar = getDescriptionColorBar(page, "fr");
    await frenchColorBar.click();
    const deleteFrenchBtn = page.getByTestId("delete-slot-menu-fr");
    await expect(deleteFrenchBtn).toBeEnabled();

    // Click delete
    await deleteFrenchBtn.click();
    // Wait for French slot to disappear
    await frenchSlot.waitFor({ state: "hidden" });

    // French should be gone
    await expect(frenchSlot).not.toBeVisible();

    // But protected slots should still be there
    await expect(getDescriptionSlot(page, "en")).toBeVisible();
    await expect(getDescriptionSlot(page, "es")).toBeVisible();
  });

  test("color bars are visible and differ between languages", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Get the color bars for English and Spanish
    const englishColorBar = getDescriptionColorBar(page, "en");
    const spanishColorBar = getDescriptionColorBar(page, "es");

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
    const englishSlot = getDescriptionSlot(page, "en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("English text in protected slot");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Type in Spanish slot
    const spanishSlot = getDescriptionSlot(page, "es");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto español en slot protegido");
    await page.keyboard.press("Tab");

    // Switch tabs and come back
    await project.goToNotesOfThisSession();
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    // Wait for Description field to be visible after tab switch
    await page.waitForSelector('[data-testid="field-description-edit"]');

    // Verify data persisted
    const englishSlotAfter = getDescriptionSlot(page, "en");
    const englishEditorAfter = englishSlotAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(englishEditorAfter).toHaveText(
      "English text in protected slot"
    );

    const spanishSlotAfter = getDescriptionSlot(page, "es");
    const spanishEditorAfter = spanishSlotAfter.locator(
      '[contenteditable="true"]'
    );
    await expect(spanishEditorAfter).toHaveText(
      "Texto español en slot protegido"
    );
  });
});
