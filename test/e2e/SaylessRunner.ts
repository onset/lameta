import { default as electronPath, app } from "electron";
import { Application, SpectronClient } from "spectron";
import * as fs from "fs-extra";
import * as Path from "path";
import * as assert from "assert";
import Winston from "winston";
import os from "os";
import menuAddon from "spectron-menu-addon";
//const { app } = require("electron").remote;

//Spectron gives us this "app.client", which is WebdriverIO's "browser" object.
// See http://webdriver.io/api/state/isExisting.html# and friends for documentation.
// At the moment (Mar 2018) the jest expect statements are kudgy with webdriverio.
// Compare to http://webdriver.io/guide/plugins/chai-webdriverio.html, where you
// can say expect(selector).to.be.there()
// SEe https://medium.com/@RubenOostinga/combining-chai-and-jest-matchers-d12d1ffd0303

export default class SayLessRunner {
  public app: Application;
  public kProjectName = "e2eproject";

  public constructor() {
    process.env.startInStartScreen = "true";
    process.env.log = "e2e sayless.log";
    process.env.NODE_ENV = "test";
  }

  public async start(doClear: boolean = true): Promise<any> {
    // if (fs.existsSync("sayless.log")) {
    //   fs.removeSync("sayless.log");
    // }

    // const logger = Winston.createLogger({
    //   transports: [
    //     new Winston.transports.File({
    //       filename: "sayless.log",
    //       format: Winston.format.combine(
    //         Winston.format.timestamp({
    //           format: "hh:mm:ss"
    //         }),
    //         Winston.format.printf(
    //           info => `${iPnfo.timestamp} ${info.level}: ${info.message}`
    //         )
    //       ),
    //       handleExceptions: true
    //     })
    //   ]
    // });

    // logger.info("hello");

    if (doClear) {
      this.RemoveTestArtifacts();
    }

    this.app = menuAddon.createApplication({
      path: electronPath.toString(),
      args: [Path.join(__dirname, "..", "..", "app")],
      //doesn't seem to work.. maybe something else overrides
      env: { NODE_ENV: "test" }
    });

    // "Unable to find Electron app at ____\sayles\app" here can be caused
    // by not having a webpack-build "main-bundle.js" there. You can get that if you
    // have git-cleaned the src. "yarn dev" does not create it (seems to be
    // all in memory?) and "yarn watch-renderer" only creates "renderer-bundle.js".
    // Use "yarn build-production" or "yarn watch-main" to build it.
    await this.app.start();

    // NOTE: if you get waitUntilWindowLoaded: Cannot read property 'isLoading' of undefined,
    // ensure that the devtools isn't opened in the production build.
    return this.app.client.waitUntilWindowLoaded();
  }

  public RemoveTestArtifacts() {
    this.removeProject(this.kProjectName);
  }

  //
  // close the app and start, but don't touch any settings, existing projects, etc.
  //
  public async restart(cleanProject: boolean): Promise<any> {
    await this.stop();
    process.env.startInStartScreen = "false";
    await this.start(cleanProject);
    process.env.startInStartScreen = "true";
    return delay(1);
  }

  public get browser(): SpectronClient {
    return this.app.client;
  }

  public async clickMenu(menuName: string, item: string) {
    await delay(500);
    const menu = await menuAddon.getMenuItem(menuName, item);
    expect(menu).toBeTruthy();
    //await this.app.electron.ipcRenderer.send("click-menu", [menuName, item]);
    await menuAddon.clickMenu(menuName, item);
  }

  public stop(): Promise<Application> {
    if (this.app && this.app.isRunning()) {
      return this.app.stop();
    }
    throw new Error("SayLessRunner.stop() called but app wasn't running.");
  }

  public async shouldExist(selector: string, log?: string) {
    //const element = await this.app.client.element(selector);
    const exists = await this.app.client.waitForExist(selector, 2 * 1000);

    if (exists) {
      // console.log(log ? log : `Found element matching '${selector}'`);
    } else {
      console.log(log ? log : `Could not find element matching '${selector}'`);
      throw new Error(`Could not find element matching '${selector}'`);
    }
    expect(exists).toBe(true);
  }

  public async shouldNotExist(selector: string, log?: string) {
    //const element = await this.app.client.element(selector);
    const exists = await this.app.client.isExisting(selector);

    // if (exists) {
    //   throw new Error(`Should not have found element matching '${selector}'`);
    // }
    expect(exists).toBe(false);
  }

  public async expectCustomFieldWithText(name: string, text: string) {
    //    return this.shouldExist(`//textarea[@name='${name}' and text()='${text}']`);
    if (text.length > 0) {
      return this.shouldExist(
        `//textarea[@name='${name}' and text()='${text}']`
      );
    } else {
      // starting in late Dec 2018, checking for text()='' stopped working, so now we do this:
      return this.shouldExist(`//textarea[@name='${name}' and not(text())]`);
    }
  }
  public async expectCustomField(name: string) {
    return this.shouldExist(`//textarea[text()='${name}']`);
  }
  public async expectNoCustomField(name: string) {
    return this.shouldNotExist(`//textarea[text()='${name}']`);
  }

  public async typeInCustomField(name: string, text: string) {
    const selector = `//div[contains(@class,'field')]/textarea[@name='${name}']`;
    await this.click(selector);

    if (text.length === 0) {
      // webdriver has trouble clearing fields, I have tried many workarounds (they say it's a chrome problem, so maybe it will go away someday)
      // meanwhile, let's just send a " " instead.
      text = " ";
    }
    return this.browser.setValue(selector, text);
  }
  public async expectWindowTitle(title: string, log?: string) {
    await delay(500);
    const t = await this.app.browserWindow.getTitle();
    expect(t).toBe(title);
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
    //console.log(log ? log : "Clicking " + selector);
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
  public async clickAndType(selector: string, text: string, log?: string) {
    await this.shouldExist(selector);
    //console.log(log ? log : "Clicking " + selector);
    await this.browser.setValue("input", text);
  }

  public removeProject(projectName: string) {
    // note: at the point that this is called, the app hasn't started,
    // so we can't use this.app.electron
    // TODO: will this work on mac?
    const p = Path.join(os.homedir(), "documents", "lameta", projectName);
    // const p = Path.join(
    //   this.app.electron.remote.app.getPath("documents"),
    //   "lameta",
    //   projectName
    // );
    fs.removeSync(p);
  }

  public async goToStartScreen() {
    try {
      await this.app.client.waitForExist(".startScreen", 1000);
    } catch (error) {
      await this.clickMenu("&File", "&Start Screen");
      await this.shouldExist(".startScreen");
    }
  }

  // goToStartScreen() is working strangely...
  public async goToStartScreenHack() {
    await this.clickMenu("&File", "&Start Screen");
    await delay(1000);
    await this.shouldExist(".startScreen");
  }

  public async createdProjectWithSampleData() {
    await this.goToStartScreen();
    await this.shouldExist(".startScreen");
    await this.click("#createNewProjectWithSampleDataLink");
    await this.shouldExist(".createProject");

    //setting new project name

    await this.clickAndType("input", this.kProjectName);
    await this.click("#okButton", "clicking ok");
    await this.app.client.waitForExist(".tab-project");
    //console.log("Project created with sample data.");
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
    console.log(`${selector} table has ${actual}/${expectedRows} rows`);
  }

  public async typeFieldByNameAndTab(fieldName: string, text: string) {
    //return this.app.client.elementIdValue(fieldName, text);
    await this.app.client.element(`[name="${fieldName}"]`).setValue(text);
    // for some reason, doesn't take await
    this.app.client.keys("\t");
    await delay(100);
  }
  public async typeFieldBySelectorAndTab(selector: string, text: string) {
    //return this.app.client.elementIdValue(fieldName, text);
    await this.app.client.element(selector).setValue(text);
    // for some reason, doesn't take await
    this.app.client.keys("\t");
    await delay(100);
    //      .element(`//textarea[@name="${fieldName}"]`)
    //      .element(`[name="${fieldName}"]`)
    //    .setValue(text);
  }
  public async typeKeys(text: string) {
    this.app.client.keys(text);
    await delay(100);
  }

  public async selectFolder(nthFolderStartingWith1: number) {
    return this.click(
      "(//div[contains(@class,'folderList')]//div[contains(@class,'rt-tr-group')])[" +
        nthFolderStartingWith1 +
        "]"
    );
  }
}

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));
