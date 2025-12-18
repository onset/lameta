import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { launchWithProject, E2eProject } from "./various-e2e-helpers";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("People search by contribution role", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    project = await launchWithProject(lameta, "PeopleRoleSearch/ΔRoles");
    page = lameta.page;
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("typing a role filters and highlights person", async () => {
    // Use a simpler name to avoid potential encoding/matching issues
    const name = "TestSpeakerPerson";

    // First create the person so it exists before we reference it
    await project.goToPeople();
    await project.addPerson(name);

    // Wait for person to be saved
    await page.waitForTimeout(500);

    // Create a session and add a contributor with a role tied to the person
    await project.goToSessions();
    await project.addSession();

    // Select the new session row
    await page
      .getByRole("gridcell", { name: /New_Session/i })
      .first()
      .click();

    // Go to Contributors tab
    await project.goToContributorsOfThisSession();

    // Add a contributor name and set role
    // Focus first person chooser via keyboard, then type the name and Enter
    await page.keyboard.press("Tab");
    await page.keyboard.type(name);
    await page.keyboard.press("Enter");

    // Move to Role cell and choose a role by typing and Enter
    await page.keyboard.press("Tab");
    const roleQuery = "speaker"; // OLAC role id/label includes Speaker
    await page.keyboard.type(roleQuery);
    await page.keyboard.press("Enter");

    // Wait for contribution to be saved
    await page.waitForTimeout(500);

    // Go back to People and select the person
    await project.goToPeople();

    // Ensure the person row exists and select it
    await project.selectPerson(new RegExp(name, "i"));

    // Now search by role (ensure min length is respected)
    const input = page.getByTestId("folder-search-input");
    await input.fill("speaker");
    await input.press("Enter");

    // Wait for search to apply
    await page.waitForTimeout(500);

    // Open Contributions tab to see in-table highlights and wait until it is active
    const contributionsTab = page.getByRole("tab", { name: /Contributions/i });
    await contributionsTab.click();

    // Wait for tab to be fully active
    await expect(contributionsTab).toHaveAttribute("aria-selected", "true", {
      timeout: 5000
    });

    // Wait for loading to complete - contributions table should appear
    const contributionsTable = page.locator(".personContributions");
    await expect(contributionsTable).toBeVisible({ timeout: 10000 });

    // Wait for table rows to load (no more Loading... state)
    await contributionsTable
      .locator(".rt-tr-group")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    // Wait for inline highlight mark to appear for the role text in the table
    await expect(
      contributionsTable.locator('[data-testid="inline-highlight"]').first()
    ).toBeVisible({ timeout: 10000 });

    // Contributions tab should show a highlight indicator (may render slightly later)
    await page.waitForFunction(
      () =>
        !!document.querySelector(
          '[data-testid="person-contributions-tab-highlight"]'
        ),
      { timeout: 10000 }
    );
  });
});
