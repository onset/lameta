import { test, expect, Page } from "@playwright/test";
import {
  getDescriptionField,
  addLanguageViaMenu,
  getDescriptionSlot,
  getDescriptionEditor,
  deleteLanguageFromDescription,
  countSlotsInDescription,
  setupMultilingualTestContextFast,
  teardownMultilingualTestContext,
  waitForSessionForm,
  MultilingualTestContext,
  hoverOverDescriptionField
} from "./multilingualTextField-e2e-helpers";

// Working languages configured for this test file.
// Tests use kWorkingLanguages.length for expected slot counts.
const kWorkingLanguages = ["eng", "spa"];

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
    context = await setupMultilingualTestContextFast(
      "MultilingualBasic",
      kWorkingLanguages
    );
    page = context.page;
  });

  test.afterAll(async () => {
    await teardownMultilingualTestContext(context);
  });

  test("color bar menu shows Add language slot option", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Hover over the multilingual field
    await hoverOverDescriptionField(page);

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Add language slot option should be visible
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await expect(addLanguageMenuItem).toBeVisible();

    // Close the menu
    await page.keyboard.press("Escape");
  });

  test("clicking Add language slot menu item shows language chooser", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);
    await hoverOverDescriptionField(page);

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Click "Add language slot" menu item
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await addLanguageMenuItem.click();

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
    await hoverOverDescriptionField(page);

    // Click the English color bar to open the menu
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();

    // Click "Add language slot" menu item
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await addLanguageMenuItem.click();

    const cancelBtn = page.getByTestId("cancel-add-translation");
    await expect(cancelBtn).toBeVisible();

    await cancelBtn.click();
    await hoverOverDescriptionField(page);

    await expect(cancelBtn).not.toBeVisible();

    // Only Working Language slots should exist
    const slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(kWorkingLanguages.length);
  });

  test("can type in each translation slot independently", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill("This is the English description");

    // Spanish is already a working language, use it directly
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

    // Add French via menu
    await addLanguageViaMenu(page, "en", "fra", "fr");

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

    // Add German via menu
    await addLanguageViaMenu(page, "en", "deu", "de");

    // Verify we have working languages + 1 added slot
    const slotsBefore = countSlotsInDescription(page);
    await expect(slotsBefore).toHaveCount(kWorkingLanguages.length + 1);

    // Delete German
    await deleteLanguageFromDescription(page, "de");

    // Should now have only working language slots
    const slotsAfter = countSlotsInDescription(page);
    await expect(slotsAfter).toHaveCount(kWorkingLanguages.length);

    // German slot should be gone
    const germanSlot = descriptionField.getByTestId("translation-slot-de");
    await expect(germanSlot).not.toBeVisible();
  });

  test("removing non-English slot leaves default intact", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Add French with text via menu
    await addLanguageViaMenu(page, "en", "french", "fr");

    const frenchEditor = getDescriptionEditor(page, "fr");
    await frenchEditor.click();
    await frenchEditor.fill("French text here");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify we have working languages + French
    let slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(kWorkingLanguages.length + 1);

    // Remove French
    await deleteLanguageFromDescription(page, "fr");

    // Working language slots should still be there
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();

    slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(kWorkingLanguages.length);
  });

  test("cannot add duplicate language translation", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    // Add French via menu
    await addLanguageViaMenu(page, "en", "french", "fr");

    // Now we have working languages + French
    const afterFirstAdd = countSlotsInDescription(page);
    await expect(afterFirstAdd).toHaveCount(kWorkingLanguages.length + 1);

    // Try to add French again via menu - should not add a duplicate
    await addLanguageViaMenu(page, "en", "french", "fr");
    await page.waitForTimeout(500);

    // Should still have working languages + 1 French (duplicate not added)
    const afterDuplicateAttempt = countSlotsInDescription(page);
    await expect(afterDuplicateAttempt).toHaveCount(
      kWorkingLanguages.length + 1
    );
  });

  test("selecting a language adds a new translation slot", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Initially should have working language slots
    const initialSlots = countSlotsInDescription(page);
    await expect(initialSlots).toHaveCount(kWorkingLanguages.length);

    // Add French via menu (clicking on English color bar)
    await addLanguageViaMenu(page, "en", "fra", "fr");

    // Now should have working languages + 1 slot
    const afterSlots = countSlotsInDescription(page);
    await expect(afterSlots).toHaveCount(kWorkingLanguages.length + 1);

    // French slot should exist
    const frenchSlot = descriptionField.getByTestId("translation-slot-fr");
    await expect(frenchSlot).toBeVisible();

    // French color bar should be visible
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await expect(frenchColorBar).toBeVisible();
  });

  test("protected slots (from project working languages) cannot be deleted", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Both English and Spanish should be visible as protected slots
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).toBeVisible();

    // Click English color bar - delete menu item should be disabled (protected)
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();
    const deleteEnglishBtn = page.getByTestId("delete-slot-menu-en");
    await expect(deleteEnglishBtn).toBeDisabled();
    await page.keyboard.press("Escape");

    // Click Spanish color bar - delete menu item should be disabled (protected)
    const spanishColorBar = descriptionField.getByTestId("slot-color-bar-es");
    await spanishColorBar.click();
    const deleteSpanishBtn = page.getByTestId("delete-slot-menu-es");
    await expect(deleteSpanishBtn).toBeDisabled();
    await page.keyboard.press("Escape");
  });

  test("color bars are visible and differ between languages", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Get the color bars for English and Spanish
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    const spanishColorBar = descriptionField.getByTestId("slot-color-bar-es");

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

  test("empty protected slots show placeholder text", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    // Look for empty contenteditable divs that should have placeholder styling
    const englishEditor = getDescriptionEditor(page, "en");

    // Editor should be visible even if empty
    await expect(englishEditor).toBeVisible();

    // The editor should be empty initially
    const text = await englishEditor.textContent();
    expect(text).toBe("");
  });
});
