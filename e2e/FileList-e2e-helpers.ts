import fs from "fs";
import * as Path from "path";
import { Page } from "playwright-core";
import { LametaE2ERunner } from "./lametaE2ERunner";

export class E2eFileList {
  public page: Page;
  public lameta: LametaE2ERunner;
  public projectDirectory: string;
  public constructor(lameta: LametaE2ERunner, page, projectDirectory) {
    this.lameta = lameta;
    this.page = lameta.page;
    this.projectDirectory = projectDirectory;
  }

  public async addFile(
    name: string,
    wait: { page: Page; path: string } | undefined = undefined
  ) {
    //console.log("e2e root 2: " + process.env.E2ERoot);
    // first, creating the "original" at our test root, which is a level above the lameta project directory
    const p = Path.join(process.env.E2ERoot!, name);
    fs.writeFileSync(p, "hello world");
    // then we prepare the mock to choose that
    await this.lameta.mockShowOpenDialog([p]);
    // then when we click the button, the mock should return it and it should get copied
    await this.page.getByRole("button", { name: "Add Files" }).click(); // await page.getByRole('gridcell', { name: 'New Session.session' }).click();

    //  This test was breaking becuase the file hasn't actually been created yet. works fine if you pause here in the debugger
    // looking at how complex the code is that does the copying, I'm not surprised that even using await, you don't
    // really know when it is done.
    // Wait for the file to exist:
    // this gets really flaky with the mocking and background copying.
    // for now, if we actualy need this file, let's just put it where we want it
    if (wait) {
      // wait for the directory containing the file to exist
      await waitForCondition(wait.page, () => {
        return fs.existsSync(Path.dirname(wait.path));
      });

      // Retry writing the file in case it's temporarily locked by the app's copy operation
      await retryWriteFile(wait.page, wait.path, "hello world");

      await waitForCondition(wait.page, () => {
        return fs.existsSync(wait.path);
      });
    }
  }

  public async selectFile(fileName: string) {
    // Use DOM readiness signals instead of time-based pauses
    const fileCell = this.page
      .getByRole("gridcell", { name: fileName })
      .first();
    await fileCell.waitFor({ state: "attached", timeout: 5000 });
    await fileCell.scrollIntoViewIfNeeded();
    await fileCell.waitFor({ state: "visible", timeout: 5000 });

    // Wait for the file row to not be in copy pending state
    // The click handler ignores clicks when file.copyInProgress is true
    const fileRow = this.page.getByRole("row").filter({ has: fileCell });
    await fileRow.waitFor({ state: "visible", timeout: 5000 });

    // About these timeouts:
    // We've had hard to reproduce timing issues, e.g. only happening when testing installed version + doing lots of tests (not just one)
    await this.page.waitForTimeout(1000);
    await fileCell.click({ timeout: 5000 });
    await this.page.waitForTimeout(1000); // let the rendering dust settle
  }

  public async selectPerson(personName: string) {
    const personCell = this.page.getByRole("gridcell", { name: personName });
    await personCell.waitFor({ state: "visible", timeout: 5000 });
    await personCell.click();
  }
}

async function waitForCondition(page: any, conditionFunction: () => boolean) {
  if (!page) {
    throw new Error("page is null");
  }
  while (true) {
    if (conditionFunction()) {
      return;
    }
    await page.waitForTimeout(1000); // wait for 1 second before checking the condition again
  }
}

// Retry writing a file with exponential backoff if it's temporarily locked
async function retryWriteFile(
  page: any,
  filePath: string,
  content: string,
  maxRetries = 5
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      fs.writeFileSync(filePath, content);
      return;
    } catch (err: any) {
      if (err.code === "EBUSY" && attempt < maxRetries - 1) {
        // Wait with exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
        await page.waitForTimeout(100 * Math.pow(2, attempt));
      } else {
        throw err;
      }
    }
  }
}
