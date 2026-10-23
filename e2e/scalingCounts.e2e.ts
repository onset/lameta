import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { ProjectWriter } from "../sample-data-generator/torture/writer";
import { ContentMaker } from "../sample-data-generator/torture/content";
import { writeProject } from "../sample-data-generator/torture/cases";
import { writeBulk } from "../sample-data-generator/torture/bulk";

// How much the lists put on screen as the project grows, in a project made by
// sample-data-generator/torture with 300 sessions under ELAR. The window shows a few dozen
// rows, so a list that renders every row re-renders all of them on every change. A test
// marked `test.fail` describes the behavior lameta should have; the finding number points
// into perf-findings.md.

const kSessions = 300;
// more than a window shows, with room for a tall screen
const kRowsInView = 100;

let lameta: LametaE2ERunner;
let projectRoot: string;

test.describe("rendering as the project grows", () => {
  test.beforeAll(async () => {
    projectRoot = fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-scaling-"));
    const dir = Path.join(projectRoot, "Scaling");
    const ctx = {
      w: new ProjectWriter(dir),
      content: new ContentMaker(undefined),
      archiveConfiguration: "ELAR",
    };
    writeProject(ctx, "Scaling");
    writeBulk(ctx, kSessions, Math.round(kSessions * 0.3));
    lameta = new LametaE2ERunner();
    await lameta.launch({ extraArgs: [Path.join(dir, "Scaling.sprj")] });
    await lameta.page.getByTestId("project-tab").waitFor({ state: "visible", timeout: 120_000 });
    await lameta.cancelRegistration();
  });
  test.afterAll(async () => {
    await lameta.quit();
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  // The two tests below are expected to fail, and so would pass if the project did not load
  // or had too few problems; this one fails then.
  test("the project is large enough to measure", async () => {
    const page = lameta.page;
    await expect
      .poll(
        async () => {
          const text = await page.getByTestId("problems-indicator").innerText();
          return (text.match(/\d+/g) ?? []).map(Number).reduce((a, b) => a + b, 0);
        },
        { timeout: 120_000 },
      )
      .toBeGreaterThan(kRowsInView);
  });

  test.fail("the session list renders only the rows in view (finding 9)", async () => {
    const page = lameta.page;
    await page.getByTestId("sessions-tab").click();
    await page.getByTestId("new-session-button").waitFor({ state: "visible" });
    const rows = await page.locator(".folderList .rt-tbody .rt-tr").count();
    expect(rows).toBeLessThanOrEqual(kRowsInView);
  });

  test.fail("the problems panel renders only the entries in view (finding 10)", async () => {
    const page = lameta.page;
    if (!(await page.getByTestId("problems-sidebar").isVisible()))
      await page.getByTestId("problems-indicator").click();
    await page.getByTestId("problems-sidebar").waitFor({ state: "visible" });
    // the rules file's problems arrive after the first check; the indicator in the top
    // bar counts them all, whatever the panel renders
    await expect
      .poll(
        async () => {
          const text = await page.getByTestId("problems-indicator").innerText();
          return (text.match(/\d+/g) ?? []).map(Number).reduce((a, b) => a + b, 0);
        },
        { timeout: 120_000 },
      )
      .toBeGreaterThan(kRowsInView);
    expect(await page.getByTestId("problem-entry").count()).toBeLessThanOrEqual(kRowsInView);
  });
});
