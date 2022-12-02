import * as fs from "fs";
import * as Path from "path";
import { ElectronApplication, Page, _electron as electron } from "playwright";
import { test, expect as expect, TestInfo } from "@playwright/test";
import { Lameta } from "./Lameta";

export class E2eProject {
  public page: Page;
  public lameta: Lameta;
  public constructor(lameta: Lameta) {
    this.lameta = lameta;
    this.page = lameta.page;
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
  public async mockShowOpenDialog(pathsToReturn: string[]) {
    this.lameta.electronApp.evaluate(async ({ dialog }, filePaths) => {
      dialog.showOpenDialog = () =>
        Promise.resolve({ canceled: false, filePaths });
    }, pathsToReturn);

    // If we were NOT mocking, and if https://github.com/microsoft/playwright/issues/8278 has been fixed:
    //Note that Promise.all prevents a race condition
    // between clicking and waiting for the file chooser.
    /*const [fileChooser] = await Promise.all([
      // It is important to call waitForEvent before click to set up waiting.
      this.page.waitForEvent("filechooser"),
      this.page.getByRole("button", { name: "Add Files" }).click(),
    ]);
      await fileChooser.setFiles(p);
    */
  }

  public async addFile(name: string) {
    const p = Path.join(process.env.E2ERoot!, name); // creating it at our test root, which is a level above the lameta project directory
    fs.writeFileSync(p, "hello world");
    this.mockShowOpenDialog([p]);

    await this.page.getByRole("button", { name: "Add Files" }).click(); // await page.getByRole('gridcell', { name: 'New Session.session' }).click();
  }
}
