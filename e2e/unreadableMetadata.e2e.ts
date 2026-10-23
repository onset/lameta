import fs from "fs";
import * as Path from "path";
import { Page, test, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { E2eProject, launchWithProject } from "./various-e2e-helpers";

// A metadata file that lameta cannot read (here a zero-byte .session, as an
// interrupted cloud sync leaves it, and a truncated .meta) must not keep the project
// from opening. The session stays in the list, flagged, and shows why instead of its
// tabs; the media file stays in its list, and its metadata can't be edited.

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

const truncatedMeta = `<?xml version="1.0"?><MetaData><notes>unterminated`;

function sessionPath(id: string, fileName = id + ".session") {
  return Path.join(project.projectDirectory, "Sessions", id, fileName);
}
function writeFile(path: string, content: string) {
  fs.mkdirSync(Path.dirname(path), { recursive: true });
  fs.writeFileSync(path, content);
}

test.describe("metadata files that lameta cannot read", () => {
  test.setTimeout(120_000);

  test.beforeAll(async () => {
    const first = new LametaE2ERunner();
    project = await launchWithProject(first, "Unreadable");
    await first.quit();

    writeFile(sessionPath("Good"), `<Session><id type="string">Good</id></Session>`);
    writeFile(sessionPath("Good", "corrupt.wav"), "pretend audio");
    writeFile(sessionPath("Good", "corrupt.wav.meta"), truncatedMeta);
    writeFile(sessionPath("Broken"), "");

    lameta = new LametaE2ERunner();
    page = await lameta.launch({
      extraArgs: [
        Path.join(project.projectDirectory, Path.basename(project.projectDirectory) + ".sprj"),
      ],
    });
    await lameta.cancelRegistration();
    project = Object.assign(new E2eProject(lameta), {
      projectDirectory: project.projectDirectory,
    });
    await page.getByTestId("project-tab").waitFor({ state: "visible", timeout: 15000 });
  });
  test.afterAll(async () => {
    await lameta?.quit();
  });

  test("opens the project, flags the session and shows why instead of its tabs", async () => {
    await project.goToSessions();

    const flag = page.getByTestId("unreadable-metadata-flag");
    await expect(flag).toHaveCount(1);
    await flag.click();

    await expect(page.getByTestId("file-status-metadataUnreadable")).toBeVisible();
    await expect(page.locator(".folder-bottom-pane [role=tab]")).toHaveCount(0);
  });

  test("keeps a media file whose .meta is unreadable, with nothing to edit", async () => {
    await project.goToSessions();
    await page.getByRole("gridcell", { name: "Good" }).first().click();
    await page.getByRole("gridcell", { name: "corrupt.wav" }).first().click();

    await expect(page.getByTestId("file-status-metadataUnreadable")).toBeVisible();
    for (const tab of ["Properties", "Contributors", "Notes"]) {
      await page.locator(".folder-bottom-pane").getByRole("tab", { name: tab }).click();
      await expect(page.getByTestId("unreadable-metadata")).toBeVisible();
      await expect(
        page.locator(
          ".folder-bottom-pane input, .folder-bottom-pane textarea, .folder-bottom-pane [contenteditable=true]",
        ),
      ).toHaveCount(0);
    }
  });

  test("shows no notification and writes over neither file", async () => {
    await project.goToSessions();
    await page.getByRole("gridcell", { name: "Broken" }).first().click();
    await page.getByRole("gridcell", { name: "Good" }).first().click();
    await project.goToProject();

    await expect(page.locator(".Toastify__toast")).toHaveCount(0);
    expect(fs.readFileSync(sessionPath("Broken"), "utf8")).toBe("");
    expect(fs.readFileSync(sessionPath("Good", "corrupt.wav.meta"), "utf8")).toBe(truncatedMeta);
  });
});

test.describe("a project whose .sprj lameta cannot read", () => {
  test.setTimeout(120_000);
  let sprj: string;

  test.beforeAll(async () => {
    const first = new LametaE2ERunner();
    const created = await launchWithProject(first, "UnreadableSprj");
    await first.quit();
    sprj = Path.join(created.projectDirectory, Path.basename(created.projectDirectory) + ".sprj");
    fs.writeFileSync(sprj, "");

    lameta = new LametaE2ERunner();
    page = await lameta.launch({ extraArgs: [sprj] });
    await lameta.cancelRegistration();
    project = Object.assign(new E2eProject(lameta), {
      projectDirectory: created.projectDirectory,
    });
    await page.getByTestId("project-tab").waitFor({ state: "visible", timeout: 15000 });
  });
  test.afterAll(async () => {
    await lameta?.quit();
  });

  test("shows why on the tabs that edit the project, and writes nothing", async () => {
    await project.goToProject();
    for (const tab of ["project-configuration-tab", "project-funding-project-tab"]) {
      await page.getByTestId(tab).click();
      await expect(page.getByTestId("unreadable-metadata")).toBeVisible();
    }
    await project.goToSessions();
    await project.goToProject();
    expect(fs.readFileSync(sprj, "utf8")).toBe("");
  });
});
