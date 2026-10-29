import { test, expect, Page } from "@playwright/test";
import { ChildProcess } from "child_process";
import * as fs from "fs";
import * as Path from "path";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, lockFile, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let lock: ChildProcess | undefined;

test.describe("Delete All Marked Sessions", () => {
  test.skip(process.platform !== "win32", "locks a file the Windows way");

  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "DeleteMarked");
    page = lameta.page;
    await project.goToSessions();
    for (let i = 0; i < 3; i++) await project.addSession();
    await expect(project.sessionRows()).toHaveCount(3);
  });
  test.afterAll(async () => {
    lock?.kill();
    await lameta.quit();
  });

  test("keeps a marked session that could not be deleted when another one was", async () => {
    const rows = project.sessionRows();
    const idOf = async (row: number) =>
      ((await rows.nth(row).locator(".rt-td.id").textContent()) ?? "").trim();
    const deletable = await idOf(0);
    const locked = await idOf(1);
    const sessionsDirectory = Path.join(project.projectDirectory, "Sessions");
    lock = await lockFile(Path.join(sessionsDirectory, locked, "in use.txt"));

    await rows.nth(0).locator('input[type="checkbox"]').check();
    await rows.nth(1).locator('input[type="checkbox"]').check();
    await lameta.clickMenu("Session", "Delete All Marked Sessions...");
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("dialog").waitFor({ state: "hidden", timeout: 30000 });

    expect(fs.existsSync(Path.join(sessionsDirectory, deletable))).toBe(false);
    expect(fs.existsSync(Path.join(sessionsDirectory, locked))).toBe(true);
    await expect(rows).toHaveCount(2);
    await expect(
      page.locator(".rt-td.id", { hasText: new RegExp(`^${locked}$`) })
    ).toHaveCount(1);
  });
});
