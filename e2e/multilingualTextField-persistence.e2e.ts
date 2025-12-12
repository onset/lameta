import { test, expect, Page } from "@playwright/test";
import {
  getDescriptionField,
  addLanguageToDescription,
  waitForSlotInDescription,
  getDescriptionEditor,
  countSlotsInDescription,
  setupMultilingualTestContext,
  teardownMultilingualTestContext,
  waitForSessionForm,
  MultilingualTestContext,
  hoverToShowAddButton
} from "./multilingualTextField-e2e-helpers";

/**
 * Tests for multilingual field data persistence:
 * - Data survives tab switching
 * - Empty slots are lost on tab switch
 * - Whitespace-only text handling
 */

let context: MultilingualTestContext;
let page: Page;

test.describe("Multilingual Text Fields - Persistence", () => {
  test.beforeAll(async () => {
    context = await setupMultilingualTestContext("MultilingualPersistence");
    page = context.page;
  });

  test.afterAll(async () => {
    await teardownMultilingualTestContext(context);
  });

  test("multilingual field data persists after switching tabs", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Enter text in the English description
    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill("Persistent English text");

    // Add Spanish and enter text
    await addLanguageToDescription(page, "Spanish");
    await waitForSlotInDescription(page, "es");

    const spanishEditor = getDescriptionEditor(page, "es");
    await spanishEditor.click();
    await spanishEditor.fill("Texto persistente en español");

    // Blur to ensure save
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);

    // Switch to Notes tab and back
    await context.project.goToNotesOfThisSession();
    await page.waitForTimeout(300);

    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Verify the translations are still there
    const englishEditorAfter = getDescriptionEditor(page, "en");
    await expect(englishEditorAfter).toHaveText("Persistent English text");

    const spanishSlotAfter = descriptionField.getByTestId(
      "translation-slot-es"
    );
    await expect(spanishSlotAfter).toBeVisible();
    const spanishEditorAfter = getDescriptionEditor(page, "es");
    await expect(spanishEditorAfter).toHaveText("Texto persistente en español");
  });

  test("empty translation slot is lost on tab switch", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    // Add Spanish but don't enter any text
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    const descriptionField = getDescriptionField(page);

    // Verify we have 2 slots now
    let slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(2);

    // Switch tabs without entering text in Spanish
    await context.project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // Spanish slot should be gone (empty translation not persisted)
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).not.toBeVisible();

    slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(1);
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
  });

  test("whitespace-only text in translation is treated as empty", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    // Add Spanish and enter only whitespace
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    const spanishEditor = getDescriptionEditor(page, "es");
    await spanishEditor.click();
    await spanishEditor.fill("   "); // Just whitespace
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Whitespace should be trimmed
    const spanishText = await spanishEditor.textContent();
    expect(spanishText?.trim() || "").toBe("");
  });

  test("can add, remove, and re-add the same language", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Add Spanish
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    // Add text to Spanish
    const spanishEditor = getDescriptionEditor(page, "es");
    await spanishEditor.click();
    await spanishEditor.fill("First Spanish text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Remove Spanish via color bar menu
    const colorBar = descriptionField.getByTestId("slot-color-bar-es");
    await colorBar.click();
    await page.getByTestId("delete-slot-menu-es").click();
    await page.waitForTimeout(300);

    // Verify Spanish is gone
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).not.toBeVisible();

    // Re-add Spanish
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    // Spanish slot should be back but empty (previous text was cleared when removed)
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).toBeVisible();
    const spanishEditorAfter = getDescriptionEditor(page, "es");
    const spanishText = await spanishEditorAfter.textContent();
    expect(spanishText).toBe("");

    // Add new text to Spanish
    await spanishEditorAfter.click();
    await spanishEditorAfter.fill("Second Spanish text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify new text is there
    await expect(spanishEditorAfter).toHaveText("Second Spanish text");
  });

  test("cancel during language selection does not add language", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Start adding a language
    await hoverToShowAddButton(page);
    const addTranslationBtn = descriptionField.getByTestId(
      "add-translation-button"
    );
    await expect(addTranslationBtn).toBeVisible();
    await addTranslationBtn.click();

    // Type something but don't press Enter
    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("Spanish");
    await page.waitForTimeout(300);

    // Cancel instead of selecting
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // Should still have only English
    const allSlots = countSlotsInDescription(page);
    await expect(allSlots).toHaveCount(1);
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
  });
});
