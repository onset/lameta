import { test, Page } from "@playwright/test";
import * as fs from "fs";
import * as os from "os";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";

// Times what the user does in projects made by sample-data-generator/torture at several
// sizes, in the built app, with the renderer's CPU slowed down as on an old laptop.
// Records how many rows each list renders and how long the main thread is blocked.
// Skipped unless LAMETA_SCALING_DIRS lists the project folders, separated by ";".
// Writes LAMETA_SCALING_OUT (default: scaling-e2e.json in the temp folder).
//
//   $env:LAMETA_SCALING_DIRS="D:\perf-projects\elar-1;D:\perf-projects\elar-1000"
//   pnpm exec playwright test e2e/scalingMeasure.e2e.ts --workers=1

const dirs = (process.env.LAMETA_SCALING_DIRS ?? "").split(";").filter((d) => d.trim());
const kCpuSlowdown = Number(process.env.LAMETA_SCALING_CPU_SLOWDOWN ?? 4);
const kRepeats = 3;
// what has been measured so far, by project folder name
const report: Record<string, Timing[]> = {};

interface Timing {
  action: string;
  // time until what the user waits for is on screen
  ms: number[];
  // the sum of the main thread's tasks longer than 50 ms meanwhile
  blockedMs: number[];
  rows?: number;
  // a step that could not be done; the next steps still run
  error?: string;
}

// Starts recording long tasks in the renderer
async function startLongTasks(page: Page) {
  await page.evaluate(() => {
    const w = window as any;
    w.__longTasks = 0;
    w.__longTaskObserver?.disconnect();
    w.__longTaskObserver = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__longTasks += e.duration;
    });
    w.__longTaskObserver.observe({ type: "longtask" });
  });
}

async function timed(
  page: Page,
  results: Timing[],
  action: string,
  run: (i: number) => Promise<void>,
  repeats = kRepeats,
) {
  const timing: Timing = { action, ms: [], blockedMs: [] };
  results.push(timing);
  for (let i = 0; i < repeats; i++) {
    await startLongTasks(page);
    const start = Date.now();
    try {
      await run(i);
    } catch (e) {
      timing.error = String((e as Error).message ?? e);
      writeReport(report);
      return;
    }
    timing.ms.push(Date.now() - start);
    // let the observer deliver the last entries
    await page.waitForTimeout(100);
    timing.blockedMs.push(await page.evaluate(() => (window as any).__longTasks));
    // so that a run that stops early keeps what it measured
    writeReport(report);
  }
}

// the selected session's own fields, which show when its .session file is selected
async function showSessionFields(page: Page) {
  await page
    .getByRole("gridcell", { name: /\.session$/ })
    .first()
    .click();
  await page.getByTestId("field-title-edit").waitFor();
}

function writeReport(report: Record<string, Timing[]>): string {
  const out = process.env.LAMETA_SCALING_OUT ?? Path.join(os.tmpdir(), "scaling-e2e.json");
  fs.writeFileSync(out, JSON.stringify({ cpuSlowdown: kCpuSlowdown, report }, null, 2));
  return out;
}

const rows = (page: Page) => page.locator(".folderList .rt-tbody .rt-tr").count();

test.describe("scaling in the app", () => {
  test.skip(dirs.length === 0, "LAMETA_SCALING_DIRS is not set");
  // at 3000 sessions under ELAR the actions together take more than an hour
  test.setTimeout(3 * 3_600_000);

  test("times every action at every size", async () => {
    for (const source of dirs) {
      const dir = Path.join(
        fs.mkdtempSync(Path.join(os.tmpdir(), "lameta-scaling-")),
        Path.basename(source),
      );
      fs.cpSync(source, dir, { recursive: true });
      const sprj = fs.readdirSync(dir).find((f) => f.endsWith(".sprj"))!;
      const results: Timing[] = [];
      report[Path.basename(source)] = results;
      const lameta = new LametaE2ERunner();
      const start = Date.now();
      await lameta.launch({ extraArgs: [Path.join(dir, sprj)] });
      const page = lameta.page;
      // at 3000 sessions one click can keep the renderer busy for longer than the default 30 s
      page.setDefaultTimeout(600_000);
      await page.getByTestId("project-tab").waitFor({ state: "visible", timeout: 600_000 });
      await lameta.cancelRegistration();
      results.push({ action: "open (not slowed down)", ms: [Date.now() - start], blockedMs: [] });

      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: kCpuSlowdown });

      await timed(page, results, "switch to the Sessions tab", async () => {
        await page.getByTestId("project-tab").click();
        await page.getByTestId("sessions-tab").click();
        await page.getByTestId("new-session-button").waitFor({ state: "visible" });
      });
      results[results.length - 1].rows = await rows(page);

      const ids = await page
        .locator(".folderList .rt-tbody .rt-tr .rt-td:nth-child(2)")
        .allInnerTexts();
      const pick = (i: number) => ids[(Math.floor(ids.length / 2) + i) % ids.length].trim();
      await timed(page, results, "select a session", async (i) => {
        const id = pick(i);
        await page.locator(".folderList .rt-tbody .rt-tr").filter({ hasText: id }).first().click();
        await page.locator(".folderList .rt-tr.selected").filter({ hasText: id }).waitFor();
      });

      const title = page.getByTestId("field-title-edit");
      await showSessionFields(page);
      await title.click();
      await timed(page, results, "type 10 characters in the title", async () => {
        await page.keyboard.type("abcdefghij");
      });
      await timed(page, results, "wait 2 s after typing (problems recheck)", async () => {
        await page.keyboard.type("x");
        await page.waitForTimeout(2000);
      });

      await timed(page, results, "switch to People and back", async () => {
        await page.getByTestId("people-tab").click();
        await page.getByTestId("new-person-button").waitFor({ state: "visible" });
        await page.getByTestId("sessions-tab").click();
        await page.getByTestId("new-session-button").waitFor({ state: "visible" });
      });

      await timed(page, results, "sort the list by the second column", async () => {
        await page.locator(".folderList .rt-thead .rt-th").nth(1).click();
        await page.waitForTimeout(50);
      });

      const search = page.getByTestId("folder-search-input");
      await timed(
        page,
        results,
        "search the session list (type 'studio')",
        async () => {
          await search.click();
          await search.fill("");
          await search.type("studio");
          await page.waitForTimeout(50);
        },
        1,
      );
      results[results.length - 1].rows = await rows(page);
      await timed(page, results, "type 10 characters in the title after a search", async () => {
        await page.locator(".folderList .rt-tbody .rt-tr").first().click();
        await showSessionFields(page);
        await title.click();
        await page.keyboard.type("abcdefghij");
      });
      await page.getByTestId("folder-search-clear").click();

      await timed(page, results, "add a session", async () => {
        const before = await rows(page);
        await page.getByTestId("new-session-button").click();
        await page.waitForFunction(
          (n) => document.querySelectorAll(".folderList .rt-tbody .rt-tr").length > n,
          before,
        );
      });

      await timed(page, results, "open the problems panel", async () => {
        if (await page.getByTestId("problems-sidebar").isVisible())
          await page.getByTestId("hide-problems").click();
        await page.getByTestId("problems-indicator").click();
        await page.getByTestId("problems-sidebar").waitFor({ state: "visible" });
      });
      results[results.length - 1].rows = await page.getByTestId("problem-entry").count();

      await timed(page, results, "select a session with the panel open", async (i) => {
        const id = pick(i + 5);
        await page.locator(".folderList .rt-tbody .rt-tr").filter({ hasText: id }).first().click();
        await page.locator(".folderList .rt-tr.selected").filter({ hasText: id }).waitFor();
      });

      await timed(page, results, "click a problem", async (i) => {
        const entries = page.locator("button[data-testid='problem-entry']");
        await entries.nth((i * 7) % (await entries.count())).click();
        await page.waitForTimeout(200);
      });

      await timed(
        page,
        results,
        "open the export dialog (until its check is done)",
        async () => {
          await lameta.clickMenu("File", "Export Project...");
          await page.getByTestId("export-problems-summary").waitFor({ timeout: 600_000 });
          await page.keyboard.press("Escape");
          await page.getByTestId("export-problems-summary").waitFor({ state: "hidden" });
        },
        1,
      );

      report[Path.basename(source)] = results;
      writeReport(report);
      await lameta.quit();
      fs.rmSync(Path.dirname(dir), { recursive: true, force: true });
    }
    console.log(`Wrote ${writeReport(report)}`);
  });
});
