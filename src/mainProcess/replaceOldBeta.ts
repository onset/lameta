import { app, BrowserWindow, session, shell } from "electron";
import { execFile, spawn } from "child_process";
import * as fs from "fs";
import * as path from "path";
import {
  isBetaVersion,
  kOldAppId,
  kOldUninstallKeyName,
  kSettingsFileName,
  kSpellingWordsFileName,
  parseSpellingWords,
  parseUninstallEntry,
  readPlistString,
  splitCommandLine
} from "./oldBeta";

// When a beta starts for the first time, it looks for a beta that is still installed under the
// old name "lameta" (see oldBeta.ts). If there is one, it takes over that beta's settings and
// removes it, without asking, while a small window shows what it is doing. A release that is
// installed as "lameta" is never touched.
//
// The progress window stays open until the caller closes it with the returned function: closing
// lameta's only window would quit lameta, so the caller does that once the main window exists.
//
// It runs once: a file in the settings folder records that it has. The one exception is an old
// beta that is running at the time; then it copies the settings and tries the removal again at
// the next start.

const kDoneFileName = "replaced-old-beta.json";

type OldBeta = {
  version: string;
  // what to remove: the uninstaller to run on Windows, the .app on macOS
  remove: () => Promise<void>;
  isRunning: () => Promise<boolean>;
  isStillInstalled: () => boolean;
};

const nothingToClose = () => {};

export async function replaceOldBetaIfAny(
  currentVersion: string
): Promise<() => void> {
  if (!app.isPackaged || process.env.E2E || !isBetaVersion(currentVersion))
    return nothingToClose;
  const doneFile = path.join(app.getPath("userData"), kDoneFileName);
  if (fs.existsSync(doneFile)) return nothingToClose;

  let oldBeta: OldBeta | undefined;
  try {
    oldBeta = await findOldBeta();
  } catch (e) {
    console.error("replaceOldBeta: could not look for an old beta", e);
  }
  if (!oldBeta) {
    writeDone(doneFile, { result: "none found" });
    return nothingToClose;
  }

  const progress = await ProgressWindow.open(
    `Replacing lameta ${oldBeta.version} with lameta beta`
  );
  try {
    await progress.show(`Copying settings from lameta ${oldBeta.version}…`, 20);
    copySettings();

    if (await oldBeta.isRunning()) {
      await progress.show(
        `lameta ${oldBeta.version} is running, so it will be removed next time.`,
        100
      );
      await wait(2500);
      // no done file, so the next start tries the removal again
      return () => progress.close();
    }

    await progress.show(`Removing lameta ${oldBeta.version}…`, 50);
    await oldBeta.remove();
    let percent = 50;
    const removed = await waitUntil(
      () => !oldBeta!.isStillInstalled(),
      60000,
      () => {
        percent = Math.min(95, percent + 3);
        void progress.show(`Removing lameta ${oldBeta!.version}…`, percent);
      }
    );
    if (removed) {
      await progress.show(`Removed lameta ${oldBeta.version}.`, 100);
      writeDone(doneFile, { result: "removed", version: oldBeta.version });
    } else {
      await progress.show(`Could not remove lameta ${oldBeta.version}.`, 100);
      writeDone(doneFile, {
        result: "could not remove",
        version: oldBeta.version
      });
    }
    await wait(1200);
  } catch (e) {
    console.error("replaceOldBeta: failed", e);
    writeDone(doneFile, { result: "failed", error: String(e) });
  }
  return () => progress.close();
}

async function findOldBeta(): Promise<OldBeta | undefined> {
  if (process.platform === "win32") return findOldBetaOnWindows();
  if (process.platform === "darwin") return findOldBetaOnMac();
  return undefined;
}

async function findOldBetaOnWindows(): Promise<OldBeta | undefined> {
  // a per-user install is in HKCU; one for all users is in HKLM
  for (const root of ["HKCU", "HKLM"]) {
    const key = `${root}\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${kOldUninstallKeyName}`;
    const output = await run("reg", ["query", key]).catch(() => "");
    const entry = parseUninstallEntry(output);
    if (!entry || !isBetaVersion(entry.displayVersion)) continue;
    const command = splitCommandLine(entry.quietUninstallString);
    if (!command) continue;
    return {
      version: entry.displayVersion,
      isStillInstalled: () => fs.existsSync(entry.exePath),
      isRunning: async () => {
        const list = await run("tasklist", [
          "/FI",
          `IMAGENAME eq ${path.basename(entry.exePath)}`,
          "/FO",
          "CSV",
          "/NH"
        ]).catch(() => "");
        return list
          .toLowerCase()
          .includes(`"${path.basename(entry.exePath).toLowerCase()}"`);
      },
      // The uninstaller copies itself to a temporary folder and returns at once, so the caller
      // waits for the app to disappear instead of for this process.
      remove: () =>
        new Promise<void>((resolve, reject) => {
          const child = spawn(command.file, command.args, {
            detached: true,
            stdio: "ignore",
            windowsHide: true
          });
          child.on("error", reject);
          child.on("exit", () => resolve());
        })
    };
  }
  return undefined;
}

async function findOldBetaOnMac(): Promise<OldBeta | undefined> {
  const places = [
    "/Applications/lameta.app",
    path.join(app.getPath("home"), "Applications", "lameta.app")
  ];
  for (const appPath of places) {
    const plistPath = path.join(appPath, "Contents", "Info.plist");
    if (!fs.existsSync(plistPath)) continue;
    const plist = fs.readFileSync(plistPath, "utf8");
    const version = readPlistString(plist, "CFBundleShortVersionString");
    if (readPlistString(plist, "CFBundleIdentifier") !== kOldAppId) continue;
    if (!isBetaVersion(version)) continue;
    return {
      version: version!,
      isStillInstalled: () => fs.existsSync(appPath),
      isRunning: async () => {
        const list = await run("pgrep", [
          "-f",
          `${appPath}/Contents/MacOS/`
        ]).catch(() => "");
        return list.trim().length > 0;
      },
      remove: () => shell.trashItem(appPath)
    };
  }
  return undefined;
}

// The old beta kept its settings in the folder named after it, which nothing removes
function copySettings() {
  const oldFolder = path.join(app.getPath("appData"), "lameta");
  const newFolder = app.getPath("userData");

  const oldSettings = path.join(oldFolder, kSettingsFileName);
  const newSettings = path.join(newFolder, kSettingsFileName);
  if (fs.existsSync(oldSettings) && !fs.existsSync(newSettings)) {
    fs.mkdirSync(newFolder, { recursive: true });
    fs.copyFileSync(oldSettings, newSettings);
  }

  // Chromium already has its own copy of this file open, so add the words through it
  const oldWords = path.join(oldFolder, kSpellingWordsFileName);
  if (fs.existsSync(oldWords)) {
    for (const word of parseSpellingWords(fs.readFileSync(oldWords, "utf8"))) {
      session.defaultSession.addWordToSpellCheckerDictionary(word);
    }
  }
}

function writeDone(doneFile: string, details: object) {
  try {
    fs.mkdirSync(path.dirname(doneFile), { recursive: true });
    fs.writeFileSync(
      doneFile,
      JSON.stringify({ ...details, when: new Date().toISOString() }, null, 2)
    );
  } catch (e) {
    console.error("replaceOldBeta: could not record that it ran", e);
  }
}

function run(file: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(file, args, { windowsHide: true }, (error, stdout) =>
      error ? reject(error) : resolve(stdout)
    );
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitUntil(
  test: () => boolean,
  timeoutMs: number,
  onTick: () => void
) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (test()) return true;
    onTick();
    await wait(500);
  }
  return test();
}

class ProgressWindow {
  private constructor(private window: BrowserWindow) {}

  public static async open(title: string): Promise<ProgressWindow> {
    const window = new BrowserWindow({
      width: 460,
      height: 150,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: "lameta beta",
      show: false,
      webPreferences: { contextIsolation: true, sandbox: true }
    });
    window.setMenu(null);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body { font-family: system-ui, sans-serif; margin: 20px; color: #222; }
      h1 { font-size: 15px; margin: 0 0 14px; }
      progress { width: 100%; height: 14px; }
      #status { font-size: 13px; margin-top: 10px; color: #444; }
    </style></head><body>
      <h1>${escapeHtml(title)}</h1>
      <progress id="bar" max="100" value="0"></progress>
      <div id="status"></div>
    </body></html>`;
    await window.loadURL(
      "data:text/html;charset=utf-8," + encodeURIComponent(html)
    );
    window.show();
    return new ProgressWindow(window);
  }

  public async show(status: string, percent: number) {
    if (this.window.isDestroyed()) return;
    await this.window.webContents.executeJavaScript(
      `document.getElementById("status").textContent = ${JSON.stringify(
        status
      )}; document.getElementById("bar").value = ${percent};`
    );
  }

  public close() {
    if (!this.window.isDestroyed()) this.window.destroy();
  }
}

function escapeHtml(text: string) {
  return text.replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!)
  );
}
