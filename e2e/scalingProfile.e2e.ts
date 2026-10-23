import { test } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";

// Records a CPU profile of the renderer while the user types in a session's title, in a
// project made by sample-data-generator/torture. Skipped unless LAMETA_SCALING_PROFILE_DIR
// names the project. Writes LAMETA_SCALING_PROFILE_OUT (default: typing.cpuprofile in the
// temp folder), which Chrome DevTools' Performance panel opens.

const projectDir = process.env.LAMETA_SCALING_PROFILE_DIR;

test.describe("profile typing", () => {
  test.skip(!projectDir, "LAMETA_SCALING_PROFILE_DIR is not set");
  test.setTimeout(1_800_000);

  test("profiles three keystrokes in a session's title", async () => {
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
    const title = page.getByTestId("field-title-edit");
    await title.click();
    // let the checks that follow opening finish
    await page.waitForTimeout(20_000);

    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Profiler.enable");
    await cdp.send("Profiler.setSamplingInterval", { interval: 500 });
    await cdp.send("Profiler.start");
    await page.keyboard.type("abc");
    await page.waitForTimeout(300);
    const { profile } = await cdp.send("Profiler.stop");
    const out =
      process.env.LAMETA_SCALING_PROFILE_OUT ?? Path.join(os.tmpdir(), "typing.cpuprofile");
    fs.writeFileSync(out, JSON.stringify(profile));
    console.log(`Wrote ${out}`);
    await lameta.quit();
    fs.rmSync(Path.dirname(dir), { recursive: true, force: true });
  });
});
