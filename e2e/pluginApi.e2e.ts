import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { E2eProject } from "./various-e2e-helpers";
import * as fs from "fs";
import * as Path from "path";

// Runs e2e/fixtures/plugin-api-test, as the Developer plugin, against a session's mp3. The
// plugin calls every host API a plugin can use and lists each result in its page, so this test
// fails whenever a call fails in the built app, including failures that only the renderer's
// bundle can produce.
//
// The run gets its own E2ERoot, so its userData (and the plugins installed there) is not shared
// with plugins.e2e.ts, which clears userData/plugins while it runs.

const PLUGIN_ID = "org.lameta.test.plugin-api";
const PLUGIN_DIR = Path.join(__dirname, "fixtures", "plugin-api-test");
const AUDIO_NAME = "ETR009_Careful.mp3";
const ANCHOR = "ETR009_Careful";
const PROJECT_NAME = "PluginApiTest";

// Every step the plugin runs, in order. Listing them here makes a step that the plugin never
// reaches fail the test as surely as a step that errors.
const EXPECTED_STEPS = [
  "tab provider companions call",
  "getFileBytes",
  "readFileRange",
  "writeSidecar",
  "readSidecar",
  "listSidecars",
  "companions.writeText",
  "companions.exists",
  "companions.readText",
  "companions.stat",
  "companions.writeBytes",
  "companions.readBytes",
  "companions.rename",
  "companions.list",
  "companions.delete",
  "companions refuses a path outside the file's family",
  "ffmpeg.probe",
  "ffmpeg.run",
  "saveFile",
  "getProjectSettings",
  "setProjectSettings",
  "selectFile refuses a path outside the folder",
];

interface StepResult {
  name: string;
  status: string;
  detail: string;
}

test.describe("Plugin host API", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let root: string;
  let projectDirectory: string;
  let saveTargets: string[];

  test.beforeAll(async () => {
    root = Path.join(process.env.E2ERoot!, `pluginApi-${Date.now()}`);
    fs.mkdirSync(root, { recursive: true });
    projectDirectory = Path.join(root, "lameta", PROJECT_NAME);
    const saveFolder = Path.join(root, "saved");
    fs.mkdirSync(saveFolder, { recursive: true });
    saveTargets = [Path.join(saveFolder, "first.txt"), Path.join(saveFolder, "second.txt")];

    lameta = new LametaE2ERunner();
    page = await lameta.launch({ projectName: PROJECT_NAME, env: { E2ERoot: root } });
    await page.getByTestId("project-tab").waitFor({ state: "visible", timeout: 15000 });

    await useDeveloperPlugin(lameta, page, PLUGIN_DIR);
    await stubSaveDialog(lameta, saveTargets);

    const project = new E2eProject(lameta);
    project.projectDirectory = projectDirectory;
    await project.goToSessions();
    await project.addSession();
    const audioCopy = Path.join(root, AUDIO_NAME);
    fs.copyFileSync(
      Path.join(process.cwd(), "sample data", "Edolo sample", "Sessions", "ETR009", AUDIO_NAME),
      audioCopy,
    );
    await lameta.mockShowOpenDialog([audioCopy]);
    await page.getByRole("button", { name: "Add Files" }).click();
    await expect(page.getByRole("gridcell", { name: AUDIO_NAME })).toBeVisible({
      timeout: 10000,
    });
  });

  test.afterAll(async () => {
    await lameta?.quit();
  });

  test("every API call succeeds, and selectFile opens the plugin's tab on the new file", async () => {
    test.setTimeout(120000);
    await page.getByRole("gridcell", { name: AUDIO_NAME }).click();
    const tab = page.getByRole("tab", { name: /^Plugin API Test/ });
    await expect(tab).toBeVisible({ timeout: 15000 });
    await tab.click();

    const frame = page.frameLocator('iframe[data-testid="plugin-frame"]');
    await expect(frame.getByTestId("api-done")).toBeAttached({ timeout: 60000 });

    const results: StepResult[] = await frame.getByTestId("api-result").evaluateAll((items) =>
      items.map((li) => ({
        name: li.getAttribute("data-name") || "",
        status: li.getAttribute("data-status") || "",
        detail: li.textContent || "",
      })),
    );
    // The failing steps, with the host's error for each, are what a red run should print.
    expect(results.filter((r) => r.status !== "ok")).toEqual([]);
    expect(results.map((r) => r.name)).toEqual(EXPECTED_STEPS);

    // What the calls left on disk.
    const sessionDir = findSessionDir(projectDirectory);
    const sidecar = Path.join(sessionDir, "plugin-data", PLUGIN_ID, `${AUDIO_NAME}.apitest.json`);
    expect(JSON.parse(fs.readFileSync(sidecar, "utf8"))).toEqual({ n: 1 });
    expect(fs.readFileSync(Path.join(sessionDir, `${ANCHOR}.apitest.txt`), "utf8")).toBe("hello");
    expect(fs.existsSync(Path.join(sessionDir, `${ANCHOR}_Annotations`, "moved.bin"))).toBe(false);
    const wav = fs.readFileSync(Path.join(sessionDir, `${ANCHOR}.apitest.wav`));
    expect(wav.subarray(0, 4).toString("latin1")).toBe("RIFF");
    expect(
      fs.readdirSync(sessionDir).filter((f) => f.includes("lameta-tmp") || f.endsWith(".tmp")),
    ).toEqual([]);
    const settings = Path.join(projectDirectory, "plugin-data", PLUGIN_ID, "project-settings.json");
    expect(JSON.parse(fs.readFileSync(settings, "utf8"))).toEqual({ kept: true });

    // saveFile wrote where the (stubbed) Save dialog said, and the second dialog started in the
    // folder of the first save.
    for (const target of saveTargets)
      expect(fs.readFileSync(target, "utf8")).toBe("saved by plugin");
    const dialogCalls = await lameta.electronApp.evaluate(
      () => (globalThis as any).__e2eSaveDialogCalls as { defaultPath?: string }[],
    );
    expect(dialogCalls).toHaveLength(3);
    expect(Path.basename(dialogCalls[0].defaultPath!)).toBe("apitest-out.txt");
    expect(Path.dirname(dialogCalls[0].defaultPath!)).toBe(sessionDir);
    expect(Path.dirname(dialogCalls[1].defaultPath!)).toBe(Path.dirname(saveTargets[0]));

    // selectFile: the plugin selects its companion text file and asks for its "selected" tab.
    await frame.getByTestId("select-file").click();
    const selected = page
      .frameLocator('iframe[data-testid="plugin-frame"]')
      .getByTestId("selected-file");
    await expect(selected).toHaveAttribute("data-file-name", `${ANCHOR}.apitest.txt`, {
      timeout: 15000,
    });
    await expect(selected).toHaveAttribute("data-tab-id", "selected");
    await expect(page.getByRole("gridcell", { name: `${ANCHOR}.apitest.txt` })).toBeVisible();
  });
});

/** Point lameta's Developer plugin folder at `folder`, through the Plugins dialog. */
async function useDeveloperPlugin(lameta: LametaE2ERunner, page: Page, folder: string) {
  await lameta.clickMenu("File", "Plugins...");
  const dialog = page.getByTestId("plugins-dialog");
  await expect(dialog).toBeVisible({ timeout: 10000 });
  await lameta.mockShowOpenDialog([folder]);
  await dialog.getByRole("button", { name: "Change..." }).click();
  await expect(dialog.locator(`input[aria-label="enable ${PLUGIN_ID}"]`)).toBeVisible({
    timeout: 10000,
  });
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden({ timeout: 5000 });
  await page
    .locator(".MuiBackdrop-root")
    .waitFor({ state: "hidden", timeout: 5000 })
    .catch(() => {});
}

/**
 * Replace the main process's Save dialog: each call is recorded in
 * globalThis.__e2eSaveDialogCalls and answers with the next of `filePaths`, then with "canceled".
 */
async function stubSaveDialog(lameta: LametaE2ERunner, filePaths: string[]) {
  await lameta.electronApp.evaluate(({ dialog }, paths) => {
    const g = globalThis as any;
    g.__e2eSaveDialogCalls = [];
    const queue = [...paths];
    (dialog as any).showSaveDialog = async (windowOrOptions: any, maybeOptions?: any) => {
      g.__e2eSaveDialogCalls.push(maybeOptions ?? windowOrOptions);
      const filePath = queue.shift();
      return filePath ? { canceled: false, filePath } : { canceled: true, filePath: "" };
    };
  }, filePaths);
}

function findSessionDir(projectDirectory: string): string {
  const sessions = Path.join(projectDirectory, "Sessions");
  const dirs = fs
    .readdirSync(sessions, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => Path.join(sessions, e.name));
  expect(dirs).toHaveLength(1);
  return dirs[0];
}
