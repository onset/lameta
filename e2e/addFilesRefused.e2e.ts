import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import * as fs from "fs";
import * as Path from "path";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Add Files with files that lameta refuses", () => {
  test.beforeAll(async ({}) => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "AddFilesRefused");
    page = lameta.page;
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("adds none of the selection and names each refused file", async ({}) => {
    await project.goToSessions();
    await project.addSession();

    const root = process.env.E2ERoot!;
    const ordinary = Path.join(root, "ordinary.wav");
    const session = Path.join(root, "notes.session");
    const folder = Path.join(root, "Some Photos");
    fs.writeFileSync(ordinary, "x");
    fs.writeFileSync(session, "x");
    fs.mkdirSync(folder, { recursive: true });

    await lameta.mockShowOpenDialog([ordinary, session, folder]);
    await page.getByRole("button", { name: "Add Files" }).click();

    const toast = page.locator(".Toastify__toast").filter({ hasText: "notes.session" });
    await expect(toast).toBeVisible({ timeout: 10000 });
    await expect(toast).toContainText("Some Photos");
    await expect(toast).not.toContainText("ordinary.wav");
    await expect(page.getByRole("gridcell", { name: "ordinary.wav" })).toHaveCount(0);

    // a second refusal while the first warning is still showing names its own files
    const person = Path.join(root, "someone.person");
    fs.writeFileSync(person, "x");
    await lameta.mockShowOpenDialog([ordinary, person]);
    // the first warning covers the button in the test window
    await page.getByRole("button", { name: "Add Files" }).dispatchEvent("click");
    await expect(
      page.locator(".Toastify__toast").filter({ hasText: "someone.person" }),
    ).toBeVisible({ timeout: 10000 });
  });
});
