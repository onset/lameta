// @vitest-environment node
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as Path from "path";
import { makeRulesSandboxScript } from "./rulesSandboxScript";
import { IRulesSandboxOutput } from "./rulesSandboxMain";

// Runs ELAR's rules.js, through the same script the rules sandbox runs, over a folder
// of real IMDI files from ELAR, one subfolder per collection, and prints how often
// each check fired. It runs in Chrome (through Playwright), so the DOM is a real XML
// DOM. The files hold real people's data, so they never come into the repository:
// set LAMETA_ELAR_PRACTICE_DIR to the folder to run it.
const practiceDirectory = process.env.LAMETA_ELAR_PRACTICE_DIR;

describe.skipIf(!practiceDirectory)("ELAR rules.js on ELAR's practice IMDI", () => {
  it("runs on every file", async () => {
    const { chromium } = await import("playwright-core");
    const browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage();
    const rulesSource = fs.readFileSync("archive-configurations/ELAR/rules.js", "utf8");
    const collections = fs
      .readdirSync(practiceDirectory!, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);
    const lines: string[] = [];
    for (const collection of collections) {
      const directory = Path.join(practiceDirectory!, collection);
      const sessions = fs
        .readdirSync(directory)
        .filter((f) => f.endsWith(".imdi"))
        .map((f) => ({
          sessionId: f.replace(/\.imdi$/, ""),
          xml: fs.readFileSync(Path.join(directory, f), "utf8"),
        }));
      const script = makeRulesSandboxScript({
        rulesSource,
        sessions,
        metadataLanguages: ["en", "es"],
        maxProblems: 100000,
      });
      const start = Date.now();
      const output = (await page.evaluate(script)) as IRulesSandboxOutput;
      expect(output.errors).toEqual([]);
      const counts = new Map<string, number>();
      for (const p of output.problems) counts.set(p.checkId, (counts.get(p.checkId) ?? 0) + 1);
      lines.push(
        `${collection}: ${sessions.length} files, ${
          output.problems.length
        } problems in ${Date.now() - start} ms`,
      );
      for (const [id, n] of [...counts].sort(([a], [b]) => a.localeCompare(b)))
        lines.push(`  ${id.padEnd(40)} ${n}`);
    }
    await browser.close();
    console.log(lines.join("\n"));
    if (process.env.LAMETA_ELAR_PRACTICE_OUT)
      fs.writeFileSync(process.env.LAMETA_ELAR_PRACTICE_OUT, lines.join("\n"));
  }, 120000);
});
