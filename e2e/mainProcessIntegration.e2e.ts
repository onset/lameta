import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { E2eFileList } from "./FileList-e2e-helpers";

const pkg = JSON.parse(fs.readFileSync(Path.join(__dirname, "..", "package.json"), "utf8"));

// These tests cover everything the renderer asks of the main process outside of
// MainProcessApi: the window title, the application menu and its callbacks,
// popup menus, spell checking, app paths, start-up arguments, window blur,
// reloading, and quitting.

const getWindowTitle = (lameta: LametaE2ERunner) =>
  lameta.electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getTitle());

const getDocumentsPath = (lameta: LametaE2ERunner) =>
  lameta.electronApp.evaluate(({ app }) => app.getPath("documents"));

function sessionDirectories(projectDirectory: string): string[] {
  const dir = Path.join(projectDirectory, "Sessions");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((d) => fs.statSync(Path.join(dir, d)).isDirectory());
}

// Marks the current page so that a test can tell when the window has reloaded it.
async function markPage(page: Page) {
  await page.evaluate(() => ((window as any).__e2eNotReloaded = true));
}
async function expectPageReloaded(page: Page) {
  await expect
    .poll(
      async () => {
        try {
          return await page.evaluate(() => (window as any).__e2eNotReloaded);
        } catch {
          return "navigating";
        }
      },
      { timeout: 15000 },
    )
    .toBeUndefined();
}

test.describe("Window title and application menu", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "MenuTest");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("window title shows the project and the version", async () => {
    const projectName = Path.basename(project.projectDirectory);
    await expect.poll(() => getWindowTitle(lameta)).toContain(projectName);
    expect(await getWindowTitle(lameta)).toContain(pkg.version);
  });

  test("body carries the platform as a class", async () => {
    const className = await page.evaluate(() => document.body.className);
    expect(className.split(" ")).toContain(process.platform);
  });

  test("application menu has the expected top-level menus", async () => {
    // the Session and People menus are only there when a project is open
    await project.goToSessions();
    const labels = await lameta.getApplicationMenuLabels();
    for (const label of ["File", "Edit", "View", "Session", "People", "Help", "Developer"]) {
      expect(labels).toContain(label);
    }
  });

  test("a menu click runs its renderer callback", async () => {
    await project.goToSessions();
    const before = sessionDirectories(project.projectDirectory).length;
    await lameta.clickMenu("Session", "New Session");
    await expect.poll(() => sessionDirectories(project.projectDirectory).length).toBe(before + 1);
  });

  test("menu enabled states follow the selected tab", async () => {
    const enabled = async (menu: string, item: string) =>
      (await lameta.getApplicationMenuItems(menu)).find((i) => i.label === item)?.enabled;

    await project.goToSessions();
    await expect.poll(() => enabled("Session", "New Session")).toBe(true);
    await expect.poll(() => enabled("People", "New Person")).toBe(false);

    await project.goToPeople();
    await expect.poll(() => enabled("Session", "New Session")).toBe(false);
    await expect.poll(() => enabled("People", "New Person")).toBe(true);
  });

  test("checkbox menu items show their state", async () => {
    const item = async () =>
      (await lameta.getApplicationMenuItems("Developer")).find(
        (i) => i.label === "Do not enforce any file naming",
      )!;
    expect((await item()).type).toBe("checkbox");
    const wasChecked = (await item()).checked;
    await lameta.clickMenu("Developer", "Do not enforce any file naming");
    // the menu is rebuilt from the user setting the next time it updates
    await project.goToSessions();
    await project.goToProject();
    await expect.poll(async () => (await item()).checked).toBe(!wasChecked);
    await lameta.clickMenu("Developer", "Do not enforce any file naming");
  });

  test("Developer > Toggle Developer Tools opens and closes them", async () => {
    const devToolsOpen = () =>
      lameta.electronApp.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.isDevToolsOpened(),
      );
    const wasOpen = await devToolsOpen();
    await lameta.clickMenu("Developer", "Toggle Developer Tools");
    await expect.poll(devToolsOpen).toBe(!wasOpen);
    await lameta.clickMenu("Developer", "Toggle Developer Tools");
    await expect.poll(devToolsOpen).toBe(wasOpen);
  });

  test("Developer > Reload reloads the window", async () => {
    await markPage(page);
    await lameta.clickMenu("Developer", "Reload");
    await expectPageReloaded(page);
  });
});

test.describe("Popup menus", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "PopupMenuTest");
    page = lameta.page;
    await lameta.capturePopupMenus();
    await project.goToSessions();
    await project.addSession();
    await page.getByTestId("field-title-edit").waitFor({ timeout: 10000 });
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  const titleField = () => page.getByTestId("field-title-edit");

  async function rightClickTitle(nearStart = false) {
    const count = await lameta.getPopupMenuCount();
    const box = (await titleField().boundingBox())!;
    await titleField().click({
      button: "right",
      position: nearStart ? { x: 12, y: box.height / 2 } : undefined,
    });
    return await lameta.waitForPopupMenu(count);
  }
  const labels = (items: { label: string; type: string }[]) =>
    items.filter((i) => i.type !== "separator").map((i) => i.label);

  test("Copy copies the selection to the clipboard", async () => {
    await titleField().click();
    await titleField().fill("copy me");
    await titleField().press("ControlOrMeta+a");
    const menu = await rightClickTitle();
    expect(labels(menu)).toEqual(["Cut", "Copy", "Paste", "Select All"]);
    // The page has updated many times by now, and each update sets up the context menu
    // again. There must still be only one listener, or one right-click shows several menus.
    expect(
      await page.evaluate(() =>
        require("electron").ipcRenderer.listenerCount("windowIpc.contextMenu"),
      ),
    ).toBe(1);
    // and no other path recorded a second menu for this right-click
    expect(await lameta.getPopupMenuCount()).toBe(1);

    await lameta.electronApp.evaluate(({ clipboard }) => clipboard.writeText(""));
    await lameta.clickPopupMenuItem("Copy");
    await expect
      .poll(() => lameta.electronApp.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe("copy me");
  });

  test("Cut removes the selection and puts it on the clipboard", async () => {
    await titleField().click();
    await titleField().fill("cut me");
    await titleField().press("ControlOrMeta+a");
    await rightClickTitle();
    await lameta.clickPopupMenuItem("Cut");
    await expect(titleField()).toHaveText("");
    await expect
      .poll(() => lameta.electronApp.evaluate(({ clipboard }) => clipboard.readText()))
      .toBe("cut me");
  });

  test("Paste inserts the clipboard", async () => {
    await titleField().click();
    await titleField().fill("");
    await lameta.electronApp.evaluate(({ clipboard }) => clipboard.writeText("pasted"));
    const menu = await rightClickTitle();
    // nothing is selected, so there is nothing to cut or copy
    expect(labels(menu)).toEqual(["Paste", "Select All"]);
    await lameta.clickPopupMenuItem("Paste");
    await expect(titleField()).toHaveText("pasted");
  });

  test("Select All selects the field's text", async () => {
    await titleField().click();
    await titleField().fill("select me");
    await titleField().press("End");
    await rightClickTitle();
    await lameta.clickPopupMenuItem("Select All");
    await expect
      .poll(() => page.evaluate(() => window.getSelection()?.toString()))
      .toBe("select me");
  });

  // Spell checking runs some time after typing, so keep right-clicking until the
  // context menu reports the misspelled word.
  async function rightClickUntilMisspelled(word: string) {
    await titleField().click();
    await titleField().fill(word);
    await titleField().press("Tab");
    for (let attempt = 0; attempt < 20; attempt++) {
      const menu = await rightClickTitle(true);
      if (labels(menu).includes("Add to Dictionary")) return menu;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }
    throw new Error(`"${word}" was never reported as misspelled`);
  }

  test("a spelling suggestion replaces the misspelled word", async () => {
    const menu = await rightClickUntilMisspelled("recieve");
    // suggestions depend on the operating system's spell checker
    const suggestion = labels(menu)[0];
    expect(suggestion).not.toBe("Add to Dictionary");
    await lameta.clickPopupMenuItem(suggestion);
    await expect(titleField()).toHaveText(suggestion);
  });

  test("Add to Dictionary adds the word to the spell checker", async () => {
    // Every test in a run shares one user data folder, and with it the spell checker's
    // dictionary, so use a word no other test has added and take it out again afterwards.
    const word =
      "Zqv" +
      Array.from({ length: 6 }, () =>
        String.fromCharCode(97 + Math.floor(Math.random() * 26)),
      ).join("");
    try {
      await rightClickUntilMisspelled(word);
      await lameta.clickPopupMenuItem("Add to Dictionary");
      await expect
        .poll(() =>
          lameta.electronApp.evaluate(({ session }) =>
            session.defaultSession.listWordsInSpellCheckerDictionary(),
          ),
        )
        .toContain(word);
    } finally {
      await lameta.electronApp.evaluate(({ session }, word) => {
        session.defaultSession.removeWordFromSpellCheckerDictionary(word);
      }, word);
    }
  });

  test("right-clicking a file shows the file menu, which can rename", async () => {
    const fileList = new E2eFileList(lameta, page, project.projectDirectory);
    await fileList.addFile("PopupMenuTest.txt");
    const cell = page.getByRole("gridcell", { name: /PopupMenuTest\.txt/ });
    await cell.first().waitFor({ state: "visible", timeout: 10000 });

    // Select the session's own metadata file first: right-clicking another file must
    // still offer what that file allows, such as Rename.
    await fileList.selectFile(".session");
    const count = await lameta.getPopupMenuCount();
    await cell.first().click({ button: "right" });
    const menu = await lameta.waitForPopupMenu(count);
    expect(labels(menu)).toEqual([
      process.platform === "darwin" ? "Show in Finder" : "Show in File Explorer",
      "Open in program associated with this file type",
      "Rename...",
      "Delete File...",
    ]);

    await lameta.clickPopupMenuItem("Rename...");
    await expect(page.getByText("Change Name To:")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("Change Name To:")).toBeHidden();
  });

  test("the Open button shows the file menu, which can reveal the file", async () => {
    await lameta.electronApp.evaluate(({ shell }) => {
      (shell as any).showItemInFolder = (path: string) => {
        (globalThis as any).__e2eRevealed = path;
      };
    });
    await page
      .getByRole("gridcell", { name: /PopupMenuTest\.txt/ })
      .first()
      .click();
    const count = await lameta.getPopupMenuCount();
    await page.getByRole("button", { name: "Open", exact: true }).click();
    const menu = await lameta.waitForPopupMenu(count);
    const showLabel = process.platform === "darwin" ? "Show in Finder" : "Show in File Explorer";
    expect(labels(menu)).toEqual([showLabel, "Open in program associated with this file type"]);
    await lameta.clickPopupMenuItem(showLabel);
    await expect
      .poll(() => lameta.electronApp.evaluate(() => (globalThis as any).__e2eRevealed))
      .toMatch(/PopupMenuTest\.txt$/);
  });
});

test.describe("Developer items in the file menu", () => {
  let lameta: LametaE2ERunner;

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("Inspect element opens the developer tools", async () => {
    lameta = new LametaE2ERunner();
    const project = await launchWithProject(lameta, "InspectElementTest");
    const page = lameta.page;
    await lameta.capturePopupMenus();

    // registering as a developer turns on developer mode
    await lameta.clickMenu("Help", "Registration...");
    const dialog = page.locator(".registrationDialog");
    await dialog.locator("input").first().fill("e2etest@example.com");
    await page.getByText("As a developer").click();
    await page.getByTestId("ok").click();
    await expect(dialog).toBeHidden();

    await project.goToSessions();
    await project.addSession();
    const fileList = new E2eFileList(lameta, page, project.projectDirectory);
    await fileList.addFile("InspectElementTest.txt");
    await fileList.selectFile("InspectElementTest.txt");
    const count = await lameta.getPopupMenuCount();
    await page
      .getByRole("gridcell", { name: /InspectElementTest\.txt/ })
      .first()
      .click({ button: "right" });
    const menu = await lameta.waitForPopupMenu(count);
    expect(menu.map((i) => i.label)).toContain("Inspect element");

    const devToolsOpen = () =>
      lameta.electronApp.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].webContents.isDevToolsOpened(),
      );
    expect(await devToolsOpen()).toBe(false);
    await lameta.clickPopupMenuItem("Inspect element");
    await expect.poll(devToolsOpen).toBe(true);
  });
});

test.describe("Dialogs start in the Documents folder", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "DocumentsPathTest");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("export suggests a file in Documents/lameta", async () => {
    await lameta.electronApp.evaluate(({ dialog }) => {
      (dialog as any).showSaveDialog = async (...args: any[]) => {
        (globalThis as any).__e2eSaveDialogOptions = args.find(
          (a) => a && typeof a === "object" && "defaultPath" in a,
        );
        return { canceled: true, filePath: "" };
      };
    });
    await lameta.clickMenu("File", "Export Project...");
    await page.getByRole("button", { name: "Export" }).click();
    const readOptions = () =>
      lameta.electronApp.evaluate(() => (globalThis as any).__e2eSaveDialogOptions);
    await expect.poll(readOptions).toBeTruthy();
    const options = await readOptions();
    const documents = await getDocumentsPath(lameta);
    expect(options.defaultPath.startsWith(Path.join(documents, "lameta"))).toBe(true);
    expect(options.title).toBe("Save As");
  });

  const recordOpenDialogOptions = () =>
    lameta.electronApp.evaluate(({ dialog }) => {
      delete (globalThis as any).__e2eOpenDialogOptions;
      (dialog as any).showOpenDialog = async (...args: any[]) => {
        (globalThis as any).__e2eOpenDialogOptions = args.find(
          (a) => a && typeof a === "object" && "defaultPath" in a,
        );
        return { canceled: true, filePaths: [] };
      };
    });

  test("Open Project starts in Documents/lameta", async () => {
    await recordOpenDialogOptions();
    await lameta.clickMenu("File", "Open Project...");
    await expect
      .poll(() =>
        lameta.electronApp.evaluate(() => (globalThis as any).__e2eOpenDialogOptions?.defaultPath),
      )
      .toBe(Path.join(await getDocumentsPath(lameta), "lameta"));
  });

  test("spreadsheet import opens its file chooser in Documents", async () => {
    await project.goToSessions();
    await recordOpenDialogOptions();
    await lameta.clickMenu("Session", "Import Spreadsheet of Sessions...");
    await page.getByRole("button", { name: "Choose File" }).click();
    await expect
      .poll(() =>
        lameta.electronApp.evaluate(() => (globalThis as any).__e2eOpenDialogOptions?.defaultPath),
      )
      .toBe(await getDocumentsPath(lameta));
  });
});

test.describe("Window blur", () => {
  let lameta: LametaE2ERunner;

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("saves edits when the window loses focus", async () => {
    lameta = new LametaE2ERunner();
    const project = await launchWithProject(lameta, "BlurTest");
    const page = lameta.page;
    await project.goToSessions();
    await project.addSession();
    const title = page.getByTestId("field-title-edit");
    await title.waitFor({ timeout: 10000 });
    await title.click();
    await title.fill("saved on blur");
    await title.press("Tab");

    const sessionDir = Path.join(
      project.projectDirectory,
      "Sessions",
      sessionDirectories(project.projectDirectory)[0],
    );
    const sessionFile = () => {
      const f = fs.readdirSync(sessionDir).find((name) => name.endsWith(".session"));
      return f ? fs.readFileSync(Path.join(sessionDir, f), "utf8") : "";
    };
    expect(sessionFile()).not.toContain("saved on blur");

    await lameta.electronApp.evaluate(({ BrowserWindow }) => {
      BrowserWindow.getAllWindows()[0].emit("blur");
    });
    await expect.poll(sessionFile).toContain("saved on blur");
  });
});

test.describe("Media folder settings", () => {
  let lameta: LametaE2ERunner;

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("changing the media folder reloads the window", async () => {
    lameta = new LametaE2ERunner();
    await launchWithProject(lameta, "MediaFolderTest");
    const page = lameta.page;
    const mediaFolder = Path.join(lameta.e2eRoot, "media-" + Date.now());
    fs.mkdirSync(mediaFolder, { recursive: true });
    await lameta.mockShowOpenDialog([mediaFolder]);

    await lameta.clickMenu("File", "Media Folder Settings...");
    await page.getByRole("button", { name: "Change..." }).click();
    await expect(page.getByText(mediaFolder)).toBeVisible();
    await markPage(page);
    await page.getByRole("button", { name: "OK" }).click();
    await expectPageReloaded(page);
  });
});

test.describe("Start-up", () => {
  let lameta: LametaE2ERunner;

  test.afterAll(async () => {
    await lameta?.quit();
  });

  test("opens the .sprj file given on the command line", async () => {
    const first = new LametaE2ERunner();
    const project = await launchWithProject(first, "CommandLineTest");
    const projectDirectory = project.projectDirectory;
    await first.quit();
    const sprj = Path.join(projectDirectory, Path.basename(projectDirectory) + ".sprj");
    expect(fs.existsSync(sprj)).toBe(true);

    lameta = new LametaE2ERunner();
    await lameta.launch({ extraArgs: [sprj] });
    await lameta.page.getByTestId("project-tab").waitFor({ state: "attached", timeout: 15000 });
    await expect.poll(() => getWindowTitle(lameta)).toContain(Path.basename(projectDirectory));
  });

  test("renames a user settings file that was saved as '.json'", async () => {
    const root = fs.mkdtempSync(Path.join(os.tmpdir(), "lametae2e-settings-"));
    const userData = Path.join(root, "userData");
    fs.mkdirSync(userData, { recursive: true });
    fs.writeFileSync(Path.join(userData, ".json"), '{"marker":"from .json"}');

    lameta = new LametaE2ERunner();
    await lameta.launch({
      env: { E2ERoot: root, E2E_USER_SETTINGS_STORE_NAME: "" },
    });
    const renamed = Path.join(userData, "lameta-user-settings.json");
    await expect.poll(() => fs.existsSync(renamed), { timeout: 20000 }).toBe(true);
    expect(fs.readFileSync(renamed, "utf8")).toContain("from .json");
    expect(fs.existsSync(Path.join(userData, ".json"))).toBe(false);
  });
});

test.describe("Quitting", () => {
  let lameta: LametaE2ERunner;

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("the duplicate project file notice reveals the folder and quits", async () => {
    lameta = new LametaE2ERunner();
    const project = await launchWithProject(lameta, "QuitTest");
    const page = lameta.page;
    await project.goToSessions();
    await project.addSession();
    await page.getByTestId("field-title-edit").waitFor({ timeout: 10000 });
    const sessionDir = Path.join(
      project.projectDirectory,
      "Sessions",
      sessionDirectories(project.projectDirectory)[0],
    );
    const sessionFile = fs.readdirSync(sessionDir).find((name) => name.endsWith(".session"))!;
    fs.copyFileSync(Path.join(sessionDir, sessionFile), Path.join(sessionDir, "duplicate.session"));

    await lameta.electronApp.evaluate(({ dialog, shell }) => {
      (dialog as any).showMessageBoxSync = () => 1;
      (shell as any).showItemInFolder = () => {};
    });
    // a session's pane checks its folder each time it is shown
    await project.goToPeople();
    await project.goToSessions();
    const closed = lameta.electronApp.waitForEvent("close", { timeout: 20000 });
    await page.getByText("There is a problem with the files").first().click();
    await closed;
  });

  test("closing the window quits while the hidden rules sandbox window is open", async () => {
    lameta = new LametaE2ERunner();
    await launchWithProject(lameta, "QuitWithSandboxTest");
    // asking for the sandbox's process id creates its hidden window
    await lameta.page.evaluate(() =>
      require("electron").ipcRenderer.invoke("rules-sandbox-process-id"),
    );
    expect(
      await lameta.electronApp.evaluate(
        ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
      ),
    ).toBe(2);

    const closed = lameta.electronApp.waitForEvent("close", { timeout: 20000 });
    await lameta.electronApp.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()
        .find((w) => w.isVisible())!
        .close(),
    );
    await closed;
  });

  test("closing while a file is copying asks first, then abandons the copy and quits", async () => {
    lameta = new LametaE2ERunner();
    const project = await launchWithProject(lameta, "QuitWhileCopyingTest");
    const page = lameta.page;
    await project.goToSessions();
    await project.addSession();
    await page.getByTestId("field-title-edit").waitFor({ timeout: 10000 });
    const sessionDir = Path.join(
      project.projectDirectory,
      "Sessions",
      sessionDirectories(project.projectDirectory)[0],
    );

    // big enough that the copy is still going when the window closes
    const source = Path.join(lameta.e2eRoot, `big-${Date.now()}.bin`);
    const fd = fs.openSync(source, "w");
    fs.ftruncateSync(fd, 1536 * 1024 * 1024);
    fs.closeSync(fd);
    try {
      // answer "Do not quit" the first time and "Abandon" the second time
      await lameta.electronApp.evaluate(({ dialog }) => {
        const g = globalThis as any;
        g.__e2eQuitQuestions = [];
        (dialog as any).showMessageBox = async (...args: any[]) => {
          const options = args.find((a) => a && a.buttons);
          g.__e2eQuitQuestions.push(options.buttons);
          return { response: g.__e2eQuitQuestions.length === 1 ? 0 : 1 };
        };
      });
      const questions = () =>
        lameta.electronApp.evaluate(() => (globalThis as any).__e2eQuitQuestions);
      const closeWindow = () =>
        lameta.electronApp.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].close(),
        );

      // Playwright accepts beforeunload dialogs, which would let the window close.
      // Electron itself shows none: it keeps the window open when onbeforeunload returns a value.
      let beforeUnloadDismissals = 0;
      page.on("dialog", async (d) => {
        if (d.type() !== "beforeunload") return;
        await d.dismiss().catch(() => {});
        beforeUnloadDismissals++;
      });

      await lameta.mockShowOpenDialog([source]);
      await page.getByRole("button", { name: "Add Files" }).click();
      // rsync, which copies on macOS and Linux, writes to a hidden file whose name holds the
      // file's name, and renames it only when the copy is done
      await expect
        .poll(() => fs.readdirSync(sessionDir).some((n) => n.includes(Path.basename(source))))
        .toBe(true);

      await closeWindow();
      await expect
        .poll(questions)
        .toEqual([["Do not quit", "Abandon files that are still copying"]]);
      // once the close has been refused, the window stays
      await expect.poll(() => beforeUnloadDismissals).toBe(1);
      expect(
        await lameta.electronApp.evaluate(
          ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
        ),
      ).toBe(1);

      const closed = lameta.electronApp.waitForEvent("close", {
        timeout: 20000,
      });
      await closeWindow();
      await closed;
    } finally {
      try {
        fs.rmSync(source, { force: true });
      } catch {}
    }
  });
});

test.describe("macOS application menu", () => {
  let lameta: LametaE2ERunner;
  test.skip(process.platform !== "darwin", "the lameta menu is only on macOS");

  test.afterAll(async () => {
    await lameta?.quit();
  });

  test("lameta > Quit quits", async () => {
    lameta = new LametaE2ERunner();
    await launchWithProject(lameta, "MacQuitTest");
    const closed = lameta.electronApp.waitForEvent("close", { timeout: 20000 });
    await lameta.clickMenu("lameta", "Quit");
    await closed;
  });
});
