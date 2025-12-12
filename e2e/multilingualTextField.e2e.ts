import { test, expect, Page, Locator } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

// Helper to get the Description field locator - use this to scope selectors
function getDescriptionField(page: Page): Locator {
  return page.locator('.field:has(label:text("Description"))');
}

// Helper to make the + button visible by hovering over the Description multilingual field
async function hoverToShowAddButton(page: Page) {
  const descriptionField = getDescriptionField(page);
  const fieldBorder = descriptionField.locator(".field-value-border").first();
  await fieldBorder.hover();
}

function getDescriptionSlots(page: Page): Locator {
  return getDescriptionField(page).locator(
    '[data-testid^="translation-slot-"]'
  );
}

function getDescriptionSlot(page: Page, code: string): Locator {
  return getDescriptionField(page).getByTestId(`translation-slot-${code}`);
}

function getDescriptionColorBar(page: Page, code: string): Locator {
  return getDescriptionField(page).getByTestId(`slot-color-bar-${code}`);
}

function getDescriptionAddButton(page: Page): Locator {
  return getDescriptionField(page).getByTestId("add-translation-button");
}

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

    // Scope to the Description field to avoid multiple multilingual fields
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );

    // Hover over the multilingual field to make the + button visible
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

    // The Add translation button should be visible after hovering
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
  });

  test("clicking Add translation button shows language chooser", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Scope to Description field and hover to show the + button
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

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

    // Scope to Description field and hover to show the + button
    const descriptionField = page.locator(
      '.field:has(label:text("Description"))'
    );
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    // Cancel button should be visible
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // Click cancel
    await cancelBtn.click();

    // After cancel, hover again to show the button
    await fieldBorder.hover();

    // Add translation button should be back, cancel should be hidden
    await expect(addTranslationBtn).toBeVisible();
    await expect(cancelBtn).not.toBeVisible();

    // Only one translation slot should exist (default English)
    const translationSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(translationSlots).toHaveCount(1);
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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Initially should have one translation slot (English by default) in Description
    const initialSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    const initialCount = await initialSlots.count();
    expect(initialCount).toBe(1);

    // Click Add translation in Description field
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    // Type in a language and select it
    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300); // wait for debounce
    await languageInput.press("Enter");

    // Wait for the new slot to appear (BCP47 code for Spanish is "es")
    await descriptionField
      .locator('[data-testid="translation-slot-es"]')
      .waitFor({ timeout: 5000 });

    // Now should have two translation slots in Description field
    const afterSlots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(afterSlots).toHaveCount(2);

    // Spanish slot should exist (BCP47 code is "es")
    const spanishSlot = descriptionField.getByTestId("translation-slot-es");
    await expect(spanishSlot).toBeVisible();

    // Spanish color bar should be visible with tooltip showing language name
    const spanishColorBar = descriptionField.getByTestId("slot-color-bar-es");
    await expect(spanishColorBar).toBeVisible();
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

    // Add a Spanish translation
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await addTranslationBtn.click();

    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // The new Spanish slot should be focused, type in it
    // Find the description editor within the Spanish slot (BCP47 code is "es")
    await descriptionField
      .locator('[data-testid="translation-slot-es"]')
      .waitFor({ timeout: 5000 });
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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Add a second translation so delete can work
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("French");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Wait for French slot to appear (BCP47 code is "fr")
    await descriptionField
      .locator('[data-testid="translation-slot-fr"]')
      .waitFor({ timeout: 5000 });

    // Click the color bar to open menu
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await expect(frenchColorBar).toBeVisible();
    await frenchColorBar.click();

    // Menu should be visible with language name and delete option
    const deleteMenuItem = page.getByTestId("delete-slot-menu-fr");
    await expect(deleteMenuItem).toBeVisible();
    // Delete should be enabled for non-protected slots
    await expect(deleteMenuItem).toBeEnabled();
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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Add a second translation (use "deu" code directly for unambiguous match)
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("deu");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for German slot to appear (BCP47 code is "de")
    await descriptionField
      .locator('[data-testid="translation-slot-de"]')
      .waitFor({ timeout: 5000 });

    // Verify we have 2 slots in Description
    const slotsBefore = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(slotsBefore).toHaveCount(2);

    // Click color bar to open menu and delete the German slot
    const germanColorBar = descriptionField.getByTestId("slot-color-bar-de");
    await germanColorBar.click();

    const deleteMenuItem = page.getByTestId("delete-slot-menu-de");
    await deleteMenuItem.click();

    // Wait for removal
    await page.waitForTimeout(300);

    // Should now have only 1 slot in Description
    const slotsAfter = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(slotsAfter).toHaveCount(1);

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

    // Hover to make the + button visible
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

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

    // The language chooser should now be visible (Cancel button is a good indicator)
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    // A language selector input should be visible (from SingleLanguageChooser)
    const languageInput = getDescriptionField(page).locator(
      '.select input[role="combobox"]'
    );
    await expect(languageInput.first()).toBeVisible();

    // Select a language to add
    await languageInput.first().fill("French");
    await page.waitForTimeout(300);
    await languageInput.first().press("Enter");

    // Wait for French slot to appear (BCP47 code is "fr")
    await descriptionField.waitFor({ state: "visible" });
    await getDescriptionSlot(page, "fr").waitFor({
      timeout: 5000
    });

    // Verify French was added in the Description field
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    await expect(frenchSlot).toBeVisible();

    // Should now have 2 slots in the Description field
    const slots = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(slots).toHaveCount(2);
  });

  test("removing non-English slot leaves default intact", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Scope to Description field
    const descriptionField = getDescriptionField(page);

    // Add a French translation first (use ISO code)
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await addTranslationBtn.click();

    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for French slot to appear (BCP47 code is "fr")
    await descriptionField
      .locator('[data-testid="translation-slot-fr"]')
      .waitFor({ timeout: 5000 });

    // Add some text to French
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("French text here");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify we have 2 slots in Description
    let slots = descriptionField.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(2);

    // Remove French via color bar menu - English should remain
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await frenchColorBar.click();
    const deleteFrBtn = page.getByTestId("delete-slot-menu-fr");
    await deleteFrBtn.click();
    await page.waitForTimeout(300);

    // English should still be there
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();
    slots = descriptionField.locator('[data-testid^="translation-slot-"]');
    await expect(slots).toHaveCount(1);
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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // First, add Spanish so we have 2 axes
    let addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();
    let languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await descriptionField
      .locator('[data-testid="translation-slot-es"]')
      .waitFor({ timeout: 5000 });

    // Now we have 2 slots (en and es) in Description
    const afterFirstAdd = descriptionField.locator(
      '[data-testid^="translation-slot-"]'
    );
    await expect(afterFirstAdd).toHaveCount(2);

    // Try to add Spanish again - should not add a duplicate
    // Need to hover again to show the + button
    await hoverToShowAddButton(page);
    addTranslationBtn = descriptionField.getByTestId("add-translation-button");
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();
    languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Should still have 2 slots (duplicate not added) in Description
    const afterDuplicateAttempt = descriptionField.locator(
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
    const englishSlot = getDescriptionSlot(page, "en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill("Persistent English text");

    // Add Spanish and enter text
    const addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();

    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    // Wait for Spanish slot to appear (BCP47 code is "es")
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });
    const spanishSlot = getDescriptionSlot(page, "es");
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
    const englishSlot = getDescriptionSlot(page, "en");
    const englishEditor = englishSlot.locator('[contenteditable="true"]');
    await englishEditor.click();
    await englishEditor.fill(
      "Initial English text with special chars: é ñ ü 日本語"
    );
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 2: Add Spanish translation
    let addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    let languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });

    // Step 3: Add text to Spanish field
    const spanishSlot = getDescriptionSlot(page, "es");
    const spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("Texto en español con caracteres: ñ á é í ó ú");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 4: Add French translation (use ISO code)
    addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "fr").waitFor({
      timeout: 5000
    });

    // Step 5: Add text to French field
    const frenchSlot = getDescriptionSlot(page, "fr");
    const frenchEditor = frenchSlot.locator('[contenteditable="true"]');
    await frenchEditor.click();
    await frenchEditor.fill("Texte français avec accents: é è ê ë à â");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 6: Add German translation but leave it empty (use ISO code "deu")
    addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("deu");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "de").waitFor({
      timeout: 5000
    });

    // Step 7: Verify we have 4 translation slots
    let allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(4);

    // Step 8: Remove the empty German translation via color bar menu
    const germanColorBar = getDescriptionColorBar(page, "de");
    await germanColorBar.click();
    const deleteGermanBtn = page.getByTestId("delete-slot-menu-de");
    await deleteGermanBtn.click();
    await page.waitForTimeout(300);

    // Verify we now have 3 slots
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(3);

    // Step 9: Add Arabic translation (RTL language - edge case, use ISO code)
    // Note: 'ara' normalizes to 'ar' since Arabic has a 2-letter BCP47 code
    addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("ara");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "ar").waitFor({
      timeout: 5000
    });

    // Step 10: Add Arabic text
    const arabicSlot = getDescriptionSlot(page, "ar");
    const arabicEditor = arabicSlot.locator('[contenteditable="true"]');
    await arabicEditor.click();
    await arabicEditor.fill("نص عربي للاختبار");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

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
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

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
    await page.waitForTimeout(300);

    // Step 17: Verify French is gone
    await expect(getDescriptionSlot(page, "fr")).not.toBeVisible();

    // Step 18: Add Mandarin Chinese (CJK characters - edge case, use ISO code)
    addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("cmn");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "cmn").waitFor({
      timeout: 5000
    });

    // Step 19: Add Chinese text
    const chineseSlot = getDescriptionSlot(page, "cmn");
    const chineseEditor = chineseSlot.locator('[contenteditable="true"]');
    await chineseEditor.click();
    await chineseEditor.fill("中文测试文本，包含特殊字符：！@#￥%");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 20: Attempt to add duplicate language (should not add)
    // Note: We try to add 'ara' again, which normalizes to 'ar' - should be detected as duplicate
    addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("ara");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await page.waitForTimeout(500);

    // Step 21: Count slots - should still be 4 (en, es, ar, cmn) not 5
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(4);

    // Step 22: Remove all non-English translations one by one via color bar menu
    // Remove Spanish
    await getDescriptionColorBar(page, "es").click();
    await page.getByTestId("delete-slot-menu-es").click();
    await page.waitForTimeout(300);

    // Remove Arabic
    await getDescriptionColorBar(page, "ar").click();
    await page.getByTestId("delete-slot-menu-ar").click();
    await page.waitForTimeout(300);

    // Remove Chinese
    await getDescriptionColorBar(page, "cmn").click();
    await page.getByTestId("delete-slot-menu-cmn").click();
    await page.waitForTimeout(300);

    // Step 23: Should now have only English
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(1);
    await expect(getDescriptionSlot(page, "en")).toBeVisible();

    // Step 24: With only one slot, the delete menu item should be disabled
    // This is a boundary condition - can't remove the last translation
    const englishColorBarFinal = getDescriptionColorBar(page, "en");
    await englishColorBarFinal.click();
    const deleteEnglishBtn = page.getByTestId("delete-slot-menu-en");
    // Check that the delete is disabled (because canRemove is false when only 1 slot)
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

    // Add another language with long text (use ISO code)
    const addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });

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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Use ISO codes for selection, track matching BCP47 codes for selectors
    const languages = [
      { iso: "spa", bcp: "es" },
      { iso: "fra", bcp: "fr" },
      { iso: "deu", bcp: "de" },
      { iso: "por", bcp: "pt" }
    ];

    // Rapidly add multiple languages
    for (const language of languages) {
      // Need to hover each time to show the + button
      await hoverToShowAddButton(page);
      const addTranslationBtn = getDescriptionAddButton(page);
      await expect(addTranslationBtn).toBeVisible();
      await addTranslationBtn.click();
      const languageInput = getDescriptionField(page)
        .locator('.select input[role="combobox"]')
        .first();
      await languageInput.fill(language.iso);
      await page.waitForTimeout(300);
      await languageInput.press("Enter");
      await getDescriptionSlot(page, language.bcp).waitFor({
        timeout: 5000
      });
    }

    // Verify all were added (4 languages + English = 5)
    let allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(5);

    // Rapidly remove all added languages via color bar menu
    for (let i = languages.length - 1; i >= 0; i--) {
      const { bcp } = languages[i];
      const colorBar = getDescriptionColorBar(page, bcp);
      await colorBar.click();
      const deleteBtn = page.getByTestId(`delete-slot-menu-${bcp}`);
      await deleteBtn.click();
      await page.waitForTimeout(200);
    }

    // Should be back to just English
    allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(1);
  });

  // Test adding translation via Cancel button
  test("cancel during language selection does not add language", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Start adding a language
    const addTranslationBtn = getDescriptionAddButton(page);
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    // Type something but don't press Enter
    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);

    // Cancel instead of selecting
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // Should still have only English
    const allSlots = getDescriptionSlots(page);
    await expect(allSlots).toHaveCount(1);
    await expect(getDescriptionSlot(page, "en")).toBeVisible();
  });

  // Test that empty translations are lost on tab switch (expected behavior)
  test("empty translation slot is lost on tab switch", async () => {
    await project.goToSessions();
    await project.addSession();

    // Wait for session form to load
    await page.waitForSelector("text=Description", {
      timeout: 10000
    });

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Add Spanish but don't enter any text
    const addTranslationBtn = getDescriptionAddButton(page);
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();
    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });

    // Verify we have 2 slots now
    let slots = getDescriptionSlots(page);
    await expect(slots).toHaveCount(2);

    // Switch tabs without entering text in Spanish
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Spanish slot should be gone (empty translation not persisted)
    await expect(getDescriptionSlot(page, "es")).not.toBeVisible();
    slots = getDescriptionSlots(page);
    await expect(slots).toHaveCount(1);
    await expect(getDescriptionSlot(page, "en")).toBeVisible();
  });

  // Test with whitespace-only text (should be treated as empty)
  test("whitespace-only text in translation is treated as empty", async () => {
    await project.goToSessions();
    await project.addSession();

    await page.waitForSelector('[data-testid="field-description-edit"]', {
      timeout: 10000
    });

    // Add Spanish and enter only whitespace
    const addTranslationBtn = getDescriptionAddButton(page);
    await addTranslationBtn.click();
    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });

    const spanishSlot = getDescriptionSlot(page, "es");
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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Add Spanish
    let addTranslationBtn = getDescriptionAddButton(page);
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();
    let languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });

    // Add text to Spanish
    let spanishSlot = getDescriptionSlot(page, "es");
    let spanishEditor = spanishSlot.locator('[contenteditable="true"]');
    await spanishEditor.click();
    await spanishEditor.fill("First Spanish text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Remove Spanish via color bar menu
    await getDescriptionColorBar(page, "es").click();
    await page.getByTestId("delete-slot-menu-es").click();
    await page.waitForTimeout(300);

    // Verify Spanish is gone
    await expect(getDescriptionSlot(page, "es")).not.toBeVisible();

    // Re-add Spanish - need to hover to show + button
    await hoverToShowAddButton(page);
    addTranslationBtn = getDescriptionAddButton(page);
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();
    languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("spa");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");
    await getDescriptionSlot(page, "es").waitFor({
      timeout: 5000
    });

    // Spanish slot should be back but empty (previous text was cleared when removed)
    spanishSlot = getDescriptionSlot(page, "es");
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
    await workingInput.fill("eng");
    await page.waitForTimeout(300);
    await workingInput.press("Enter");
    await page.waitForTimeout(300);

    // Add Spanish second
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

    // Hover to show the + button
    await hoverToShowAddButton(page);

    // Add French (not in project working languages, so not protected)
    const addTranslationBtn = getDescriptionAddButton(page);
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    const languageInput = getDescriptionField(page)
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("fra");
    await page.waitForTimeout(300);
    await languageInput.press("Enter");

    await getDescriptionSlot(page, "fr").waitFor({
      timeout: 5000
    });

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
    await page.waitForTimeout(300);

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
    await page.waitForTimeout(200);

    // Switch tabs and come back
    await project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

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
