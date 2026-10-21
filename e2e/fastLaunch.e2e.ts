import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

/**
 * Tests for the fast launch feature that bypasses registration and start screen UI.
 * This demonstrates the performance improvement for E2E tests.
 */

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("Fast Launch Feature", () => {
  test.afterEach(async () => {
    if (lameta) {
      await lameta.quit();
    }
  });

  test("can launch directly to a new project", async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "FastLaunchTest");
    page = lameta.page;

    // Verify we're in a project workspace (not start screen)
    await expect(page.getByTestId("project-tab")).toBeVisible();
    await expect(page.getByTestId("sessions-tab")).toBeVisible();
    await expect(page.getByTestId("people-tab")).toBeVisible();

    // Verify project directory was set correctly
    expect(project.projectDirectory).toContain("FastLaunchTest");
  });

  test("can launch with ELAR archive configuration", async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "FastLaunchELAR", "ELAR");
    page = lameta.page;

    // Navigate to project configuration to verify ELAR is set
    await project.goToProjectConfiguration();

    // Check that ELAR is selected in the archive configuration dropdown
    const archiveSelect = page.locator("#archiveConfigurationName-select");
    await expect(archiveSelect).toContainText("ELAR");

    // Verify ELAR-specific features are available
    // For example, the Collection tab should show ELAR-specific fields
    await project.goToProjectCollection();

    // ELAR has a "Steward" field that should be visible
    const stewardField = page.locator(
      '[data-testid="field-collectionSteward-edit"]'
    );
    await expect(stewardField).toBeVisible();
  });

  test("fast launch project has sessions tab ready", async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "FastLaunchSessions");
    page = lameta.page;

    // Can immediately navigate to sessions tab and add sessions
    await project.goToSessions();
    await project.addSession();

    // Verify a session was created
    const sessionCell = page.getByRole("gridcell", { name: /New_Session/i });
    await expect(sessionCell.first()).toBeVisible();
  });
});
