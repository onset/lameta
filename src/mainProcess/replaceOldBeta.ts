import { app, BrowserWindow, session, shell } from "electron";
import { execFile, execFileSync, spawn } from "child_process";
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
  settingsWithoutLastProject,
  splitCommandLine
} from "./oldBeta";
import { claimSprjFiles } from "./fileAssociation";

// When a beta starts for the first time, it looks for betas that are still installed under the
// old app id (see oldBeta.ts). If there are any, it takes over their settings and removes them,
// without asking, while a small window shows what it is doing. A release, which has the same
// app id, is never touched.
//
// The progress window stays open until the caller closes it with the returned function: closing
// lameta's only window would quit lameta, so the caller does that once the main window exists.
//
// It runs once: a file in the settings folder records that it has. The one exception is an old
// beta that is running at the time; then it copies the settings and tries the removal again at
// the next start.

const kDoneFileName = "replaced-old-beta.json";
// lameta_orange in src/containers/theme.ts, which the main process cannot import (it loads MUI)
const kLametaOrange = "#e69664";

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

  let oldBetas: OldBeta[] = [];
  try {
    oldBetas = await findOldBetas();
  } catch (e) {
    console.error("replaceOldBeta: could not look for an old beta", e);
  }
  if (oldBetas.length === 0) {
    writeDone(doneFile, { result: "none found" });
    return nothingToClose;
  }

  const names = oldBetas.map((b) => `lameta ${b.version}`).join(", ");
  const progress = await ProgressWindow.open(
    `Replacing ${names} with lameta beta`
  );
  try {
    await progress.show(`Copying settings from ${names}…`, 15);
    copySettings();

    const running: string[] = [];
    for (const b of oldBetas) {
      if (await b.isRunning()) running.push(`lameta ${b.version}`);
    }
    if (running.length) {
      await progress.show(
        `${running.join(", ")} is running, so it will be removed next time.`,
        100
      );
      await wait(2500);
      // no done file, so the next start tries the removal again
      return () => progress.close();
    }

    const results: { version: string; removed: boolean }[] = [];
    let percent = 30;
    for (const b of oldBetas) {
      const status = `Removing lameta ${b.version}…`;
      await progress.show(status, percent);
      await b.remove();
      const removed = await waitUntil(
        () => !b.isStillInstalled(),
        60000,
        () => {
          percent = Math.min(95, percent + 3);
          void progress.show(status, percent);
        }
      );
      results.push({ version: b.version, removed });
    }
    const failed = results.filter((r) => !r.removed);
    await progress.show(
      failed.length
        ? `Could not remove ${failed
            .map((r) => `lameta ${r.version}`)
            .join(", ")}.`
        : `Removed ${names}.`,
      100
    );
    writeDone(doneFile, { result: "removed", results });
    // the old beta's uninstaller removed the .sprj registration that this beta made at startup
    if (process.platform === "win32") claimSprjFiles(app.getPath("exe"));
    await wait(1200);
  } catch (e) {
    console.error("replaceOldBeta: failed", e);
    writeDone(doneFile, { result: "failed", error: String(e) });
  }
  return () => progress.close();
}

async function findOldBetas(): Promise<OldBeta[]> {
  if (process.platform === "win32") {
    const b = await findOldBetaOnWindows();
    return b ? [b] : [];
  }
  if (process.platform === "darwin") return findOldBetasOnMac();
  return [];
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
      // the uninstaller deletes its registry entry last
      isStillInstalled: () =>
        fs.existsSync(entry.exePath) || registryKeyExists(key),
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

// An old beta can be under any name, such as "lameta 2.3 beta.app", so look at every app that
// has the old app id
async function findOldBetasOnMac(): Promise<OldBeta[]> {
  const folders = [
    "/Applications",
    path.join(app.getPath("home"), "Applications")
  ];
  const found: OldBeta[] = [];
  for (const folder of folders) {
    let names: string[] = [];
    try {
      names = fs.readdirSync(folder).filter((n) => n.endsWith(".app"));
    } catch {
      continue;
    }
    for (const name of names) {
      const appPath = path.join(folder, name);
      const plistPath = path.join(appPath, "Contents", "Info.plist");
      let plist: string;
      try {
        plist = fs.readFileSync(plistPath, "utf8");
      } catch {
        continue;
      }
      const version = readPlistString(plist, "CFBundleShortVersionString");
      if (readPlistString(plist, "CFBundleIdentifier") !== kOldAppId) continue;
      if (!isBetaVersion(version)) continue;
      found.push({
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
      });
    }
  }
  return found;
}

// The old beta kept its settings in the folder named after it, which nothing removes
function copySettings() {
  const oldFolder = path.join(app.getPath("appData"), "lameta");
  const newFolder = app.getPath("userData");

  const oldSettings = path.join(oldFolder, kSettingsFileName);
  const newSettings = path.join(newFolder, kSettingsFileName);
  if (fs.existsSync(oldSettings) && !fs.existsSync(newSettings)) {
    fs.mkdirSync(newFolder, { recursive: true });
    fs.writeFileSync(
      newSettings,
      settingsWithoutLastProject(fs.readFileSync(oldSettings, "utf8"))
    );
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

function registryKeyExists(key: string): boolean {
  try {
    execFileSync("reg", ["query", key], { windowsHide: true, stdio: "ignore" });
    return true;
  } catch {
    return false;
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
      // the size of the page itself, not counting the title bar, so that nothing scrolls
      useContentSize: true,
      width: 480,
      height: 150,
      resizable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      title: "lameta beta",
      // in front even when another program has the focus, so the user sees what is happening
      alwaysOnTop: true,
      center: true,
      show: false,
      webPreferences: { contextIsolation: true, sandbox: true }
    });
    window.setMenu(null);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
      body { font-family: system-ui, sans-serif; margin: 20px; color: #222; overflow: hidden; }
      h1 { font-size: 15px; margin: 0 0 14px; }
      progress { width: 100%; height: 14px; accent-color: ${kLametaOrange}; }
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
