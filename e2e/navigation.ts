import * as fs from "fs";
import * as Path from "path";
import { ElectronApplication, Page, _electron as electron } from "playwright";
import { test, expect as expect, TestInfo } from "@playwright/test";

let electronApp: ElectronApplication;

export class e2eNavigation {
  public page: Page;
  public projectDirectory: string;
  public async launch() {
    electronApp = await electron.launch({
      args: ["."],
      env: {
        NODE_ENV: "test" /* <-- doesn't work */,
        E2E: "true",
        E2E_USER_SETTINGS_STORE_NAME: "none", // like we're running for the first time
        E2ERoot: process.env.E2ERoot!,
      },
    });
    this.page = await electronApp.firstWindow();
    return this.page;
  }
  // if you don't do this, there may be a noticable delay
  public async quit() {
    await electronApp.close();
  }
  public async launchAndCreateToNewProject(testInfo: TestInfo) {
    const page = await this.launch();
    await this.cancelRegistration();
    await page.locator("#creatNewProjectLink").click();
    const projectName = testInfo.title;
    await page.locator("#projectNameInput").fill(projectName);
    this.projectDirectory = Path.join(process.env.E2ERoot!, projectName);
    const ok = await page.getByRole("button", { name: "OK" });
    expect(ok).toBeEnabled();
    ok.click();
    return await electronApp.firstWindow();
  }
  public async cancelRegistration() {
    const cancel = await this.page.getByRole("button", { name: "CANCEL" });
    await cancel.click();
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
    electronApp.evaluate(async ({ dialog }, filePaths) => {
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
