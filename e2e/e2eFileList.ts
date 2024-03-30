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
    console.log("e2e root 2: " + process.env.E2ERoot);
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
      // pause for a second
      await this.page.waitForTimeout(500);
      fs.writeFileSync(wait.path, "hello world");

      await waitForCondition(wait.page, () => {
        return fs.existsSync(wait.path);
      });
    }
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
