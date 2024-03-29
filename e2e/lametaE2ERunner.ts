import { ElectronApplication, _electron as electron } from "playwright-core";
import { Page } from "playwright-core";
import fs from "fs";
import * as Path from "path";
import * as os from "os";
export class LametaE2ERunner {
  public electronApp: ElectronApplication;
  public page: Page;

  public async launch() {
    const allTimeRoot = Path.join(os.tmpdir(), "lametae2e");
    //fs.rmdirSync(allTimeRoot, { recursive: true });
    const rootDir = Path.join(
      allTimeRoot,
      new Date().toISOString().replace(/\:/g, "_")
    );
    // clear out anything still in there. It won't hurt, but it's nice to free up the space
    // note that we're not trying to clean up after each test, as this way it's easier to
    // inspect what happened and we don't get leftovers around from crashes or whatever.
    fs.mkdirSync(rootDir, { recursive: true });

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
    // without this, the command line hangs for 30 seconds after the tests are done
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  public async clickMenu(
    menuLabel: string,
    itemLabel: string,
    subMenuChoiceLabel?: string
  ) {
    //console.log(`clickMenu(${menuLabel}, ${itemLabel})`);
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

        if (params.subMenuChoiceLabel) {
          const subMenuChoice = item?.submenu?.items.find(
            (item) => item.label.replace(/&/g, "") === params.subMenuChoiceLabel
          );
          subMenuChoice?.click();
        }
      },
      { menuLabel, itemLabel, subMenuChoiceLabel }
    );
  }

  // a soft reload lets us check what happens when you leave and come back.
  // it's "soft" becuase we currently lose the user settings you'd need
  // to do a real reload on the same project and avoid the registration screen with
  // no idea what the last project was.
  public async softReload() {
    await this.clickMenu("Developer", "Soft Reload");
    await this.page.waitForTimeout(3000);
  }

  public async mockShowOpenDialog(pathsToReturn: string[]) {
    return await this.electronApp.evaluate(async ({ dialog }, filePaths) => {
      dialog.showOpenDialog = async () => {
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
    const cancel = await this.page.getByTestId("cancel"); //.getByRole("button", { name: "Cancel" });
    await cancel.click();
  }
}
