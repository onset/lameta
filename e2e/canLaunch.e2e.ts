import { test, expect as expect } from "@playwright/test";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";

let lameta: LametaE2ERunner;
let page: Page;

test.describe("Can Launch", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("app launches and shows content (not just blank screen)", async () => {
    // Wait for the app to fully load by checking for the presence of expected UI elements
    // The app should show either registration dialog or main content
    
    // Check that the page is not blank by waiting for some content to appear
    // This could be either the registration dialog or main app content
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();
    
    // Verify the page title is set correctly
    const title = await page.title();
    expect(title).toBe("lameta");
    
    // Check that there's actual content rendered, not just a blank page
    // We expect either registration UI or main app UI to be present
    const hasRegistrationDialog = await page.locator(".registrationDialog").isVisible().catch(() => false);
    const hasMainContent = await page.locator("#root").isVisible().catch(() => false);
    
    // At least one of these should be true - either we see registration or main content
    expect(hasRegistrationDialog || hasMainContent).toBe(true);
    
    // If registration dialog is present, verify it has expected elements
    if (hasRegistrationDialog) {
      await expect(page.getByTestId("ok")).toBeVisible({ timeout: 15000 });
      await expect(page.getByTestId("cancel")).toBeVisible();
    }
  });
});
