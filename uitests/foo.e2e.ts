import { ElectronApplication, Page, _electron as electron } from "playwright";
import { test, expect as expect } from "@playwright/test";
let electronApp: ElectronApplication;

test.beforeAll(async () => {
  process.env.startInStartScreen = "true";
  electronApp = await electron.launch({ args: ["."] });
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

test.afterAll(async () => {
  const page = await electronApp.firstWindow();
});

test("window has correct title", async () => {
  const page = await electronApp.firstWindow();
  await page.waitForTimeout(50000);
  const title = await page.title();
  expect(title).toBe("lameta");
});

test("example testx", async () => {
  //const electronApp = await electron.launch({ args: ["."] });
  const isPackaged = await electronApp.evaluate(async ({ app }) => {
    // This runs in Electron's main process, parameter here is always
    // the result of the require('electron') in the main app script.
    return app.isPackaged;
  });

  expect(isPackaged).toBe(false);
});
