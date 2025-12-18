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
    // Create a session and add a contributor with a role tied to a new person
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
    const name = "Ana María / Δ测试";
    // Focus first person chooser via keyboard, then type the name and Enter
    await page.keyboard.press("Tab");
    await page.keyboard.type(name);
    await page.keyboard.press("Enter");

    // Move to Role cell and choose a role by typing and Enter
    await page.keyboard.press("Tab");
    const roleQuery = "speaker"; // OLAC role id/label includes Speaker
    await page.keyboard.type(roleQuery);
    await page.keyboard.press("Enter");

    // Ensure a Person record exists with the same name so People list includes them
    await project.goToPeople();
    await project.addPerson(name);

    // Ensure the person row exists and select it
    await project.selectPerson(new RegExp(name, "i"));

    // Now search by role (ensure min length is respected)
    const input = page.getByTestId("folder-search-input");
    await input.fill("speaker");
    await input.press("Enter");

    // Open Contributions tab to see in-table highlights and wait until it is active
    const contributionsTab = page.getByRole("tab", { name: /Contributions/i });
    await contributionsTab.click();
    await expect(contributionsTab).toHaveAttribute("aria-selected", "true");

    const contributionsTable = page.locator(".personContributions");
    await contributionsTable
      .locator(".rt-tr-group")
      .first()
      .waitFor({ state: "visible", timeout: 10000 });

    // Wait for inline highlight mark to appear for the role text in the table
    await expect(
      contributionsTable.locator('[data-testid="inline-highlight"]').first()
    ).toBeVisible();

    // Contributions tab should show a highlight indicator (may render slightly later)
    await page.waitForFunction(
      () =>
        !!document.querySelector(
          '[data-testid="person-contributions-tab-highlight"]'
        )
    );
  });
});
