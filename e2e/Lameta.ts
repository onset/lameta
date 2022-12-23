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

  public async clickMenu(
    menuId: string,
    menuLabel: string,
    itemId: string,
    itemLabel: string
  ) {
    console.log(`clickMenu(${menuId}, ${itemId})`);
    const x = { menuId, itemId };
    await this.electronApp.evaluate(
      async ({ Menu, dialog }, params) => {
        const menubar = Menu.getApplicationMenu();
        // review: Somehow, the "id" is always undefined, but the "label" is correct.
        // However if you debug in the browser, the id is there.
        // dialog.showMessageBoxSync({
        //   message: `clickMenu(label: ${menubar?.items[3].label} id:${menubar?.items[3].id})`
        // });
        // therefore, let's just find by label
        //const menu = menubar?.getMenuItemById(params.menuId);
        // find the menu item that has a label, ignoring the "&" character which is used to indicate a keyboard shortcut
        const menu = menubar?.items.find(
          (item) => item.label.replace(/&/g, "") === params.menuLabel
        );

        // dialog.showMessageBoxSync({
        //   message: `clickMenu(${params.menuId}, ${params.itemId} ${menu?.label})`
        // });
        // dialog.showMessageBoxSync({
        //   message: `clickMenu(${menu?.submenu?.getMenuItemById(params.itemId)})`
        // });
        //const importItem = menu?.submenu?.getMenuItemById(params.itemId);
        const item = menu?.submenu?.items.find(
          (item) => item.label.replace(/&/g, "") === params.itemLabel
        );
        // dialog.showMessageBoxSync({
        //   message: `clickMenu(${item?.label})`
        // });

        item?.click();
      },
      { menuId, menuLabel, itemId, itemLabel }
    );
  }

  public async mockShowOpenDialog(pathsToReturn: string[]) {
    return await this.electronApp.evaluate(async ({ dialog }, filePaths) => {
      dialog.showOpenDialog = () => {
        // dialog.showMessageBoxSync({
        //   message: `mockShowOpenDialog(${JSON.stringify(filePaths)})`
        // });
        return Promise.resolve({ canceled: false, filePaths });
      };
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
