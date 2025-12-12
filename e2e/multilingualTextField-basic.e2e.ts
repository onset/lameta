import { test, expect, Page } from "@playwright/test";
import {
  getDescriptionField,
  hoverToShowAddButton,
  addLanguageToDescription,
  waitForSlotInDescription,
  getDescriptionEditor,
  deleteLanguageFromDescription,
  countSlotsInDescription,
  setupMultilingualTestContext,
  teardownMultilingualTestContext,
  waitForSessionForm,
  MultilingualTestContext
} from "./multilingualTextField-e2e-helpers";

/**
 * Basic multilingual text field tests:
 * - Adding/removing translation slots
 * - Typing in slots
 * - Color bar menus
 */

let context: MultilingualTestContext;
let page: Page;

test.describe("Multilingual Text Fields - Basic Operations", () => {
  test.beforeAll(async () => {
    context = await setupMultilingualTestContext("MultilingualBasic");
    page = context.page;
  });

  test.afterAll(async () => {
    await teardownMultilingualTestContext(context);
  });

  test("multilingual description field shows Add translation button", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Hover over the multilingual field to make the + button visible
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
  });

  test("clicking Add translation button shows language chooser", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);
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

    // A language selector input should be visible
    const languageInput = descriptionField.locator(
      '.select input[role="combobox"]'
    );
    await expect(languageInput.first()).toBeVisible();
  });

  test("clicking Cancel hides language chooser without adding", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    await cancelBtn.click();
    await fieldBorder.hover();

    await expect(addTranslationBtn).toBeVisible();
    await expect(cancelBtn).not.toBeVisible();

    // Only one translation slot should exist (default English)
    const slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(1);
  });

  test("selecting a language adds a new translation slot", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Initially should have one translation slot (English by default)
    const initialSlots = countSlotsInDescription(page);
    const initialCount = await initialSlots.count();
    expect(initialCount).toBe(1);

    // Add Spanish
    await addLanguageToDescription(page, "Spanish");
    await waitForSlotInDescription(page, "es");

    // Now should have two translation slots
    const afterSlots = countSlotsInDescription(page);
    await expect(afterSlots).toHaveCount(2);

    // Spanish slot should exist
    const spanishSlot = descriptionField.getByTestId("translation-slot-es");
    await expect(spanishSlot).toBeVisible();

    // Spanish color bar should be visible
    const spanishColorBar = descriptionField.getByTestId("slot-color-bar-es");
    await expect(spanishColorBar).toBeVisible();
  });

  test("can type in each translation slot independently", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill("This is the English description");

    // Add a Spanish translation
    await addLanguageToDescription(page, "Spanish");
    await waitForSlotInDescription(page, "es");

    const spanishEditor = getDescriptionEditor(page, "es");
    await spanishEditor.click();
    await spanishEditor.fill("Esta es la descripción en español");

    // Verify both translations have their text
    await expect(englishEditor).toHaveText("This is the English description");
    await expect(spanishEditor).toHaveText("Esta es la descripción en español");
  });

  test("color bar menu allows deleting non-protected slots", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Add French
    await addLanguageToDescription(page, "French");
    await waitForSlotInDescription(page, "fr");

    // Click the color bar to open menu
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await expect(frenchColorBar).toBeVisible();
    await frenchColorBar.click();

    // Menu should be visible with delete option enabled
    const deleteMenuItem = page.getByTestId("delete-slot-menu-fr");
    await expect(deleteMenuItem).toBeVisible();
    await expect(deleteMenuItem).toBeEnabled();

    // Close the menu
    await page.keyboard.press("Escape");
  });

  test("clicking delete in menu removes the slot", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Add German
    await addLanguageToDescription(page, "deu");
    await waitForSlotInDescription(page, "de");

    // Verify we have 2 slots
    const slotsBefore = countSlotsInDescription(page);
    await expect(slotsBefore).toHaveCount(2);

    // Delete German
    await deleteLanguageFromDescription(page, "de");

    // Should now have only 1 slot
    const slotsAfter = countSlotsInDescription(page);
    await expect(slotsAfter).toHaveCount(1);

    // German slot should be gone
    const germanSlot = descriptionField.getByTestId("translation-slot-de");
    await expect(germanSlot).not.toBeVisible();
  });

  test("'Add language slot' menu item opens language chooser", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);
    const fieldBorder = descriptionField.locator(".field-value-border").first();
    await fieldBorder.hover();

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Click "Add language slot" menu item
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await expect(addLanguageMenuItem).toBeVisible();
    await addLanguageMenuItem.click();

    // The language chooser should now be visible
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    const languageInput = descriptionField.locator(
      '.select input[role="combobox"]'
    );
    await expect(languageInput.first()).toBeVisible();

    // Add French
    await languageInput.first().fill("French");
    await page.waitForTimeout(300);
    await languageInput.first().press("Enter");
    await waitForSlotInDescription(page, "fr");

    // Verify French was added
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    await expect(frenchSlot).toBeVisible();

    const slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(2);
  });

  test("removing non-English slot leaves default intact", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Add French with text
    await addLanguageToDescription(page, "fra");
    await waitForSlotInDescription(page, "fr");

    const frenchEditor = getDescriptionEditor(page, "fr");
    await frenchEditor.click();
    await frenchEditor.fill("French text here");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify we have 2 slots
    let slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(2);

    // Remove French
    await deleteLanguageFromDescription(page, "fr");

    // English should still be there
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();

    slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(1);
  });

  test("cannot add duplicate language translation", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    // Add Spanish
    await addLanguageToDescription(page, "Spanish");
    await waitForSlotInDescription(page, "es");

    // Now we have 2 slots (en and es)
    const afterFirstAdd = countSlotsInDescription(page);
    await expect(afterFirstAdd).toHaveCount(2);

    // Try to add Spanish again - should not add a duplicate
    await addLanguageToDescription(page, "Spanish");
    await page.waitForTimeout(500);

    // Should still have 2 slots (duplicate not added)
    const afterDuplicateAttempt = countSlotsInDescription(page);
    await expect(afterDuplicateAttempt).toHaveCount(2);
  });
});
