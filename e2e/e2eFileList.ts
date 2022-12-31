import fs from "fs";
import * as Path from "path";
import { Page, _electron as electron } from "playwright";
import { Lameta } from "./Lameta";

export class E2eFileList {
  public page: Page;
  public lameta: Lameta;
  public projectDirectory: string;
  public constructor(lameta: Lameta, page, projectDirectory) {
    this.lameta = lameta;
    this.page = lameta.page;
    this.projectDirectory = projectDirectory;
  }

  public async addFile(name: string) {
    const p = Path.join(process.env.E2ERoot!, name); // creating it at our test root, which is a level above the lameta project directory
    fs.writeFileSync(p, "hello world");
    this.lameta.mockShowOpenDialog([p]);
    await this.page.getByRole("button", { name: "Add Files" }).click(); // await page.getByRole('gridcell', { name: 'New Session.session' }).click();
  }
}
