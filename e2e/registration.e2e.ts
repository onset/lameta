import { test, expect as expect } from "@playwright/test";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";

let lameta: LametaE2ERunner;
let page: Page;

test.describe("Registration", () => {
  test.beforeAll(async () => {
    lameta = new LametaE2ERunner();
    page = await lameta.launch();
  });
  test.afterAll(async () => {
    await lameta.quit();
  });

  test("register then front window should be the start screen", async () => {
    // Wait for the registration dialog to mount and the OK button to be present
    const ok = page.getByTestId("ok");
    await expect(ok).toBeDisabled({ timeout: 15000 });

    // Target the email input within the registration dialog container
    const dialog = page.locator(".registrationDialog");
    const email = dialog.locator("input").first();
    await email.click();
    await email.fill("e2etest@example.com");

    // Still disabled until a usage option is chosen
    await expect(ok).toBeDisabled();

    await page.getByText("For documenting my own language").click();
    await expect(ok).toBeEnabled();
    await ok.click();

    const title = await page.title();
    expect(title).toBe("lameta");
  });
});
