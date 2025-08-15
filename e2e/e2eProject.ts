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
    //await this.page.getByTitle(projectName, { exact: false }).waitFor();
    const w = await this.lameta.electronApp.firstWindow();
    // wait until the window title contains the project name
    // await w.waitForFunction(
    //   async (params) => {
    //     const title = await params.w.title();
    //     return title.includes(params.projectName);
    //   },
    //   { projectName, w }
    // );
    // I couldn't get the above to work, so I'm just waiting a fixed amount of time
    await new Promise((resolve) => setTimeout(resolve, 1000));

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
