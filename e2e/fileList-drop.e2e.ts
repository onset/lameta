import { test, expect } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let project: E2eProject;

test.describe("FileList drop behavior", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "FileList[drop-test]");
  });

  test.afterAll(async () => {
    await lameta.quit();
  });

  test("dropping a browser File without a path shows a warning and doesn't crash", async () => {
    await project.goToSessions();
    await project.addSession();

    // Find the Dropzone root by looking for the element with class 'fileList' that contains the overlay mask
    const dropTarget = lameta.page.locator(
      ".fileList:has(.onlyIfInDropZone)"
    );
    await dropTarget.waitFor({ state: "visible", timeout: 10000 });

    // Simulate dropping a browser-created File (has no .path property in renderer)
    await lameta.page.evaluate((selector) => {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) throw new Error("Drop target not found");
      const dt = new DataTransfer();
      const blob = new Blob(["hello"], { type: "image/png" });
      const file = new File([blob], "dropped-image.png", {
        type: "image/png"
      });
      dt.items.add(file);
      const ev = new DragEvent("drop", { dataTransfer: dt, bubbles: true });
      el.dispatchEvent(new Event("dragenter", { bubbles: true }));
      el.dispatchEvent(new Event("dragover", { bubbles: true }));
      el.dispatchEvent(ev);
    }, ".fileList:has(.onlyIfInDropZone)");

    // Expect a toast warning about missing file path
    const warning = lameta.page.getByText(
      "file path wasn't available",
      { exact: false }
    );
    await expect(warning).toBeVisible({ timeout: 10000 });

    // Capture a screenshot for the Linear issue
    await lameta.page.screenshot({
      path: "playwright-screenshot-issue-LAM-24.png",
      fullPage: true
    });
  });
});
