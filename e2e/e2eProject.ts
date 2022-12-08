import * as fs from "fs";
import * as Path from "path";
import { ElectronApplication, Page, _electron as electron } from "playwright";
import { test, expect as expect, TestInfo } from "@playwright/test";
import { Lameta } from "./Lameta";

export async function createNewProject(
  lameta: Lameta,
  name: string
): Promise<E2eProject> {
  const p = new E2eProject(lameta);
  await p.createNewProject(name);
  return p;
}
export class E2eProject {
  public page: Page;
  public lameta: Lameta;
  public projectDirectory: string;
  public constructor(lameta: Lameta) {
    this.lameta = lameta;
    this.page = lameta.page;
  }

  public async createNewProject(projectName: string) {
    await this.page.locator("#creatNewProjectLink").click();
    await this.page.locator("#projectNameInput").fill(projectName);
    this.projectDirectory = Path.join(process.env.E2ERoot!, projectName);
    const ok = await this.page.getByRole("button", { name: "OK" });
    expect(ok).toBeEnabled();
    ok.click();
    return await this.lameta.electronApp.firstWindow();
  }
  public async goToSessions() {
    await this.page.getByText("Sessions").click();
  }
  public async goToPeople() {
    await this.page.getByRole("tab", { name: "People" }).click();
  }
  public async addSession() {
    await this.page.getByRole("button", { name: "New Session" }).click();
  }

  public async addFile(name: string) {
    const p = Path.join(process.env.E2ERoot!, name); // creating it at our test root, which is a level above the lameta project directory
    fs.writeFileSync(p, "hello world");
    this.lameta.mockShowOpenDialog([p]);

    await this.page.getByRole("button", { name: "Add Files" }).click(); // await page.getByRole('gridcell', { name: 'New Session.session' }).click();
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
