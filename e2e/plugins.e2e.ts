import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./various-e2e-helpers";
import * as fs from "fs";
import * as Path from "path";
import * as os from "os";
import archiver from "archiver";

// NOTE: all e2e tests share one E2ERoot (set in globalSetup), so userData/plugins is shared.
// Each describe below cleans that folder before installing only the plugin it needs, and the
// two describes live in one file so they run sequentially in a single worker (no contention).

const AUDIO_NAME = "ETR009_Careful.mp3";

function pluginsDir(): string {
  return Path.join(process.env.E2ERoot!, "userData", "plugins");
}
function cleanPluginsDir() {
  fs.rmSync(pluginsDir(), { recursive: true, force: true });
  fs.mkdirSync(pluginsDir(), { recursive: true });
}
function copyDir(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name.endsWith(".lmplug")) continue;
    const s = Path.join(src, entry.name);
    const d = Path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}
function findSessionDir(projectDirectory: string): string {
  const sessions = Path.join(projectDirectory, "Sessions");
  const sub = fs
    .readdirSync(sessions, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => Path.join(sessions, e.name));
  return sub[0];
}
// Zip a plugin source folder into a .lmplug (a zip with a different extension).
function zipToLmplug(srcFolder: string, outPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", () => resolve());
    archive.on("error", reject);
    archive.pipe(output);
    archive.directory(srcFolder, false); // contents at zip root
    archive.finalize();
  });
}

async function addSampleAudio(lameta: LametaE2ERunner, page: Page) {
  const sourceAudio = Path.join(
    process.cwd(),
    "sample data",
    "Edolo sample",
    "Sessions",
    "ETR009",
    AUDIO_NAME
  );
  if (!fs.existsSync(sourceAudio))
    throw new Error(`Sample audio not found at ${sourceAudio}`);
  const destAudio = Path.join(process.env.E2ERoot!, AUDIO_NAME);
  fs.copyFileSync(sourceAudio, destAudio);
  await lameta.mockShowOpenDialog([destAudio]);
  await page.getByRole("button", { name: "Add Files" }).click();
  await expect(page.getByRole("gridcell", { name: AUDIO_NAME })).toBeVisible({
    timeout: 10000
  });
}

// ---------------------------------------------------------------------------
test.describe("File-handler plugins (fixture)", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;
  const PLUGIN_ID = "org.lameta.test.e2e";

  test.beforeAll(async ({}) => {
    cleanPluginsDir();
    // Install the buildless fixture plugin.
    copyDir(
      Path.join(__dirname, "fixtures", "test-plugin"),
      Path.join(pluginsDir(), "test-plugin")
    );

    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "PluginsTest");
    await project.goToSessions();
    await project.addSession();
    await addSampleAudio(lameta, page);
    await page.getByRole("gridcell", { name: AUDIO_NAME }).click();
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("plugin tab appears, is selected by default, loads, and writes a sidecar", async ({}) => {
    const pluginTab = page.getByRole("tab", { name: "Test Plugin" });
    await expect(pluginTab).toBeVisible({ timeout: 10000 });

    // Because it claims the default, its iframe content shows without clicking the tab.
    const frame = page.frameLocator('iframe[data-testid="plugin-frame"]');
    await expect(frame.getByTestId("test-plugin-loaded")).toBeVisible({
      timeout: 10000
    });

    const sidecar = Path.join(
      findSessionDir(project.projectDirectory),
      "plugin-data",
      PLUGIN_ID,
      `${AUDIO_NAME}.e2e.json`
    );
    await expect
      .poll(() => fs.existsSync(sidecar), { timeout: 10000 })
      .toBe(true);
    const data = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    expect(data.ok).toBe(true);
    expect(data.file).toBe(AUDIO_NAME);
  });

  test("disabling the plugin in the Plugins dialog removes its tab", async ({}) => {
    await lameta.clickMenu("File", "Plugins...");
    const dialog = page.getByTestId("plugins-dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    const checkbox = dialog.locator(`input[aria-label="enable ${PLUGIN_ID}"]`);
    await expect(checkbox).toBeVisible();
    await checkbox.uncheck();

    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    await page
      .locator(".MuiBackdrop-root")
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {});

    const cell = page.getByRole("gridcell", { name: AUDIO_NAME });
    await expect(cell).toBeVisible();
    await cell.click();
    await expect(page.getByRole("tab", { name: "Test Plugin" })).toHaveCount(
      0,
      { timeout: 10000 }
    );
  });
});

// ---------------------------------------------------------------------------
// Exercises the REAL example waveform-annotator plugin to verify annotations survive leaving
// the file and coming back — the round-trip the user reported as broken.
test.describe("Waveform plugin annotations persist", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;
  const PLUGIN_ID = "org.lameta.example.waveform-annotator";

  test.beforeAll(async ({}) => {
    cleanPluginsDir();
    copyDir(
      Path.join(process.cwd(), "example-plugins", "waveform-annotator"),
      Path.join(pluginsDir(), "waveform-annotator")
    );

    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "WaveformTest");
    await project.goToSessions();
    await project.addSession();
    await addSampleAudio(lameta, page);
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("create a region, leave, return -> region restored", async ({}) => {
    await page.getByRole("gridcell", { name: AUDIO_NAME }).click();

    const frame = page.frameLocator('iframe[data-testid="plugin-frame"]');
    const waveform = frame.getByTestId("waveform");
    await expect(waveform).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500); // let wavesurfer decode & render

    // Drag across the waveform to create a region.
    const box = await waveform.boundingBox();
    if (!box) throw new Error("no waveform box");
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width * 0.2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5, y, { steps: 10 });
    await page.mouse.up();

    const sidecar = Path.join(
      findSessionDir(project.projectDirectory),
      "plugin-data",
      PLUGIN_ID,
      `${AUDIO_NAME}.annotations.json`
    );
    await expect
      .poll(
        () => {
          try {
            return JSON.parse(fs.readFileSync(sidecar, "utf8")).regions?.length ?? 0;
          } catch {
            return 0;
          }
        },
        { timeout: 10000 }
      )
      .toBeGreaterThan(0);

    const saved = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    const region = saved.regions[0];
    expect(typeof region.start).toBe("number");
    expect(typeof region.end).toBe("number");
    expect(typeof region.label).toBe("string"); // NOT a serialized DOM node
    const savedCount = saved.regions.length;

    // Leave the file and come back (navigate to People and back to the media file).
    await project.goToPeople();
    await project.goToSessions();
    await page.getByRole("gridcell", { name: AUDIO_NAME }).click();

    const frame2 = page.frameLocator('iframe[data-testid="plugin-frame"]');
    await expect(frame2.getByTestId("waveform")).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);

    // The region is still there (restore re-saves identical data, so the count is preserved).
    const after = JSON.parse(fs.readFileSync(sidecar, "utf8"));
    expect(after.regions.length).toBe(savedCount);
  });
});

// ---------------------------------------------------------------------------
// The frictionless dev loop: point lameta at a dev-plugin folder, then edit a source file on
// disk and confirm the open tab hot-reloads without any manual reload.
test.describe("Developer plugin folder hot-reloads on save", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let project: E2eProject;
  let devDir: string;

  function writeDevPlugin(marker: string) {
    fs.writeFileSync(
      Path.join(devDir, "plugin.json5"),
      `{ id: "org.lameta.test.dev", name: "Dev Plugin", version: "1.0.0", apiVersion: 1,
         tabs: [{ id: "main", label: "Dev Plugin", entry: "index.html",
                  match: { lametaTypes: ["Audio"] }, claimDefault: true, defaultPriority: 200 }] }`
    );
    fs.writeFileSync(
      Path.join(devDir, "index.html"),
      `<!doctype html><html><body>
         <div data-testid="dev-marker">${marker}</div>
         <script>parent.postMessage({type:"lameta:ready"},"*");</script>
       </body></html>`
    );
  }

  test.beforeAll(async ({}) => {
    cleanPluginsDir();
    devDir = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-devplugin-"));
    writeDevPlugin("MARKER_V1");

    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "DevPluginTest");
    await project.goToSessions();
    await project.addSession();
    await addSampleAudio(lameta, page);
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("editing the plugin source reloads the open tab", async ({}) => {
    // Set the developer plugin folder through the Plugins dialog (visible in E2E runs).
    await lameta.clickMenu("File", "Plugins...");
    const dialog = page.getByTestId("plugins-dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await lameta.mockShowOpenDialog([devDir]);
    await dialog.getByRole("button", { name: "Change..." }).click();
    // Wait for discovery (async: showOpenDialog -> setDeveloperPluginPath -> reload) to finish,
    // evidenced by the dev plugin appearing in the dialog, before we close it.
    await expect(
      dialog.locator('input[aria-label="enable org.lameta.test.dev"]')
    ).toBeVisible({ timeout: 10000 });
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden({ timeout: 5000 });
    // Wait for the MUI dialog backdrop to fully clear so it can't intercept the next click.
    await page
      .locator(".MuiBackdrop-root")
      .waitFor({ state: "hidden", timeout: 5000 })
      .catch(() => {});

    // Select the audio file and open the dev plugin's tab (explicit click avoids relying on
    // default-tab timing right after discovery).
    const cell = page.getByRole("gridcell", { name: AUDIO_NAME });
    await expect(cell).toBeVisible();
    await cell.click();
    const devTab = page.getByRole("tab", { name: "Dev Plugin" });
    await expect(devTab).toBeVisible({ timeout: 10000 });
    await devTab.click();
    const frame = page.frameLocator('iframe[data-testid="plugin-frame"]');
    await expect(frame.getByTestId("dev-marker")).toHaveText("MARKER_V1", {
      timeout: 10000
    });

    // Edit the plugin source on disk — no manual reload.
    writeDevPlugin("MARKER_V2");

    // The watcher (debounced) bumps the reload counter, remounting the iframe with the change.
    const frame2 = page.frameLocator('iframe[data-testid="plugin-frame"]');
    await expect(frame2.getByTestId("dev-marker")).toHaveText("MARKER_V2", {
      timeout: 10000
    });
  });
});

// ---------------------------------------------------------------------------
// Installing a .lmplug through the Plugins dialog: extract -> validate -> move -> rescan.
test.describe("Installing a .lmplug", () => {
  let lameta: LametaE2ERunner;
  let page: Page;
  let lmplugPath: string;
  const PLUGIN_ID = "org.lameta.test.e2e";

  test.beforeAll(async ({}) => {
    cleanPluginsDir();
    // Build a .lmplug from the fixture into a temp folder.
    const tmp = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-lmplug-"));
    lmplugPath = Path.join(tmp, "test-plugin.lmplug");
    await zipToLmplug(
      Path.join(__dirname, "fixtures", "test-plugin"),
      lmplugPath
    );

    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    await createNewProject(lameta, "InstallTest");
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("installs and lists the plugin", async ({}) => {
    await lameta.clickMenu("File", "Plugins...");
    const dialog = page.getByTestId("plugins-dialog");
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Install starts empty.
    await expect(
      dialog.locator(`input[aria-label="enable ${PLUGIN_ID}"]`)
    ).toHaveCount(0);

    // Mock the file picker to return our .lmplug, then click Install.
    await lameta.mockShowOpenDialog([lmplugPath]);
    await dialog.getByRole("button", { name: "Install plugin…" }).click();

    // After extraction + rescan, the plugin appears in the dialog...
    await expect(
      dialog.locator(`input[aria-label="enable ${PLUGIN_ID}"]`)
    ).toBeVisible({ timeout: 10000 });
    // ...and is installed on disk under userData/plugins/<id>.
    await expect
      .poll(
        () =>
          fs.existsSync(
            Path.join(pluginsDir(), PLUGIN_ID, "plugin.json5")
          ),
        { timeout: 10000 }
      )
      .toBe(true);
  });
});
