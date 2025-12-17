import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";
import { E2eFileList } from "./FileList-e2e-helpers";
import * as fs from "fs";
import * as Path from "path";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;
let fileList: E2eFileList;

test.describe("TIFF Image Viewer", () => {
  test.beforeAll(async ({}) => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "TiffViewerTest");
    page = lameta.page;
    fileList = new E2eFileList(lameta, page, project.projectDirectory);
  });

  test.afterAll(async ({}) => {
    await lameta.quit();
  });

  test("TIFF file displays in canvas viewer", async ({}, testInfo) => {
    await project.goToSessions();
    await project.addSession();

    // Copy a TIFF file to the E2E test root so we can add it
    const sourceTiff = Path.join(
      process.cwd(),
      "sample data",
      "test-red-square.tif"
    );
    const testTiffName = "sample-tiff.tif";
    const destTiff = Path.join(process.env.E2ERoot!, testTiffName);

    // Make sure the source file exists
    if (!fs.existsSync(sourceTiff)) {
      throw new Error(`Source TIFF not found at ${sourceTiff}`);
    }

    fs.copyFileSync(sourceTiff, destTiff);

    // Mock the file dialog and add the file
    await lameta.mockShowOpenDialog([destTiff]);
    await page.getByRole("button", { name: "Add Files" }).click();

    // Wait for the file to appear in the list
    const tiffCell = page.getByRole("gridcell", { name: testTiffName });
    await expect(tiffCell).toBeVisible({ timeout: 10000 });

    // Click on the TIFF file to select it
    await tiffCell.click();

    // Wait a bit for the viewer to load
    await page.waitForTimeout(1000);

    // Check that the Image tab is visible
    const imageTab = page.getByRole("tab", { name: "Image" });
    await expect(imageTab).toBeVisible();

    // Click on Image tab to make sure we're viewing it
    await imageTab.click();

    // Verify the TIFF viewer canvas is present
    const tiffCanvas = page.getByTestId("tiff-viewer-canvas");
    await expect(tiffCanvas).toBeVisible({ timeout: 10000 });

    // Verify the canvas has dimensions (indicating the image was rendered)
    const canvasWidth = await tiffCanvas.evaluate(
      (el: HTMLCanvasElement) => el.width
    );
    const canvasHeight = await tiffCanvas.evaluate(
      (el: HTMLCanvasElement) => el.height
    );

    expect(canvasWidth).toBeGreaterThan(0);
    expect(canvasHeight).toBeGreaterThan(0);
  });

  test("regular image still displays with img tag", async ({}, testInfo) => {
    await project.goToSessions();
    await project.addSession();

    // Create a simple text file that we'll rename to .png to test the img fallback
    // Actually, let's just verify that a non-tiff image would use img tag
    const testPngName = "test-image.png";
    const destPng = Path.join(process.env.E2ERoot!, testPngName);

    // Create a minimal valid PNG (1x1 transparent pixel)
    const minimalPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
      0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
      0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
    ]);
    fs.writeFileSync(destPng, minimalPng);

    // Mock the file dialog and add the file
    await lameta.mockShowOpenDialog([destPng]);
    await page.getByRole("button", { name: "Add Files" }).click();

    // Wait for the file to appear in the list
    const pngCell = page.getByRole("gridcell", { name: testPngName });
    await expect(pngCell).toBeVisible({ timeout: 10000 });

    // Click on the PNG file to select it
    await pngCell.click();

    // Wait a bit for the viewer to load
    await page.waitForTimeout(500);

    // Check that the Image tab is visible
    const imageTab = page.getByRole("tab", { name: "Image" });
    await expect(imageTab).toBeVisible();

    // Click on Image tab
    await imageTab.click();

    // Verify we have an img tag (not a canvas) for non-TIFF images
    const imgElement = page.locator("img.imageViewer");
    await expect(imgElement).toBeVisible({ timeout: 5000 });

    // The TIFF canvas should NOT be present for PNG files
    const tiffCanvas = page.getByTestId("tiff-viewer-canvas");
    await expect(tiffCanvas).not.toBeVisible();
  });
});
