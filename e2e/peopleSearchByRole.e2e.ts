import { test, expect, Page } from "@playwright/test";
import { LametaE2ERunner } from "./lametaE2ERunner";
import { createNewProject, E2eProject } from "./e2eProject";

let lameta: LametaE2ERunner;
let page: Page;
let project: E2eProject;

test.describe("People search by contribution role", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
    await lameta.cancelRegistration();
    project = await createNewProject(lameta, "PeopleRoleSearch/ΔRoles");
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

    // Open Contributions tab to see in-table highlights
    await page.getByRole("tab", { name: /Contributions/i }).click();

    // Wait for inline highlight mark to appear for the role text in the table
    await expect(page.getByTestId("inline-highlight").first()).toBeVisible();

    // Contributions tab should show a highlight indicator (may render slightly later)
    await page.waitForFunction(
      () =>
        !!document.querySelector(
          '[data-testid="person-contributions-tab-highlight"]'
        )
    );
  });
});
