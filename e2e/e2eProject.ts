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
    await this.page.locator("#projectNameInput").fill(projectName);
    this.projectDirectory = Path.join(
      process.env.E2ERoot!,
      "lameta",
      projectName
    );
    const ok = await this.page.getByRole("button", { name: "Create" });
    expect(ok).toBeEnabled();
    ok.click();
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
    await this.page.getByTestId("project-configuration").click();
  }
  public async goToSessions() {
    await this.page.getByTestId("sessions-tab").click();
  }
  public async goToPeople() {
    await this.page.getByTestId("people-tab").click();
  }
  public async addSession() {
    await this.page.getByTestId("new-session-button").click();
  }
  public async addPerson() {
    await this.page.getByTestId("new-person-button").click();
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
