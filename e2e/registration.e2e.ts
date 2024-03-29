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
    const ok = await page.getByRole("button", { name: "OK" });
    await expect(ok).toBeDisabled();
    const email = await page.locator('input:below(:text("Email"))').first();
    await email.click();
    await email.fill("e2etest@example.com");
    await expect(ok).toBeDisabled();
    await page.getByText("For documenting my own language").click();
    await expect(ok).toBeEnabled();
    await ok.click();

    const title = await page.title();
    expect(title).toBe("lameta");
  });
});
