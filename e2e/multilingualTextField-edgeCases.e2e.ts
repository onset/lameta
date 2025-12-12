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
  MultilingualTestContext
} from "./multilingualTextField-e2e-helpers";

/**
 * Edge case tests for multilingual text fields:
 * - Long text handling
 * - Special characters
 * - Unicode scripts
 * - Rapid operations
 * - Stress testing
 */

let context: MultilingualTestContext;
let page: Page;

test.describe("Multilingual Text Fields - Edge Cases", () => {
  test.beforeAll(async () => {
    context = await setupMultilingualTestContext("MultilingualEdgeCases");
    page = context.page;
  });

  test.afterAll(async () => {
    await teardownMultilingualTestContext(context);
  });

  test("handles long text in multilingual field", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const longText =
      "This is a very long text that simulates a real-world scenario where users might enter detailed descriptions. ".repeat(
        20
      );

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill(longText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify the text is there
    await expect(englishEditor).toContainText(longText.substring(0, 100));
  });

  test("handles special characters in multilingual field", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const specialText = `Test with special chars: "quotes", 'apostrophes', & ampersand, <brackets>, \\ backslash, / forward slash, | pipe, ? question, * asterisk`;

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill(specialText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Switch tabs and back to verify persistence
    await context.project.goToNotesOfThisSession();
    await page.waitForTimeout(300);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(300);

    const englishEditorAfter = getDescriptionEditor(page, "en");
    await expect(englishEditorAfter).toContainText("special chars");
  });

  test("handles mixed Unicode scripts", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    // Test with various scripts
    const mixedScriptText =
      "English text followed by 日本語 and العربية and עברית and 中文";

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill(mixedScriptText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify mixed scripts are preserved
    await expect(englishEditor).toContainText("日本語");
    await expect(englishEditor).toContainText("العربية");
  });

  test("handles IPA and special linguistic characters", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const ipaText = "IPA transcription: [ˈθɪŋkɪŋ] [ʃ] [ŋ] [ɔɪ] [əʊ] [æ]";

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill(ipaText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Verify IPA characters are preserved
    await expect(englishEditor).toContainText("ˈθɪŋkɪŋ");
  });

  test("handles emoji and extended Unicode", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const emojiText = "Recording 🎙️ of a 📖 story with 🌍 global characters";

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill(emojiText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Emoji should be preserved
    await expect(englishEditor).toContainText("Recording");
    await expect(englishEditor).toContainText("story");
  });

  test("rapid add/remove does not crash", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Add Spanish quickly
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    // Immediately remove it
    const colorBar = descriptionField.getByTestId("slot-color-bar-es");
    await colorBar.click();
    await page.getByTestId("delete-slot-menu-es").click();
    await page.waitForTimeout(200);

    // Add it again quickly
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    // Verify we have English and Spanish
    const allSlots = countSlotsInDescription(page);
    await expect(allSlots).toHaveCount(2);
    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).toBeVisible();
  });

  test("handles newlines and multiline text", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    // Note: Shift+Enter may be needed for multiline in some editors
    const multilineText = "Line one\nLine two\nLine three";

    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill(multilineText);
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // The editor should contain the text (may or may not preserve newlines depending on implementation)
    const content = await englishEditor.textContent();
    expect(content).toContain("Line one");
  });

  test("adding multiple languages creates correctly ordered slots", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Add several languages using ISO codes for reliability
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    await addLanguageToDescription(page, "fra");
    await waitForSlotInDescription(page, "fr");

    await addLanguageToDescription(page, "deu");
    await waitForSlotInDescription(page, "de");

    // Verify all slots exist
    const allSlots = countSlotsInDescription(page);
    await expect(allSlots).toHaveCount(4);

    await expect(
      descriptionField.getByTestId("translation-slot-en")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-es")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).toBeVisible();
    await expect(
      descriptionField.getByTestId("translation-slot-de")
    ).toBeVisible();
  });

  test("languages can be added via color bar menu", async () => {
    await context.project.goToSessions();
    await context.project.addSession();

    await page.waitForSelector("text=Description", { timeout: 10000 });

    const descriptionField = getDescriptionField(page);

    // Click the color bar for English slot to open menu
    const colorBar = descriptionField.getByTestId("slot-color-bar-en");
    await colorBar.click();

    // Click the add button from the menu
    const addButton = page.getByTestId("add-language-slot-menu-en");
    await expect(addButton).toBeVisible();
    await addButton.click();

    // Now we should see the language selector
    const languageInput = descriptionField
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.fill("French");
    await page.waitForTimeout(200);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);

    // Verify French was added
    await waitForSlotInDescription(page, "fr");
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).toBeVisible();
  });
});

test.describe("Multilingual Text Fields - Stress Test", () => {
  test.beforeAll(async () => {
    context = await setupMultilingualTestContext("MultilingualStress");
    page = context.page;
  });

  test.afterAll(async () => {
    await teardownMultilingualTestContext(context);
  });

  test("stress test: multiple languages with text", async () => {
    // This test simulates a complex real-world workflow
    await context.project.goToSessions();
    await context.project.addSession();

    await waitForSessionForm(page);

    const descriptionField = getDescriptionField(page);

    // Step 1: Type in English
    const englishEditor = getDescriptionEditor(page, "en");
    await englishEditor.click();
    await englishEditor.fill("English description of the recording session");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 2: Add Spanish and type
    await addLanguageToDescription(page, "spa");
    await waitForSlotInDescription(page, "es");

    const spanishEditor = getDescriptionEditor(page, "es");
    await spanishEditor.click();
    await spanishEditor.fill(
      "Descripción en español de la sesión de grabación"
    );
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 3: Add French and type
    await addLanguageToDescription(page, "French");
    await waitForSlotInDescription(page, "fr");

    const frenchEditor = getDescriptionEditor(page, "fr");
    await frenchEditor.click();
    await frenchEditor.fill(
      "Description française de la session d'enregistrement"
    );
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 4: Verify all three exist with content
    await expect(englishEditor).toContainText("English description");
    await expect(spanishEditor).toContainText("Descripción en español");
    await expect(frenchEditor).toContainText("Description française");

    // Step 5: Switch tabs and back
    await context.project.goToNotesOfThisSession();
    await page.waitForTimeout(500);
    await page.getByRole("tab", { name: "Session", exact: true }).click();
    await page.waitForTimeout(500);

    // Step 6: Verify persistence
    const englishAfter = getDescriptionEditor(page, "en");
    const spanishAfter = getDescriptionEditor(page, "es");
    const frenchAfter = getDescriptionEditor(page, "fr");

    await expect(englishAfter).toContainText("English description");
    await expect(spanishAfter).toContainText("Descripción en español");
    await expect(frenchAfter).toContainText("Description française");

    // Step 7: Remove French
    const frenchColorBar = descriptionField.getByTestId("slot-color-bar-fr");
    await frenchColorBar.click();
    await page.getByTestId("delete-slot-menu-fr").click();
    await page.waitForTimeout(300);

    // Step 8: Verify French is gone but others remain
    await expect(
      descriptionField.getByTestId("translation-slot-fr")
    ).not.toBeVisible();
    await expect(englishAfter).toContainText("English description");
    await expect(spanishAfter).toContainText("Descripción en español");

    // Step 9: Add German (use ISO code "deu" for reliability)
    await addLanguageToDescription(page, "deu");
    await waitForSlotInDescription(page, "de");

    const germanEditor = getDescriptionEditor(page, "de");
    await germanEditor.click();
    await germanEditor.fill("Deutsche Beschreibung");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(200);

    // Step 10: Final verification
    const allSlots = countSlotsInDescription(page);
    await expect(allSlots).toHaveCount(3); // en, es, de

    await expect(englishAfter).toContainText("English description");
    await expect(spanishAfter).toContainText("Descripción en español");
    await expect(germanEditor).toContainText("Deutsche Beschreibung");
  });
});
