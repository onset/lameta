import { ElectronApplication, Page, _electron as electron } from "playwright";
import { test, expect as expect, TestInfo } from "@playwright/test";

export class Lameta {
  public electronApp: ElectronApplication;
  public page: Page;

  public async launch() {
    this.electronApp = await electron.launch({
      args: ["."],
      env: {
        NODE_ENV: "test" /* <-- doesn't work */,
        E2E: "true",
        E2E_USER_SETTINGS_STORE_NAME: "none", // like we're running for the first time
        E2ERoot: process.env.E2ERoot!
      }
    });
    this.page = await this.electronApp.firstWindow();
    return this.page;
  }
  // if you don't do this, there may be a noticable delay
  public async quit() {
    await this.electronApp.close();
  }

  public async clickMenu(menuId: string, itemId: string) {
    const x = { menuId, itemId };
    await this.electronApp.evaluate(
      async ({ Menu }, params) => {
        const menu = Menu.getApplicationMenu();
        const sessionMenu = menu?.getMenuItemById(params.menuId);
        const importItem = sessionMenu?.submenu?.getMenuItemById(params.itemId);
        importItem?.click();
      },
      { menuId, itemId }
    );
  }

  public async mockShowOpenDialog(pathsToReturn: string[]) {
    this.electronApp.evaluate(async ({ dialog }, filePaths) => {
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

  public async cancelRegistration() {
    const cancel = await this.page.getByRole("button", { name: "CANCEL" });
    await cancel.click();
  }
}
