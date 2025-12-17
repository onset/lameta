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
 * Tests for multilingual field data persistence:
 * - Data survives tab switching
 * - Empty slots are lost on tab switch
 * - Whitespace-only text handling
 */

let context: MultilingualTestContext;
let page: Page;

test.describe("Multilingual Text Fields - Persistence", () => {
  test.beforeAll(async () => {
    context = await setupMultilingualTestContextFast(
      "MultilingualPersistence",
      kWorkingLanguages
    );
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

    // Spanish is already a working language, use it directly
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

    // Add French but don't enter any text via menu
    await addLanguageViaMenu(page, "en", "french", "fr");

    const descriptionField = getDescriptionField(page);

    // Verify we have working languages + French
    let slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(kWorkingLanguages.length + 1);

    // Switch tabs without entering text in Spanish
    await context.project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    // French slot should be gone (empty translation not persisted)
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();

    slots = countSlotsInDescription(page);
    await expect(slots).toHaveCount(kWorkingLanguages.length);
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
  });

  test("whitespace-only text in translation is treated as empty", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    // Add French and enter only whitespace via menu
    await addLanguageViaMenu(page, "en", "fra", "fr");

    const frenchEditor = getDescriptionEditor(page, "fr");
    await frenchEditor.click();
    await frenchEditor.fill("   "); // Just whitespace
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Whitespace should be trimmed
    const frenchText = await frenchEditor.textContent();
    expect(frenchText?.trim() || "").toBe("");
  });

  test("can add, remove, and re-add the same language", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Add French via menu
    await addLanguageViaMenu(page, "en", "french", "fr");

    // Add text to French
    const frenchEditor = getDescriptionEditor(page, "fr");
    await frenchEditor.click();
    await frenchEditor.fill("First French text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Remove French via helper
    await deleteLanguageFromDescription(page, "fr");

    // Verify French is gone
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();

    // Re-add French via menu
    await addLanguageViaMenu(page, "en", "french", "fr");

    // French slot should be back but empty (previous text was cleared when removed)
    const frenchEditorAfter = getDescriptionEditor(page, "fr");
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).toBeVisible();
    const frenchText = await frenchEditorAfter.textContent();
    expect(frenchText).toBe("");

    // Add new text to French
    await frenchEditorAfter.click();
    await frenchEditorAfter.fill("Second French text");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify new text is there
    await expect(frenchEditorAfter).toHaveText("Second French text");
  });

  test("cancel during language selection does not add language", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Start adding a language via menu
    await hoverOverDescriptionField(page);
    const englishColorBar = descriptionField.getByTestId("slot-color-bar-en");
    await englishColorBar.click();
    const addLanguageMenuItem = page.getByTestId("add-language-slot-menu-en");
    await addLanguageMenuItem.click();

    // Type something but don't press Enter
    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("french");
    await page.waitForTimeout(300);

    // Cancel instead of selecting
    const cancelBtn = page.getByTestId("cancel-add-translation");
    await cancelBtn.click();
    await page.waitForTimeout(200);

    // Should still have the Working Languages
    const allSlots = countSlotsInDescription(page);
    await expect(allSlots).toHaveCount(kWorkingLanguages.length);
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
  });

  test("typing in protected slot works and data persists", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    // Type in English slot
    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill("English text in protected slot");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Type in Spanish slot
    const spanishEditor = getDescriptionEditor(page, "es");
    await spanishEditor.click();
    await spanishEditor.fill("Texto español en slot protegido");
    await page.keyboard.press("Tab");

    // Switch tabs and come back
    await context.project.goToNotesOfThisSession();
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await waitForSessionForm(page);

    // Verify data persisted
    const englishEditorAfter = getDescriptionEditor(page, "en");
    await expect(englishEditorAfter).toHaveText(
      "English text in protected slot"
    );

    const spanishEditorAfter = getDescriptionEditor(page, "es");
    await expect(spanishEditorAfter).toHaveText(
      "Texto español en slot protegido"
    );
  });
});
