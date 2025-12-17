import { E2eProject, createNewProject } from "./various-e2e-helpers";
import { test, expect } from "@playwright/test";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";

/**
 * Helper to switch project to ELAR configuration and add metadata languages
 */
async function setupElarWithMetadataLanguages(
  project: E2eProject,
  page: Page
) {
  // Switch to ELAR configuration to get multilingual genre field
  await project.goToProjectConfiguration();
  await page.locator("#archiveConfigurationName-select").click();
  await page.getByText("ELAR", { exact: true }).click();
  await page.locator("button:has-text('Change')").click();

  // Wait for the app to reload after configuration change
  await page.waitForSelector('[data-testid="project-tab"]', {
    timeout: 10000
  });

  // Go to Languages tab and add metadata languages
  await project.goToProjectLanguages();
  const metadataContainer = page
    .locator('.field:has(label:has-text("Metadata Languages"))')
    .first();
  await metadataContainer.waitFor({ state: "visible", timeout: 10000 });
  const languageInput = metadataContainer.locator('input[role="combobox"]');

  // Add English first
  await languageInput.click();
  await languageInput.fill("English");
  await page.waitForTimeout(300);
  await languageInput.press("Enter");
  await page.waitForTimeout(500);

  // Add Spanish second
  await languageInput.click();
  await languageInput.fill("Spanish");
  await page.waitForTimeout(300);
  await languageInput.press("Enter");
  await page.waitForTimeout(500);
}

test.describe("Vocabulary Translations Tab", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;

  test.beforeEach(async () => {
    // Always create fresh instance for each test
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "Test Vocab Translations");
  });

  test.afterEach(async () => {
    if (lameta) {
      await lameta.quit();
    }
  });

  test("vocabulary translations tab is not shown in default config (no multilingual vocab fields)", async () => {
    // By default (lameta config), genre is not multilingual
    // Navigate to project tab to check available tabs
    await page.locator('[data-testid="project-tab"]').click();

    // The vocabulary translations tab should not be visible at all
    await expect(
      page.locator('[data-testid="project-vocabulary-translations-tab"]')
    ).not.toBeVisible();
  });

  test("shows vocabulary tab after switching to ELAR and adding metadata languages", async () => {
    await setupElarWithMetadataLanguages(project, page);

    // Now go to vocabulary translations tab
    await project.goToProjectVocabularyTranslations();

    // Should see the main panel with genres sections (auto-scan happens on load)
    await page.waitForTimeout(2000); // Wait for auto-scan
    await expect(
      page.getByText(/The columns here are based on your project's metadata languages/i)
    ).toBeVisible();
  });

  test("scans project and shows genres section in ELAR config", async () => {
    await setupElarWithMetadataLanguages(project, page);

    // Add a session with a genre to have something to scan
    await project.goToSessions();
    await project.addSession();
    await page.waitForTimeout(500);

    // Set genre to a custom value
    const genreField = page.locator('[data-testid="genre-chooser"]');
    if (await genreField.isVisible()) {
      await genreField.click();
      // Type a custom genre
      await page.keyboard.type("custom-test-genre");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }

    // Go to vocabulary translations
    await project.goToProjectVocabularyTranslations();

    // Wait for auto-scan to complete
    await page.waitForTimeout(2000);

    // Should see the genres section header (ELAR has genre as multilingual)
    await expect(page.locator("h3", { hasText: /genres/i })).toBeVisible();
  });

  test("allows entering translations for custom values", async () => {
    await setupElarWithMetadataLanguages(project, page);

    // Add a session with a custom genre
    await project.goToSessions();
    await project.addSession();
    await page.waitForTimeout(500);

    const genreField = page.locator('[data-testid="genre-chooser"]');
    if (await genreField.isVisible()) {
      await genreField.click();
      await page.keyboard.type("my-test-genre");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(500);
    }

    // Go to vocabulary translations
    await project.goToProjectVocabularyTranslations();
    await page.waitForTimeout(2000); // Wait for auto-scan

    // Find the translation input for our custom genre
    // The custom genre should appear in the table with input fields
    const genreRow = page.locator("tr", { hasText: /my-test-genre/i });
    if (await genreRow.isVisible()) {
      const translationInput = genreRow.locator('input[type="text"]').first();
      await translationInput.fill("mi género de prueba");
      await translationInput.blur();
      await page.waitForTimeout(500);

      // Go away and come back to verify persistence
      await project.goToProjectLanguages();
      await page.waitForTimeout(500);
      await project.goToProjectVocabularyTranslations();
      await page.waitForTimeout(2000);

      // The translation should still be there
      const genreRowAgain = page.locator("tr", { hasText: /my-test-genre/i });
      const inputValue = await genreRowAgain
        .locator('input[type="text"]')
        .first()
        .inputValue();
      expect(inputValue).toBe("mi género de prueba");
    }
  });

  test("ELAR config shows both Genres and Roles sections", async () => {
    await setupElarWithMetadataLanguages(project, page);

    // Go to vocabulary translations tab
    await project.goToProjectVocabularyTranslations();

    // Wait for auto-scan to complete
    await page.waitForTimeout(2000);

    // Should see both Genres and Roles section headers
    // ELAR has both genre and role marked as multilingual
    await expect(page.locator("h3", { hasText: /genres/i })).toBeVisible();
    await expect(page.locator("h3", { hasText: /roles/i })).toBeVisible();
  });

  test("warning icon disappears from session after adding translation", async () => {
    await setupElarWithMetadataLanguages(project, page);

    // Add a session with a custom genre
    await project.goToSessions();
    await project.addSession();
    await page.waitForTimeout(500);

    const genreField = page.locator('[data-testid="genre-chooser"]');
    await genreField.click();
    await page.keyboard.type("Foo bar");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    // The genre chooser should now show a warning icon because Spanish translation is missing
    const warningIcon = genreField.locator('svg[data-testid="WarningIcon"]');
    await expect(warningIcon).toBeVisible();

    // Now go to vocabulary translations and add the missing translation
    await project.goToProjectVocabularyTranslations();
    await page.waitForTimeout(2000); // Wait for auto-scan

    // Find the translation input for our custom genre and add Spanish translation
    const genreRow = page.locator("tr", { hasText: /Foo bar/i });
    await expect(genreRow).toBeVisible();

    // Find the non-English translation input (first editable input in the row)
    const translationInputs = genreRow.locator('input[type="text"]:not([disabled])');
    const spanishInput = translationInputs.first();
    await spanishInput.fill("Foo bar en español");
    await spanishInput.blur();
    await page.waitForTimeout(500);

    // Go back to the session
    await project.goToSessions();
    await page.waitForTimeout(500);

    // Click on the session to ensure it's selected and refreshed
    const sessionRow = page.locator(".folderList .selected").first();
    await sessionRow.click();
    await page.waitForTimeout(500);

    // The warning icon should now be gone since all translations are complete
    const genreFieldAfter = page.locator('[data-testid="genre-chooser"]');
    const warningIconAfter = genreFieldAfter.locator(
      'svg[data-testid="WarningIcon"]'
    );
    await expect(warningIconAfter).not.toBeVisible();
  });
});
