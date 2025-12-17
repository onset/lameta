import { Page, Locator, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import {
  createNewProject,
  launchWithProject,
  E2eProject
} from "./various-e2e-helpers";

/**
 * Helpers for multilingual text field e2e tests.
 *
 * IMPORTANT: These tests run in ELAR configuration which has multiple
 * multilingual fields on the session page (Title, Description, Access Explanation,
 * Keywords, Topic). Always scope selectors to a specific field to avoid ambiguity.
 *
 * DESIGN: Use DOM-based waits instead of hardcoded timeouts wherever possible.
 */

// Get the Description field locator - use this to scope selectors
export function getDescriptionField(page: Page): Locator {
  return page.locator('.field:has(label:text("Description"))');
}

// Get the Title field locator
export function getTitleField(page: Page): Locator {
  return page.locator('.field:has(label:text("Title"))');
}

// Get all translation slots in Description field
export function getDescriptionSlots(page: Page): Locator {
  return getDescriptionField(page).locator(
    '[data-testid^="translation-slot-"]'
  );
}

// Get a specific translation slot in Description field
export function getDescriptionSlot(page: Page, code: string): Locator {
  return getDescriptionField(page).getByTestId(`translation-slot-${code}`);
}

// Get a specific color bar in Description field
export function getDescriptionColorBar(page: Page, code: string): Locator {
  return getDescriptionField(page).getByTestId(`slot-color-bar-${code}`);
}

// Hover over the Description field to ensure UI is ready
export async function hoverOverDescriptionField(page: Page) {
  const descriptionField = getDescriptionField(page);
  const fieldBorder = descriptionField.locator(".field-value-border").first();
  await fieldBorder.hover();
}

/**
 * Add a language to the Description field via color bar menu.
 * Uses the menu since the standalone add button has been removed.
 * @param fromSlotCode The language code of the slot whose color bar to click (e.g., "en")
 * @param typeThis The ISO 639-3 code to type (e.g., "spa", "fra", "deu")
 * @param expectedBcp47 The expected BCP47 code in the new slot's data-testid (e.g., "es", "fr", "de")
 */
export async function addLanguageViaMenu(
  page: Page,
  fromSlotCode: string,
  typeThis: string,
  expectedBcp47: string
) {
  const descriptionField = getDescriptionField(page);

  // Click color bar to open menu
  const colorBar = descriptionField.getByTestId(
    `slot-color-bar-${fromSlotCode}`
  );
  await colorBar.click();

  // Click "Add language slot" menu item
  const addMenuItem = page.getByTestId(
    `add-language-slot-menu-${fromSlotCode}`
  );
  await addMenuItem.click();

  // Wait for menu to close and the cancel button to appear (indicates language chooser is ready)
  await page
    .locator(".MuiMenu-root")
    .waitFor({ state: "hidden", timeout: 3000 })
    .catch(() => {});

  const cancelBtn = page.getByTestId("cancel-add-translation");
  await cancelBtn.waitFor({ state: "visible", timeout: 3000 });

  // Find the language input that's in the description field
  const languageInput = descriptionField
    .locator('.select input[role="combobox"]')
    .first();

  // Wait for input to be ready (it gets created when isAdding becomes true)
  await languageInput.waitFor({ state: "visible", timeout: 3000 });

  // Check if input has focus (autoFocus should focus it)
  const focused = await languageInput.evaluate(
    (el) => document.activeElement === el
  );

  // Click to focus if not already
  if (!focused) {
    await languageInput.click();
  }

  // Use keyboard to type (pressSequentially types keys one by one, triggering the async search)
  await languageInput.pressSequentially(typeThis, { delay: 100 });
  await languageInput.press("Enter");

  // Wait for the new slot to appear (DOM-based wait)
  await getDescriptionSlot(page, expectedBcp47).waitFor({ timeout: 5000 });
}

// Get the editor for a specific language slot in Description
export function getDescriptionEditor(page: Page, langCode: string): Locator {
  const descriptionField = getDescriptionField(page);
  const slot = descriptionField.getByTestId(`translation-slot-${langCode}`);
  return slot.locator('[contenteditable="true"]');
}

/**
 * Delete a language slot from Description via color bar menu.
 * Waits for the slot to disappear (DOM-based, no hardcoded timeout).
 */
export async function deleteLanguageFromDescription(
  page: Page,
  langCode: string
) {
  const descriptionField = getDescriptionField(page);
  const slot = descriptionField.getByTestId(`translation-slot-${langCode}`);
  const colorBar = descriptionField.getByTestId(`slot-color-bar-${langCode}`);
  await colorBar.click();
  const deleteMenuItem = page.getByTestId(`delete-slot-menu-${langCode}`);
  await deleteMenuItem.click();

  // Wait for the slot to disappear (DOM-based wait)
  await slot.waitFor({ state: "hidden", timeout: 3000 });
}

// Count slots in Description field
export function countSlotsInDescription(page: Page): Locator {
  const descriptionField = getDescriptionField(page);
  return descriptionField.locator('[data-testid^="translation-slot-"]');
}

/**
 * Type text in a language slot editor and blur to save.
 * Uses Tab key to blur and waits for the save to register.
 */
export async function typeInSlotAndBlur(
  page: Page,
  langCode: string,
  text: string
) {
  const editor = getDescriptionEditor(page, langCode);
  await editor.click();
  await editor.fill(text);
  await page.keyboard.press("Tab");
  // Wait for any potential save indicator, or just verify the text stuck
  await expect(editor).toHaveText(text);
}

/**
 * Fill a language chooser input with a language code and select it.
 * Uses DOM-based wait for the dropdown to appear instead of hardcoded timeout.
 * @param languageInput The language chooser input locator
 * @param languageCodeOrName The ISO code or name to type (e.g., "spa", "Spanish")
 */
export async function fillLanguageChooserAndSelect(
  page: Page,
  languageInput: Locator,
  languageCodeOrName: string
) {
  await languageInput.fill(languageCodeOrName);
  // Wait for dropdown to appear (DOM-based wait instead of hardcoded 300ms timeout)
  // Use a try-catch with timeout since different contexts may show dropdown differently
  try {
    await page
      .locator(".select__menu")
      .waitFor({ state: "visible", timeout: 2000 });
  } catch {
    // Dropdown may not appear if no matches or different component - continue anyway
  }
  await languageInput.press("Enter");
}

/**
 * Setup context for multilingual tests.
 * Creates a new project and switches to ELAR configuration.
 */
export interface MultilingualTestContext {
  lameta: LametaE2ERunner;
  page: Page;
  project: E2eProject;
}

/**
 * Setup context for multilingual tests.
 * Creates a new project and switches to ELAR configuration.
 * @param testName - Name for the test project
 * @param metadataLanguages - Array of ISO 639-3 codes (e.g., ["eng", "spa"]) to set as metadata languages.
 *                            Pass 2+ languages to enable multilingual slots in the UI.
 *                            Pass empty array to skip metadata language setup.
 */
export async function setupMultilingualTestContext(
  testName: string,
  metadataLanguages: string[]
): Promise<MultilingualTestContext> {
  const lameta = new LametaE2ERunner();
  const page = await lameta.launch();
  await lameta.cancelRegistration();
  const project = await createNewProject(lameta, `${testName}_${Date.now()}`);

  // Switch to ELAR configuration to get the multilingual description field
  await project.goToProjectConfiguration();
  await page.locator("#archiveConfigurationName-select").click();
  await page.getByText("ELAR", { exact: true }).click();
  await page.locator("button:has-text('Change')").click();

  // Wait for the app to reload after configuration change
  await page.waitForSelector('[data-testid="project-tab"]', {
    timeout: 10000
  });

  // Set up Metadata Languages if any were specified
  // Metadata Languages are what determine the multilingual slots in the UI
  if (metadataLanguages.length > 0) {
    await project.goToProjectLanguages();
    const metadataContainer = page
      .locator('.field:has(label:has-text("Metadata Languages"))')
      .first();
    await metadataContainer.waitFor({ state: "visible", timeout: 10000 });
    const metadataInput = metadataContainer
      .locator('.select input[role="combobox"]')
      .first();

    for (const langCode of metadataLanguages) {
      await metadataInput.click();
      await fillLanguageChooserAndSelect(page, metadataInput, langCode);
    }
  }

  return { lameta, page, project };
}

export async function teardownMultilingualTestContext(
  context: MultilingualTestContext
) {
  if (context?.lameta) {
    await context.lameta.quit();
  }
}

/**
 * Setup context for multilingual tests using fast launch (bypasses registration UI).
 * Creates a new project with ELAR configuration directly.
 * @param testName - Name for the test project
 * @param metadataLanguages - Array of ISO 639-3 codes (e.g., ["eng", "spa"]) to set as metadata languages.
 *                            Pass 2+ languages to enable multilingual slots in the UI.
 *                            Pass empty array to skip metadata language setup.
 */
export async function setupMultilingualTestContextFast(
  testName: string,
  metadataLanguages: string[]
): Promise<MultilingualTestContext> {
  const lameta = new LametaE2ERunner();
  // Use fast launch with ELAR configuration
  const project = await launchWithProject(
    lameta,
    `${testName}_${Date.now()}`,
    "ELAR"
  );
  const page = lameta.page;

  // Set up Metadata Languages if any were specified
  // Metadata Languages are what determine the multilingual slots in the UI
  if (metadataLanguages.length > 0) {
    await project.goToProjectLanguages();
    const metadataContainer = page
      .locator('.field:has(label:has-text("Metadata Languages"))')
      .first();
    await metadataContainer.waitFor({ state: "visible", timeout: 10000 });
    const metadataInput = metadataContainer
      .locator('.select input[role="combobox"]')
      .first();

    for (const langCode of metadataLanguages) {
      await metadataInput.click();
      await fillLanguageChooserAndSelect(page, metadataInput, langCode);
    }
  }

  return { lameta, page, project };
}

// Wait for the session form to load (specifically the Description field)
export async function waitForSessionForm(page: Page, timeout = 10000) {
  // Wait for the Description field label to be visible
  await page.waitForSelector('.field:has(label:text("Description"))', {
    timeout
  });
}
