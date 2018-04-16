//import * as electronPath from "electron";
//import * as webdriverio from "webdriverio";
import { Application, SpectronClient } from "spectron";
import * as fs from "fs-extra";
import * as Path from "path";
import * as assert from "assert";
//import { remote } from "electron";

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
    //TODO:
    const electronPath = "C:/dev/sayless/node_modules/.bin/electron.cmd";
    this.app = new Application({
      path: electronPath.toString(),
      args: [Path.join(__dirname, "..", "..", "app")]
    });

    await this.app.start();

    // NOTE: if you get waitUntilWindowLoaded: Cannot read property 'isLoading' of undefined,
    // ensure that the devtools isn't opened in the production build.
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

  public async clickMenu(menuName:string, item:string){
    await delay(500);
    await this.app.electron.ipcRenderer.send('click-menu', [menuName, item]);
  }

  public stop(): Promise<Application> {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
    throw new Error("SayLessRunner.stop() called but app wasn't running.");
  }

  public async shouldExist(selector: string, log?: string) {
    //const element = await this.app.client.element(selector);
    const exists = await this.app.client.isExisting(selector);

    if (exists) {
      console.log(log ? log : `Found element matching '${selector}'`);
    } else {
      console.log(log ? log : `Could not find element matching '${selector}'`);
      throw new Error(`Could not find element matching '${selector}'`);
    }
    expect(exists).toBe(true);
  }

  public async expectFieldContentsByName(
    name: string,
    value: string,
    log?: string
  ) {
    const selector = `[name='${name}']`;
    await this.shouldExist(selector);
    const actual = await this.app.client.getValue(selector);
    if (actual === value) {
      console.log(`${selector} has value ${actual}`);
    } else {
      throw new Error(
        `Expected field matching ${selector} to be '${value}' but it was '${actual}'`
      );
    }
  }

  public async click(selector: string, log?: string) {
    await this.shouldExist(selector);
    console.log(log ? log : "Clicking " + selector);
    await this.browser.click(selector);
  }

  public async clickFolderRowWithText(match: string) {
    //NB: the docs show that div*= should give a partial match, but at the moment it's not working
    // maybe spectron is behind.
    //const selector = `div*=${match}`; //nb: no quotes around the match
    //    const selector = `//div[contains(.,"${match}")]`;
    //const selector = `//div[contains(text(), "${match}")]`;
    const selector = `div=${match}`;

    await this.shouldExist(selector);
    const element = await this.app.client.element(selector);
    console.log(JSON.stringify(element));
    console.log("Clicking " + selector);
    //await this.app.client.click(element.value.ELEMENT);
    //await this.app.client.click("selector");
    await this.app.client.element(".folderList").click(selector);
    console.log("Clicked on " + selector);
    //await delay(500);
  }
  public async goToProjectTab() {
    await this.click(".tab-project");
    return delay(500);
  }
  public async goToSessionsTab() {
    await this.click(".tab-sessions");
    return delay(500);
  }
  public async goToPeopleTab() {
    await this.click(".tab-people");
    return delay(500);
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

  public async goToStartScreen(){
    await this.clickMenu("&Project","&Start Screen");
  }

  public async createdProjectWithSampleData() {
    await this.goToStartScreen();
    await this.shouldExist(".startScreen");
    await this.click("#createNewProjectWithSampleDataLink");
    await this.shouldExist(".createProject");

    //setting new project name

    await this.type("input", this.kProjectName);
    await this.click("button", "clicking ok");
    await this.app.client.waitForExist(".tab-project");
    console.log("Project created with sample data.");
  }

  public async expectFolderListRowCount(expectedRows: number) {
    return this.expectTableRowsLength(".folderList", expectedRows);
  }
  public async expectFileListRowCount(expectedRows: number) {
    return this.expectTableRowsLength(".fileList", expectedRows);
  }

  public async expectTableRowsLength(selector: string, expectedRows: number) {
    await this.shouldExist(selector);
    const allRows = await this.app.client.elements(selector + " .rt-tr-group");
    const paddingRows = await this.app.client.elements(
      selector + " .rt-tr-group .-padRow"
    );
    const actual = allRows.value.length - paddingRows.value.length;
    assert.ok(
      actual === expectedRows,
      `Expected ${selector} table to have ${expectedRows} rows but it has ${actual}`
    );
    console.log(`${selector} table has ${actual}/${expectedRows} rows`)
  }

  public async typeField(fieldName: string, text: string) {
    //return this.app.client.elementIdValue(fieldName, text);
    await this.app.client.element(`[name="${fieldName}"]`).setValue(text);
    // for some reason, doesn't take await
    this.app.client.keys("\t");
    await delay(100);
    //      .element(`//textarea[@name="${fieldName}"]`)
    //      .element(`[name="${fieldName}"]`)
    //    .setValue(text);
  }
}

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));
