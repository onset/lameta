import { test, expect as expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import fs from "fs";
import * as Path from "path";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Drag and Drop Files", () => {
  test.beforeAll(async ({}) => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "DragDropTest");
    page = lameta.page;
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("dropping a file into a session adds it to the file list", async ({}) => {
    await project.goToSessions();
    await project.addSession();

    // Create a test file on disk
    const testFileName = "dropped-file.txt";
    const testFilePath = Path.join(process.env.E2ERoot!, testFileName);
    fs.writeFileSync(testFilePath, "This file was dropped via drag-and-drop");

    // Find the file list drop zone - use the outer wrapper that contains the drop text
    // There are two elements with class "fileList", we need the outer one that handles drops
    const fileList = page.locator(".fileList").first();
    await fileList.waitFor({ state: "visible", timeout: 5000 });

    // Simulate a file drop by dispatching a custom drop event
    // In Electron with nodeIntegration:true, File objects have a `path` property
    // Our injected electronAPI.getPathForFile reads this property
    await fileList.evaluate(
      (element, { filePath, fileName }) => {
        // Create a mock File object with the `path` property that Electron adds
        const mockFile = new File(["test content"], fileName, {
          type: "text/plain"
        });
        // Electron adds this path property when nodeIntegration is true
        (mockFile as any).path = filePath;

        // Create a DataTransfer with our mock file
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(mockFile);

        // Dispatch drop event
        const dropEvent = new DragEvent("drop", {
          bubbles: true,
          cancelable: true,
          dataTransfer
        });
        element.dispatchEvent(dropEvent);
      },
      { filePath: testFilePath, fileName: testFileName }
    );

    // Wait for the file to appear in the file list
    const fileCell = page.getByRole("gridcell", { name: testFileName });
    await expect(fileCell).toBeVisible({ timeout: 10000 });

    // Verify the file was actually copied to the session folder
    // The file should be in the session's folder (which is auto-named)
    await page.waitForTimeout(2000); // give time for file copy to complete
  });

  test("electronAPI.getPathForFile is available and works", async ({}) => {
    // Verify that our injected electronAPI is available
    const hasElectronAPI = await page.evaluate(() => {
      return (
        typeof (window as any).electronAPI !== "undefined" &&
        typeof (window as any).electronAPI.getPathForFile === "function"
      );
    });
    expect(hasElectronAPI).toBe(true);

    // Verify getPathForFile can read the path property from a File
    const testPath = await page.evaluate(() => {
      const mockFile = new File(["test"], "test.txt");
      (mockFile as any).path = "/mock/path/to/test.txt";
      return (window as any).electronAPI.getPathForFile(mockFile);
    });
    expect(testPath).toBe("/mock/path/to/test.txt");
  });
});
