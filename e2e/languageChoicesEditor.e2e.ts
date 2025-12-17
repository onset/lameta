import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

/**
 * Comprehensive tests for the Subject/Working Languages chooser (LanguageChoicesEditor).
 * Tests the multi-select language picker used on Project > Languages tab.
 *
 * These tests cover:
 * - Bug fix: After selecting a language, the display shows the full name (not just ISO code)
 * - Bug fix: After deleting a language, it should still be available to add again
 * - General functionality: adding, deleting, and displaying languages
 */
test.describe("LanguageChoicesEditor (Subject/Working Languages)", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "LanguageChoicesEditorTest");
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  /**
   * Helper to get the Subject Languages container
   */
  function getSubjectLanguagesContainer() {
    return page
      .locator('div.field:has(label:has-text("Subject Languages"))')
      .first();
  }

  /**
   * Helper to get the Working Languages container
   */
  function getWorkingLanguagesContainer() {
    return page
      .locator('div.field:has(label:has-text("Working Languages"))')
      .first();
  }

  /**
   * Helper to get the input inside a language container
   */
  function getLanguageInput(container) {
    return container.locator('.select input[role="combobox"]').first();
  }

  /**
   * Helper to add a language by typing and pressing Enter
   */
  async function addLanguageByTyping(container, searchText: string) {
    const input = getLanguageInput(container);
    await input.click();
    await input.fill(searchText);
    await page.waitForTimeout(300); // let async options load
    await input.press("Enter");
    await page.waitForTimeout(200); // let UI update
  }

  /**
   * Helper to add a language by clicking on a specific option
   */
  async function addLanguageByClicking(container, searchText: string) {
    const input = getLanguageInput(container);
    await input.click();
    await input.fill(searchText);
    await page.waitForTimeout(300); // let async options load

    // Find and click the matching option
    const option = page.getByRole("option").first();
    await option.waitFor({ state: "visible", timeout: 3000 });
    await option.click();
    await page.waitForTimeout(200);
  }

  /**
   * Helper to delete a language from the container
   */
  async function deleteLanguage(container, languageNamePattern: string | RegExp) {
    const removeButton = container.getByRole("button", {
      name: new RegExp(`Remove.*${languageNamePattern}`, "i")
    });
    await removeButton.click();
    await page.waitForTimeout(200);
  }

  test("selecting Portuguese by name should display full name, not ISO code", async () => {
    // This tests the fix for Bug #1: language displayed as "por" instead of "Portuguese"
    await project.goToProjectLanguages();

    const container = getSubjectLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    // Type "Portuguese" and select it
    await addLanguageByClicking(container, "Portuguese");

    // The pill should show "Portuguese" (the full name), not just "por"
    // Look for the remove button which shows the language name
    const removeButton = container.getByRole("button", {
      name: /Remove.*Portuguese/i
    });
    await expect(removeButton).toBeVisible({ timeout: 5000 });

    // Also verify the pill text includes "Portuguese"
    const pillText = await container.locator('[class*="multiValue"]').first().textContent();
    expect(pillText).toContain("Portuguese");
    // Should NOT be just "porpor" (which would indicate the bug)
    expect(pillText).not.toBe("porpor");
  });

  test("deleting a language and re-adding it should work", async () => {
    // This tests the fix for Bug #2: deleted language not available to add again
    await project.goToProjectLanguages();

    const container = getSubjectLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    // Add French
    await addLanguageByTyping(container, "French");
    
    // Verify it was added
    const frenchRemoveButton = container.getByRole("button", {
      name: /Remove.*French/i
    });
    await expect(frenchRemoveButton).toBeVisible({ timeout: 5000 });

    // Delete French
    await deleteLanguage(container, "French");

    // Verify it's gone
    await expect(frenchRemoveButton).not.toBeVisible();

    // Now add French again - this should work (Bug #2 fix)
    await addLanguageByTyping(container, "French");

    // Verify it was added again
    const frenchRemoveButton2 = container.getByRole("button", {
      name: /Remove.*French/i
    });
    await expect(frenchRemoveButton2).toBeVisible({ timeout: 5000 });
  });

  test("dropdown should show language names with ISO codes", async () => {
    await project.goToProjectLanguages();

    const container = getWorkingLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    const input = getLanguageInput(container);
    await input.click();
    await input.fill("Spanish");
    await page.waitForTimeout(300);

    // The dropdown should show options with full language names
    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 3000 });

    // Check that at least one option contains "Spanish"
    const optionText = await options.first().textContent();
    expect(optionText).toContain("Spanish");
    expect(optionText).toContain("spa"); // ISO code should also be visible
  });

  test("selecting by ISO code should display full language name", async () => {
    await project.goToProjectLanguages();

    const container = getWorkingLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    // Type the ISO code "deu" for German
    await addLanguageByTyping(container, "deu");

    // The pill should show "German" (or "Standard German"), not just "deu"
    const pillText = await container.locator('[class*="multiValue"]').first().textContent();
    expect(pillText).toContain("German");
    expect(pillText).not.toBe("deudeu"); // Should not be just the code repeated
  });

  test("can add multiple languages", async () => {
    await project.goToProjectLanguages();

    const container = getWorkingLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    // Add Italian and Dutch
    await addLanguageByTyping(container, "Italian");
    await addLanguageByTyping(container, "Dutch");

    // Verify both are present
    await expect(container.getByRole("button", { name: /Remove.*Italian/i })).toBeVisible();
    await expect(container.getByRole("button", { name: /Remove.*Dutch/i })).toBeVisible();
  });

  test("languages with commas should display correctly", async () => {
    // German is stored as "German, Standard" in the index
    // It should display as "Standard German" (parts swapped)
    await project.goToProjectLanguages();

    const container = getWorkingLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    // Look for any pill that contains "German"
    // (German might have been added by a previous test via "deu")
    const germanPill = container
      .locator('[class*="multiValue"]')
      .filter({ hasText: "German" })
      .first();

    // If no German pill exists, add one
    if (!(await germanPill.isVisible())) {
      await addLanguageByTyping(container, "German");
    }

    // Check the pill text doesn't contain a comma (parts should be swapped)
    const pillText = await germanPill.textContent();
    
    // Should be "Standard German" not "German, Standard"
    expect(pillText).not.toContain(",");
    expect(pillText).toContain("German");
  });

  test("clearing search and retyping should still show results", async () => {
    await project.goToProjectLanguages();

    const container = getSubjectLanguagesContainer();
    await container.waitFor({ state: "visible", timeout: 10000 });

    const input = getLanguageInput(container);

    // Type something
    await input.click();
    await input.fill("Russian");
    await page.waitForTimeout(300);

    // Verify options appear
    let options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 3000 });

    // Clear and type something else
    await input.fill("");
    await page.waitForTimeout(100);
    await input.fill("Japanese");
    await page.waitForTimeout(300);

    // Verify new options appear
    options = page.getByRole("option");
    await expect(options.first()).toBeVisible({ timeout: 3000 });
    const optionText = await options.first().textContent();
    expect(optionText).toContain("Japanese");
  });
});
