import { test, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";

// Records a CPU profile of the renderer during one user action, in a project made by
// sample-data-generator/torture. Skipped unless LAMETA_SCALING_PROFILE_DIR names the
// project. LAMETA_SCALING_PROFILE_ACTION picks the action: "typing" (the default, three
// keystrokes in a session's title), "select" (selecting another session) or "add" (adding a
// session). Writes LAMETA_SCALING_PROFILE_OUT (default: <action>.cpuprofile in the temp
// folder), which Chrome DevTools' Performance panel opens.

const projectDir = process.env.LAMETA_SCALING_PROFILE_DIR;
const action = process.env.LAMETA_SCALING_PROFILE_ACTION ?? "typing";

const actions: Record<string, (page: Page) => Promise<void>> = {
  typing: async (page) => {
    await page.keyboard.type("abc");
    await page.waitForTimeout(300);
  },
  select: async (page) => {
    const rows = page.locator(".folderList .rt-tbody .rt-tr");
    const row = rows.nth(Math.floor((await rows.count()) / 2));
    await row.click();
    await page.locator(".folderList .rt-tr.selected").waitFor();
    await page.waitForTimeout(300);
  },
  add: async (page) => {
    const before = await page.locator(".folderList .rt-tbody .rt-tr").count();
    await page.getByTestId("new-session-button").click();
    await page.waitForFunction(
      (n) => document.querySelectorAll(".folderList .rt-tbody .rt-tr").length > n,
      before,
    );
    // past the 1.5 s after which the rules check generates the IMDI that is due
    await page.waitForTimeout(2000);
  },
};

test.describe("profile an action", () => {
  test.skip(!projectDir, "LAMETA_SCALING_PROFILE_DIR is not set");
  test.setTimeout(1_800_000);

  test(`profiles ${action}`, async () => {
    const dir = Path.join(
      fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-profile-")),
      Path.basename(projectDir!),
    );
    fs.cpSync(projectDir!, dir, { recursive: true });
    const sprj = fs.readdirSync(dir).find((f) => f.endsWith(".sprj"))!;
    const lameta = new LametaE2ERunner();
    await lameta.launch({ extraArgs: [Path.join(dir, sprj)] });
    const page = lameta.page;
    page.setDefaultTimeout(600_000);
    await page.getByTestId("project-tab").waitFor({ state: "visible" });
    await lameta.cancelRegistration();
    await page.getByTestId("sessions-tab").click();
    await page.getByTestId("new-session-button").waitFor({ state: "visible" });
    await page
      .getByRole("gridcell", { name: /\.session$/ })
      .first()
      .click();
    await page.getByTestId("field-title-edit").click();
    // let the checks that follow opening finish
    await page.waitForTimeout(20_000);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
    await cdp.send("Profiler.start");
    await actions[action](page);
    const { profile } = await cdp.send("Profiler.stop");
    const out =
      process.env.LAMETA_SCALING_PROFILE_OUT ?? Path.join(os.tmpdir(), `${action}.cpuprofile`);
    fs.writeFileSync(out, JSON.stringify(profile));
    console.log(`Wrote ${out}`);
    await lameta.quit();
    fs.rmSync(Path.dirname(dir), { recursive: true, force: true });
  });
});
