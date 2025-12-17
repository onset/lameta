import * as Path from "path";
import { Page } from "playwright-core";
import { expect as expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
const { _electron: electron } = require("playwright");
export async function createNewProject(
  lameta: LametaE2ERunner,
  name: string
): Promise<E2eProject> {
  const p = new E2eProject(lameta);
  await p.createNewProject(name);
  return p;
}
export class E2eProject {
  public page: Page;
  public lameta: LametaE2ERunner;
  public projectDirectory: string;
  public constructor(lameta: LametaE2ERunner) {
    this.lameta = lameta;
    this.page = lameta.page;
  }

  public async createNewProject(projectName: string) {
    // console.log(
    //   "**** createNewProject: attempting to create new project at " +
    //     projectName
    // );
    await this.page.locator("#creatNewProjectLink").click();
    const nameInput = this.page.locator("#projectNameInput");
    await nameInput.waitFor({ state: "visible" });
    await nameInput.fill(projectName);
    const ok = this.page.getByRole("button", { name: "Create" });
    // If the button is disabled (e.g. duplicate name from a previous test run), mutate the name until enabled.
    for (let i = 0; i < 5; i++) {
      if (await ok.isEnabled()) break;
      // append a short random suffix and try again
      projectName = projectName + "-" + Math.floor(Math.random() * 1000);
      await nameInput.fill(projectName);
      await this.page.waitForTimeout(50);
    }
    expect(ok).toBeEnabled();
    this.projectDirectory = Path.join(
      process.env.E2ERoot!,
      "lameta",
      projectName
    );
    await ok.click();
    const w = await this.lameta.electronApp.firstWindow();
    // Wait for the workspace UI to be ready - the project tab is always visible after project load
    await this.page
      .getByTestId("project-tab")
      .waitFor({ state: "visible", timeout: 10000 });

    return w;
  }

  public async goToNotesOfThisSession() {
    //  await this.page.getByTestId("notes-tab").click();
    await this.page.getByRole("tab", { name: "Notes" }).click();
  }
  public async goToContributorsOfThisSession() {
    //await this.page.getByTestId("contributors-tab").click();
    await this.page.getByRole("tab", { name: "Contributors" }).click();
  }
  public async goToProject() {
    await this.page.getByTestId("project-tab").click();
  }
  public async goToProjectAbout() {
    await this.goToProject();
    await this.page.getByTestId("project-about").click();
  }
  public async goToProjectConfiguration() {
    await this.goToProject();
    await this.page.getByTestId("project-configuration-tab").click();
  }
  public async goToProjectLanguages() {
    await this.goToProject();
    await this.page.getByTestId("project-collection-languages-tab").click();
  }
  public async goToProjectVocabularyTranslations() {
    await this.goToProject();
    await this.page.getByTestId("project-vocabulary-translations-tab").click();
    // Wait for the vocabulary translations tab to load
    await this.page
      .getByTestId("vocabulary-translations-panel")
      .waitFor({ state: "visible", timeout: 10000 });
  }
  public async goToProjectCollection() {
    await this.goToProject();
    await this.page.getByTestId("project-collection-tab").click();
  }
  public async goToSessions() {
    await this.page.getByTestId("sessions-tab").click();
    // Wait for the sessions tab UI to be ready - specifically the New Session button
    await this.page
      .getByTestId("new-session-button")
      .waitFor({ state: "visible", timeout: 10000 });
  }
  public async goToPeople() {
    await this.page.getByTestId("people-tab").click();
    // Wait for the people tab UI to be ready - specifically the New Person button
    await this.page
      .getByTestId("new-person-button")
      .waitFor({ state: "visible", timeout: 10000 });
  }
  public async addSession() {
    await this.page.getByTestId("new-session-button").click();
  }
  public async addPerson(name?: string) {
    await this.page.getByTestId("new-person-button").click();

    if (name) {
      await this.setPersonName(name);
    }
  }

  /**
   * Sets the value of a closed-choice/select field by its name (e.g., "Country").
   * Looks for a native <select name="{fieldName}"> and selects the option by its visible label.
   * Fails fast if the select is not visible within a reasonable timeout.
   */
  public async setChooserFieldValue(fieldName: string, optionLabel: string) {
    const select = this.page.locator(`select[name='${fieldName}']`).first();
    await select.waitFor({ state: "visible", timeout: 10000 });
    await select.click();
    await select.selectOption({ label: optionLabel });
    // brief settle
    await this.page.waitForTimeout(150);
  }

  /**
   * Sets the name of the currently selected person
   * @param name The name to set for the person
   */
  public async setPersonName(name: string) {
    // Wait for person form to load - look for the contentEditable div with role="textbox"
    await this.page.waitForSelector('[role="textbox"]', { timeout: 10000 });

    // Find the name field (it should be the first contentEditable textbox)
    const nameField = this.page.locator('[role="textbox"]').first();
    await nameField.click();
    await nameField.fill(name);

    // Wait a moment for the form to process the change
    await this.page.waitForTimeout(500);
  }

  /**
   * Adds a language to the currently selected person
   * @param languageName The language name to add (e.g., "Dadi Dadi")
   */
  public async addPersonLanguage(languageName: string) {
    // Wait for form to be ready
    await this.page.waitForTimeout(1000);

    // The PersonLanguageList automatically shows an empty language slot if there are no languages
    const languageSelector = this.page.locator(
      '.select input[role="combobox"]'
    );
    const languageSelectorVisible = await languageSelector.isVisible();

    if (!languageSelectorVisible) {
      throw new Error(
        "Language selector not visible - person form may not be loaded"
      );
    }

    // Fill in the language using AsyncSelect
    const languageInput = this.page
      .locator('.select input[role="combobox"]')
      .first();
    await languageInput.click();
    await languageInput.fill(languageName);

    // Wait for dropdown options and select by pressing Enter
    await this.page.waitForTimeout(300); // let the debounced search trigger
    await languageInput.press("Enter");

    // Wait for the language to be saved
    await this.page.waitForTimeout(500);
  }

  /**
   * Selects a person by name from the people list
   * @param personName The name pattern to match (regex supported)
   */
  public async selectPerson(personName: string | RegExp) {
    await this.page
      .getByRole("gridcell", { name: personName })
      .first()
      .waitFor({ state: "visible", timeout: 10000 });
    await this.page.getByRole("gridcell", { name: personName }).first().click();
  }

  /* I haven't been able to control the context menu. I can open it, but playwright doens't see it and 
  keyboard presses seem to just dismiss it.
  public async deleteFile(name: string) {
    //await this.page.pause();
    await this.page.getByRole("gridcell", { name: name }).click({
      button: "right",
    });

    //await this.page.getByText("Delete File...").waitFor();
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    await delay(3000);
    //await this.page.getByText("Delete File...").click(); // await page.getByRole('gridcell', { name: 'New Session.session' }).click();
    //await this.page.getByRole("button", { name: "Delete" }).click();
    await this.page.keyboard.press("ArrowDown");
    await this.page.keyboard.press("ArrowDown");
    await this.page.keyboard.press("ArrowDown");
    await this.page.keyboard.press("ArrowDown");
    await this.page.keyboard.press("Enter");
    await this.page.pause();
    await this.page.getByRole("dialog").waitFor({ state: "hidden" });
    
  }
  */
}

import { LaunchOptions } from "./lametaE2ERunner";

/**
 * Launch lameta with fast project creation, bypassing registration and start screen UI.
 * This significantly speeds up E2E tests by creating the project directly.
 *
 * @param lameta - The LametaE2ERunner instance
 * @param projectName - Name for the auto-created project
 * @param archiveConfig - Optional archive configuration (e.g., "ELAR", "PARADISEC")
 * @returns An E2eProject instance ready for testing
 *
 * @example
 * ```typescript
 * // Basic usage - creates project with default (lameta) configuration
 * project = await launchWithProject(lameta, "MyTestProject");
 *
 * // With ELAR configuration - no need to navigate UI to set archive
 * project = await launchWithProject(lameta, "ElarProject", "ELAR");
 * ```
 */
export async function launchWithProject(
  lameta: LametaE2ERunner,
  projectName: string,
  archiveConfig?: string
): Promise<E2eProject> {
  await lameta.launch({ projectName, archiveConfig });

  // Wait for the workspace UI to be ready
  await lameta.page
    .getByTestId("project-tab")
    .waitFor({ state: "visible", timeout: 15000 });

  const project = new E2eProject(lameta);
  project.projectDirectory = lameta.projectDirectory;
  return project;
}

