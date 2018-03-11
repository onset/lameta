import * as electronPath from "electron";
import * as webdriverio from "webdriverio";
import { Application, SpectronClient } from "spectron";
import * as fs from "fs-extra";
import * as Path from "path";

//Spectron gives us this "app.client", which is WebdriverIO's "browser" object.
// See http://webdriver.io/api/state/isExisting.html# and friends for documentation.
// At the moment (Mar 2018) the jest expect statements are kudgy with webdriverio.
// Compare to http://webdriver.io/guide/plugins/chai-webdriverio.html, where you
// can say expect(selector).to.be.there()
// SEe https://medium.com/@RubenOostinga/combining-chai-and-jest-matchers-d12d1ffd0303

export default class SayLessRunner {
  public app: Application;
  public kProjectName = "e2eproject";

  public constructor() {}
  public async start(doClear: boolean = true): Promise<any> {
    if (doClear) {
      this.removeProject(this.kProjectName);
    }
    this.app = new Application({
      path: electronPath.toString(),
      args: [Path.join(__dirname, "..", "..", "app")]
    });

    await this.app.start();
    return this.app.client.waitUntilWindowLoaded();
  }

  //
  // close the app and start, but don't touch any settings, existing projects, etc.
  //
  public async restart(): Promise<Application> {
    await this.stop();
    return this.start(false);
  }

  public get browser(): SpectronClient {
    return this.app.client;
  }

  public stop(): Promise<Application> {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
    throw new Error("SayLessRunner.stop() called but app wasn't running.");
  }

  public async shouldExist(selector: string, log?: string) {
    console.log(log ? log : "Expecting " + selector);
    expect(await this.app.client.isExisting(selector)).toBe(true);
  }

  public async click(selector: string, log?: string) {
    await this.shouldExist(selector);
    console.log(log ? log : "Clicking " + selector);
    await this.browser.click(selector);
  }

  public async type(selector: string, text: string, log?: string) {
    await this.shouldExist(selector);
    console.log(log ? log : "Clicking " + selector);
    await this.browser.setValue("input", text);
  }

  public removeProject(projectName: string) {
    const p = Path.join(
      "C:/Users/hatto/Documents", ////app.getPath("documents"), TODO
      "SayLess",
      projectName
    );
    fs.removeSync(p);
  }
}
