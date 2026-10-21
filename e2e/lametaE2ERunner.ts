import { ElectronApplication, _electron as electron } from "playwright-core";
import { Page } from "playwright-core";
import { expect } from "@playwright/test";
import fs from "fs";
import * as Path from "path";
import * as os from "os";

/**
 * Options for launching the E2E runner with fast project creation
 */
export interface LaunchOptions {
  /**
   * If provided, automatically creates a project with this name,
   * bypassing the registration dialog and start screen UI.
   */
  projectName?: string;
  /**
   * If provided along with projectName, sets the archive configuration
   * (e.g., "ELAR", "PARADISEC", "AILLA") for the auto-created project.
   */
  archiveConfig?: string;
  /** Command-line arguments passed to lameta after the app path, e.g. an .sprj file to open. */
  extraArgs?: string[];
  /** Environment variables that override the ones the runner sets. */
  env?: Record<string, string>;
}

/** What a test can see of a native menu item, read from the main process. */
export interface E2eMenuItem {
  label: string;
  type: string;
  enabled: boolean;
  visible: boolean;
  checked: boolean;
}

export class LametaE2ERunner {
  // set by launch()
  public electronApp!: ElectronApplication;
  public page!: Page;
  public e2eRoot: string = "";
  public projectDirectory: string = "";

  public async launch(options?: LaunchOptions) {
    const allTimeRoot = Path.join(os.tmpdir(), "lametae2e");
    //fs.rmdirSync(allTimeRoot, { recursive: true });
    const rootDir = Path.join(allTimeRoot, new Date().toISOString().replace(/:/g, "_"));
    // clear out anything still in there. It won't hurt, but it's nice to free up the space
    // note that we're not trying to clean up after each test, as this way it's easier to
    // inspect what happened and we don't get leftovers around from crashes or whatever.
    fs.mkdirSync(rootDir, { recursive: true });

    const e2eRoot = process.env.E2ERoot || rootDir; // allow caller override, else use unique temp dir
    this.e2eRoot = e2eRoot;
    const exePath = process.env.E2E_LAMETA_EXECUTABLE; // optional path to installed app

    // Build environment with optional fast project creation
    const env: Record<string, string> = {
      ...(process.env as any),
      NODE_ENV: "test",
      VITE_NODE_ENV: "test",
      E2E: "true",
      E2E_USER_SETTINGS_STORE_NAME: "none",
      E2ERoot: e2eRoot,
    };

    // Add fast project creation environment variables if specified
    if (options?.projectName) {
      env.E2E_PROJECT_NAME = options.projectName;
      // Calculate and store the project directory for test access
      const sanitize = require("sanitize-filename");
      const parts = options.projectName.split("/");
      const sanitizedParts = parts.map((p: string) => sanitize(p));
      this.projectDirectory = Path.join(e2eRoot, "lameta", ...sanitizedParts);

      if (options?.archiveConfig) {
        env.E2E_ARCHIVE_CONFIG = options.archiveConfig;
      }
    }

    Object.assign(env, options?.env);

    const launchOptions: any = {
      // E2E_LAMETA_APP_DIR runs a build that is somewhere other than this folder's dist/
      args: [
        ...(exePath ? [] : [process.env.E2E_LAMETA_APP_DIR || "."]),
        ...(options?.extraArgs ?? []),
      ],
      executablePath: exePath,
      env,
    };

    // Do not add --remote-debugging-port; Playwright manages debugging flags itself.

    this.electronApp = await electron.launch(launchOptions);
    this.page = await this.electronApp.firstWindow();

    // Inject electronAPI for drag-and-drop support in E2E tests.
    // Since preload is disabled for E2E (due to Playwright/CDP incompatibility with
    // nodeIntegration:true + contextIsolation:false), we inject the equivalent API here.
    // When nodeIntegration is true, Electron adds a `path` property to File objects.
    await this.page.evaluate(() => {
      (window as any).electronAPI = {
        getPathForFile: (file: File) => (file as any).path || "",
      };
    });

    // Auto-dismiss prerelease warning dialog in packaged builds so tests aren't blocked
    try {
      // Look specifically for prerelease warning dialog by test ID - works across all localizations
      const dialogSelector = '[data-testid="prerelease-warning-dialog"]';
      await this.page.waitForSelector(dialogSelector, { timeout: 3000 });

      // Wait for the dialog to be fully loaded and visible
      const prereleaseDialog = this.page.getByTestId("prerelease-warning-dialog");
      await prereleaseDialog.waitFor({ state: "visible" });

      // Try multiple button selectors to be more robust
      const buttonSelectors = [
        "button.defaultButton",
        'button[variant="contained"]',
        'button:has-text("I understand")',
        'button:has-text("Saya mengerti")', // Indonesian translation
        "button", // fallback to any button in the dialog
      ];

      let buttonClicked = false;
      for (const selector of buttonSelectors) {
        try {
          const button = prereleaseDialog.locator(selector).first();
          if (await button.isVisible({ timeout: 500 })) {
            await button.click();
            buttonClicked = true;
            break;
          }
        } catch {
          // Try next selector
        }
      }

      if (buttonClicked) {
        // Wait for the dialog to disappear before continuing
        await prereleaseDialog.waitFor({ state: "hidden", timeout: 2000 });
      }
    } catch {
      // no dialog; proceed
    }

    // Attach logging of renderer console + page errors so failing tests can report why windows close
    const attachDebugListeners = (p: Page) => {
      if ((p as any)._lametaDebugListenersAttached) return; // prevent double
      (p as any)._lametaDebugListenersAttached = true;
      const verbose =
        (process.env.E2E_VERBOSE || "") === "1" ||
        (process.env.E2E_VERBOSE || "").toLowerCase() === "true";
      /*
        By default we only surface console "error" messages from the renderer during e2e
        runs so the output stays readable. To see everything (log/debug/info/warning/etc.),
        run with E2E_VERBOSE=1 pnpm run e2e -- ...
      */
      p.on("console", (msg) => {
        try {
          const type = msg.type();
          const text = msg.text();

          // NOISE REDUCTION: Filter out known Sentry E2E error messages
          // PROBLEM: Even with our safeCaptureException wrapper, sometimes Sentry
          // still produces noise in E2E test output about RendererTransport failures
          // SOLUTION: Filter out this specific error message to keep E2E output clean
          // NOTE: This is a secondary defense - the primary fix is in errorHandling.ts
          if (
            text.includes(
              "Failed to initialize RendererTransport: window.__electronCall isn't defined",
            )
          ) {
            return; // Skip logging this specific error message - it's expected in E2E
          }

          if (!verbose) {
            // Always show errors. Optionally include warnings if we decide later.
            if (type !== "error") return;
          }
          console.log(`[renderer-console][${type}] ${text}`);
        } catch {}
      });
      p.on("pageerror", (err) => {
        try {
          console.error(`[renderer-pageerror] ${err?.message || err}`);
        } catch {}
      });
      // capture network/resource load failures (helps reduce mystery 'Failed to load resource' spam)
      p.on("requestfailed", (request) => {
        try {
          if (verbose) {
            const f = request.failure();
            console.error(
              `[renderer-requestfailed] ${request.resourceType()} ${request.url()} -> ${
                f?.errorText
              }`,
            );
          }
        } catch {}
      });
    };
    attachDebugListeners(this.page);
    this.electronApp.on("window", attachDebugListeners as any);
    return this.page;
  }
  // if you don't do this, there may be a noticable delay
  public async quit() {
    if (this.electronApp) {
      await this.electronApp.close();
    }
    // without this, the command line hangs for 30 seconds after the tests are done
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  public async clickMenu(menuLabel: string, itemLabel: string, subMenuChoiceLabel?: string) {
    //console.log(`clickMenu(${menuLabel}, ${itemLabel})`);
    await this.electronApp.evaluate(
      async ({ Menu }, params) => {
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
          (item) => item.label.replace(/&/g, "") === params.menuLabel,
        );

        // dialog.showMessageBoxSync({
        //   message: `clickMenu(${params.menuId}, ${params.itemId} ${menu?.label})`
        // });
        // dialog.showMessageBoxSync({
        //   message: `clickMenu(${menu?.submenu?.getMenuItemById(params.itemId)})`
        // });
        //const importItem = menu?.submenu?.getMenuItemById(params.itemId);
        const item = menu?.submenu?.items.find(
          (item) => item.label.replace(/&/g, "") === params.itemLabel,
        );
        // dialog.showMessageBoxSync({
        //   message: `clickMenu(${item?.label})`
        // });

        item?.click();

        if (params.subMenuChoiceLabel) {
          const subMenuChoice = item?.submenu?.items.find(
            (item) => item.label.replace(/&/g, "") === params.subMenuChoiceLabel,
          );
          subMenuChoice?.click();
        }
      },
      { menuLabel, itemLabel, subMenuChoiceLabel },
    );
  }

  /** Reads the items of a top-level application menu, as Electron holds them in the main process. */
  public async getApplicationMenuItems(menuLabel: string): Promise<E2eMenuItem[]> {
    return await this.electronApp.evaluate(({ Menu }, menuLabel) => {
      const menu = Menu.getApplicationMenu()?.items.find(
        (item) => item.label.replace(/&/g, "") === menuLabel,
      );
      return (menu?.submenu?.items ?? []).map((item) => ({
        label: item.label.replace(/&/g, ""),
        type: item.type,
        enabled: item.enabled,
        visible: item.visible,
        checked: item.checked,
      }));
    }, menuLabel);
  }

  public async getApplicationMenuLabels(): Promise<string[]> {
    return await this.electronApp.evaluate(({ Menu }) =>
      (Menu.getApplicationMenu()?.items ?? []).map((item) => item.label.replace(/&/g, "")),
    );
  }

  /**
   * From now on, popup (context) menus are recorded in the main process instead of being shown.
   * Playwright cannot see or click native menus, so tests read and click them through
   * getLastPopupMenu() and clickPopupMenuItem().
   */
  public async capturePopupMenus() {
    await this.electronApp.evaluate(({ Menu }) => {
      const g = globalThis as any;
      g.__e2ePopupMenus = [];
      Menu.prototype.popup = function () {
        g.__e2ePopupMenus.push(this);
      };
    });
  }

  /** Waits for the next popup menu after `previousCount` menus have been recorded, and returns its items. */
  public async waitForPopupMenu(previousCount: number): Promise<E2eMenuItem[]> {
    await expect
      .poll(() => this.getPopupMenuCount(), { timeout: 5000 })
      .toBeGreaterThan(previousCount);
    return await this.getLastPopupMenu();
  }

  public async getPopupMenuCount(): Promise<number> {
    return await this.electronApp.evaluate(
      () => ((globalThis as any).__e2ePopupMenus ?? []).length,
    );
  }

  public async getLastPopupMenu(): Promise<E2eMenuItem[]> {
    return await this.electronApp.evaluate(() => {
      const menus = (globalThis as any).__e2ePopupMenus ?? [];
      const menu = menus[menus.length - 1];
      return (menu?.items ?? []).map((item: any) => ({
        label: item.label,
        type: item.type,
        enabled: item.enabled,
        visible: item.visible,
        checked: item.checked,
      }));
    });
  }

  public async clickPopupMenuItem(label: string) {
    await this.electronApp.evaluate((_electron, label) => {
      const menus = (globalThis as any).__e2ePopupMenus ?? [];
      const menu = menus[menus.length - 1];
      const item = menu?.items.find((i: any) => i.label === label);
      if (!item) throw new Error(`No popup menu item labeled "${label}"`);
      item.click();
    }, label);
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
    // First, try to dismiss any prerelease warning dialog that might be blocking
    await this.dismissPrereleaseDialogIfPresent();

    const cancelButton = this.page.getByTestId("cancel");
    const registrationReminder = this.page.locator("#registrationReminder");

    // The home page opens the registration dialog when it mounts, and under a loaded
    // machine that can be several seconds after the window appears. Wait for the home
    // page (or the dialog, or a workspace's reminder) first, so that the short checks
    // below do not give up before the dialog exists and leave it blocking the next click.
    try {
      await this.page
        .locator("#creatNewProjectLink")
        .or(cancelButton)
        .or(registrationReminder)
        .first()
        .waitFor({ state: "visible", timeout: 20000 });
    } catch {}

    // HomePage renders #creatNewProjectLink in the same commit whose componentDidMount calls
    // RegistrationDialog.show(), so the dialog appears a commit later than the link. Wait for
    // the dialog or the reminder together, with enough time for that commit under load.
    try {
      await cancelButton
        .or(registrationReminder)
        .first()
        .waitFor({ state: "visible", timeout: 5000 });
    } catch {
      return;
    }
    if (!(await cancelButton.isVisible())) {
      try {
        await registrationReminder.click();
        await cancelButton.waitFor({ state: "visible", timeout: 3000 });
      } catch {
        return;
      }
    }
    await cancelButton.click();
  }

  private async dismissPrereleaseDialogIfPresent() {
    try {
      const dialogSelector = '[data-testid="prerelease-warning-dialog"]';
      // Short timeout since this is just a defensive check
      await this.page.waitForSelector(dialogSelector, { timeout: 1000 });

      const prereleaseDialog = this.page.getByTestId("prerelease-warning-dialog");
      if (await prereleaseDialog.isVisible()) {
        // Try multiple button selectors to be more robust
        const buttonSelectors = [
          "button.defaultButton",
          'button[variant="contained"]',
          'button:has-text("I understand")',
          'button:has-text("Saya mengerti")', // Indonesian translation
          "button", // fallback to any button in the dialog
        ];

        let buttonClicked = false;
        for (const selector of buttonSelectors) {
          try {
            const button = prereleaseDialog.locator(selector).first();
            if (await button.isVisible({ timeout: 500 })) {
              await button.click();
              buttonClicked = true;
              break;
            }
          } catch {
            // Try next selector
          }
        }

        if (buttonClicked) {
          await prereleaseDialog.waitFor({ state: "hidden", timeout: 2000 });
        }
      }
    } catch {
      // no dialog; proceed
    }
  }
}
