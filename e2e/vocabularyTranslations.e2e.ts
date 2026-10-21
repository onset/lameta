import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { test, expect } from "@playwright/test";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";

/**
 * Helper to add metadata languages to a project that was launched with ELAR config
 */
async function addMetadataLanguages(project: E2eProject, page: Page) {
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

async function switchProjectToELAR(project: E2eProject, page: Page) {
  await project.goToProjectConfiguration();
  await page.locator("#archiveConfigurationName-select").click();
  await page.getByRole("option", { name: "ELAR" }).click();
  await page.locator("button:has-text('Change')").click();
  await page.waitForSelector('[data-testid="project-tab"]', {
    timeout: 10000
  });
}

test.describe("Vocabulary Translations Tab", () => {
  let lameta: LametaE2ERunner | undefined;
  let page!: Page;
  let project!: E2eProject;

  async function startProject(archiveConfig?: string) {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(
      lameta,
      "Test Vocab Translations",
      archiveConfig
    );
    page = lameta.page;
  }

  test.afterEach(async () => {
    if (lameta) {
      await lameta.quit();
      lameta = undefined;
    }
  });

  test("vocabulary translations tab is not shown in default config (no multilingual vocab fields)", async () => {
    await startProject();
    // By default (lameta config), genre is not multilingual
    // Navigate to project tab to check available tabs
    await page.locator('[data-testid="project-tab"]').click();

    // The vocabulary translations tab should not be visible at all
    await expect(
      page.locator('[data-testid="project-vocabulary-translations-tab"]')
    ).not.toBeVisible();
  });

  test("shows vocabulary tab after switching to ELAR and adding metadata languages", async () => {
    await startProject();
    // Switch to ELAR and add metadata languages
    await switchProjectToELAR(project, page);
    await addMetadataLanguages(project, page);

    // Now go to vocabulary translations tab
    await project.goToProjectVocabularyTranslations();

    // Should see the main panel with genres sections (auto-scan happens on load)
    await page.waitForTimeout(2000); // Wait for auto-scan
    await expect(
      page.getByText(
        /The columns here are based on your project's metadata languages/i
      )
    ).toBeVisible();
  });

  test("scans project and shows genres section in ELAR config", async () => {
    await startProject("ELAR");
    // Switch to ELAR and add metadata languages
    await addMetadataLanguages(project, page);

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
    await startProject("ELAR");
    // Switch to ELAR and add metadata languages
    await addMetadataLanguages(project, page);

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
    await startProject("ELAR");
    // Switch to ELAR and add metadata languages
    await addMetadataLanguages(project, page);

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
    await startProject("ELAR");
    // Switch to ELAR and add metadata languages
    await addMetadataLanguages(project, page);

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
    const translationInputs = genreRow.locator(
      'input[type="text"]:not([disabled])'
    );
    const spanishInput = translationInputs.first();
    await spanishInput.fill("Foo bar en español");
    await spanishInput.blur();
    await page.waitForTimeout(500);

    // Go back to the session
    await project.goToSessions();

    // Wait for the session panel to load with the genre field
    const genreFieldAfter = page.locator('[data-testid="genre-chooser"]');
    await genreFieldAfter.waitFor({ state: "visible", timeout: 10000 });

    // Click on the genre chooser to trigger react-select to re-render its value
    // (this forces the SingleValue component to refresh with the new translations)
    await genreFieldAfter.click();
    // Press Escape to close the dropdown without changing the value
    await page.keyboard.press("Escape");

    // The warning icon should now be gone since all translations are complete
    const warningIconAfter = genreFieldAfter.locator(
      'svg[data-testid="WarningIcon"]'
    );
    await expect(warningIconAfter).not.toBeVisible({ timeout: 10000 });
  });
});
