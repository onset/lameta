import { ElectronApplication, _electron as electron } from "playwright";
import { test, expect as expect } from "@playwright/test";
let electronApp: ElectronApplication;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: ["."],
    env: {
      NODE_ENV: "test" /* <-- doesn't work */,
      E2E: "true",
      E2E_USER_SETTINGS_STORE_NAME: "none", // like we're running for the first time
    },
  });
  electronApp.on("window", async (p) => {
    const page = await electronApp.firstWindow();

    // capture errors
    page.on("pageerror", (error) => {
      console.error(error);
    });
    // capture console messages
    page.on("console", (msg) => {
      console.log(msg.text());
    });
  });
});

test("register then front should be the start screen", async () => {
  const page = await electronApp.firstWindow();
  const ok = await page.getByRole("button", { name: "OK" });
  await expect(ok).toBeDisabled();
  const email = await page.locator('input:below(:text("Email"))').first();
  await email.click();
  await email.fill("e2etest@example.com");
  await expect(ok).toBeDisabled();
  await page.getByText("For documenting my own language").click();
  await expect(ok).toBeEnabled();
  //await page.pause();
  ok.click();

  const title = await page.title();
  expect(title).toBe("lameta");
});

test.afterAll(async () => {
  const page = await electronApp.firstWindow();
});
