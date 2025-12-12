import { Page, Locator, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";

/**
 * Helpers for multilingual text field e2e tests.
 *
 * IMPORTANT: These tests run in ELAR configuration which has multiple
 * multilingual fields on the session page (Title, Description, Access Explanation,
 * Keywords, Topic). Always scope selectors to a specific field to avoid ambiguity.
 */

// Get the Description field locator - use this to scope selectors
export function getDescriptionField(page: Page): Locator {
  return page.locator('.field:has(label:text("Description"))');
}

// Get the Title field locator
export function getTitleField(page: Page): Locator {
  return page.locator('.field:has(label:text("Title"))');
}

// Make the + button visible by hovering over the Description multilingual field
export async function hoverToShowAddButton(page: Page) {
  const descriptionField = getDescriptionField(page);
  const fieldBorder = descriptionField.locator(".field-value-border").first();
  await fieldBorder.hover();
}

// Wait for a translation slot to appear within Description field
export async function waitForSlotInDescription(
  page: Page,
  langCode: string,
  timeout = 5000
) {
  const descriptionField = getDescriptionField(page);
  await descriptionField
    .locator(`[data-testid="translation-slot-${langCode}"]`)
    .waitFor({ timeout });
}

// Add a language to the Description field
export async function addLanguageToDescription(
  page: Page,
  langCodeOrName: string
) {
  const descriptionField = getDescriptionField(page);

  // Hover to show the + button
  await hoverToShowAddButton(page);

  // Click Add translation
  const addTranslationBtn = descriptionField.getByTestId(
    "add-translation-button"
  );
  await expect(addTranslationBtn).toBeVisible();
  await addTranslationBtn.click();

  // Type in a language and select it
  const languageInput = descriptionField
    .locator('.select input[role="combobox"]')
    .first();
  await languageInput.fill(langCodeOrName);
  await page.waitForTimeout(300); // wait for debounce
  await languageInput.press("Enter");
}

// Get the editor for a specific language slot in Description
export function getDescriptionEditor(page: Page, langCode: string): Locator {
  const descriptionField = getDescriptionField(page);
  const slot = descriptionField.getByTestId(`translation-slot-${langCode}`);
  return slot.locator('[contenteditable="true"]');
}

// Delete a language slot from Description via color bar menu
export async function deleteLanguageFromDescription(
  page: Page,
  langCode: string
) {
  const descriptionField = getDescriptionField(page);
  const colorBar = descriptionField.getByTestId(`slot-color-bar-${langCode}`);
  await colorBar.click();
  const deleteMenuItem = page.getByTestId(`delete-slot-menu-${langCode}`);
  await deleteMenuItem.click();
  await page.waitForTimeout(300);
}

// Count slots in Description field
export function countSlotsInDescription(page: Page): Locator {
  const descriptionField = getDescriptionField(page);
  return descriptionField.locator('[data-testid^="translation-slot-"]');
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

export async function setupMultilingualTestContext(
  testName: string
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

  return { lameta, page, project };
}

export async function teardownMultilingualTestContext(
  context: MultilingualTestContext
) {
  await context.lameta.quit();
}

// Wait for the session form to load (specifically the Description field)
export async function waitForSessionForm(page: Page, timeout = 10000) {
  await page.waitForSelector('[data-testid="field-description-edit"]', {
    timeout
  });
}
