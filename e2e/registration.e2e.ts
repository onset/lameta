import { test, expect as expect } from "@playwright/test";
import { e2eNavigation } from "./navigation";

test("register then front window should be the start screen", async () => {
  const nav = new e2eNavigation();
  const page = await nav.launch();
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
