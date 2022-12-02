import * as fs from "fs";
import * as Path from "path";
import { ElectronApplication, Page, _electron as electron } from "playwright";
import { test, expect as expect, TestInfo } from "@playwright/test";

export class Lameta {
  public electronApp: ElectronApplication;
  public page: Page;
  public projectDirectory: string;
  public async launch() {
    this.electronApp = await electron.launch({
      args: ["."],
      env: {
        NODE_ENV: "test" /* <-- doesn't work */,
        E2E: "true",
        E2E_USER_SETTINGS_STORE_NAME: "none", // like we're running for the first time
        E2ERoot: process.env.E2ERoot!,
      },
    });
    this.page = await this.electronApp.firstWindow();
    return this.page;
  }
  // if you don't do this, there may be a noticable delay
  public async quit() {
    await this.electronApp.close();
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
    return await this.electronApp.firstWindow();
  }
  public async cancelRegistration() {
    const cancel = await this.page.getByRole("button", { name: "CANCEL" });
    await cancel.click();
  }
}
