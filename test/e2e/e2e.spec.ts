import * as electronPath from "electron";
import * as webdriverio from "webdriverio";
import { Application } from "spectron";
import * as fs from "fs-extra";
import * as Path from "path";

// import * as chai from "chai";
// const chaiWebdriver = require("chai-webdriverio").default;
//import chaiWebdriver from "chai-webdriverio";

//Spectron gives us this "app.client", which is WebdriverIO's "browser" object.
// See http://webdriver.io/api/state/isExisting.html# and friends for documentation.
// At the moment (Mar 2018) the jest expect statements are kudgy with webdriverio.
// Compare to http://webdriver.io/guide/plugins/chai-webdriverio.html, where you
// can say expect(selector).to.be.there()
// SEe https://medium.com/@RubenOostinga/combining-chai-and-jest-matchers-d12d1ffd0303

// NOTE: if using JEST vscode extension, it doesn't seem to run in the background
// like with normal unit tests, but when you click "Debug" to run a test, it will
// run two copies of it.
// You can stop the Jest extension from doing this
// with ctrl+shift+p, Jest:stop Runner. There may be a way to
// stop it trying to run things in parrallel, that might help?

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

describe("main window", function spec() {
  let app: Application;

  function removeProject(projectName: string) {
    const p = Path.join(
      "C:/Users/hatto/Documents", ////app.getPath("documents"), TODO
      "SayLess",
      projectName
    );
    fs.removeSync(p);
  }

  const kProjectName = "e2eproject";
  beforeAll(async () => {
    removeProject(kProjectName);
    app = new Application({
      path: electronPath.toString(),
      args: [Path.join(__dirname, "..", "..", "app")]
    });

    // setup from https://github.com/marcodejongh/chai-webdriverio
    // this runs, but subsequent calls to expect don't seem to use chai-webdriverio
    // not clear what the argument is supposed to be
    // chai.use(chaiWebdriver(app.client));

    return app.start();
  });

  afterAll(() => {
    if (app && app.isRunning()) {
      return app.stop();
    }
    return false;
  });

  // const findCounter = () => app.client.element('[data-tid="counter"]');

  // const findButtons = async () => {
  //   const { value } = await app.client.elements("[data-tclass=\"btn\"]");
  //   return value.map((btn: any) => btn.ELEMENT);
  // };

  it("should open window", async () => {
    const { client, browserWindow } = app;

    await client.waitUntilWindowLoaded();
    await delay(500);
    const title = await browserWindow.getTitle();
    expect(title).toBe("SayLess");
  });

  it("should open tabs if we make new project", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    expect(await app.client.isExisting(".startScreen")).toBe(true);
    expect(await app.client.isExisting(".choices")).toBe(true);
    //await delay(500);
    expect(await app.client.isExisting(".choices a")).toBe(true);
    console.log("Looking to click");
    await app.client.click(".choices a"); //"#creatNewProjectLink");
    console.log("waiting for dialog");
    //await delay(500);
    expect(await app.client.isExisting(".createProject")).toBe(true);
    console.log("setting new project name");
    expect(await app.client.isExisting("input")).toBe(true);
    app.client.setValue("input", kProjectName);
    await delay(500);
    console.log("clicking ok");
    app.client.click("button");
    await delay(500);
    //await delay(5000);
    // const tabs = await app.client.element("[data-tid='container']");
    // console.log(tabs ? "Found tabs" : "no tabs");
    // const sessionstab = await app.client.element("li.tab-sessions");
    // console.log(sessionstab ? "Found session tabs" : "no session tabs");
    app.client.click(".tab-sessions");
    await delay(500);
    app.client.click(".tab-project");
    await delay(5000);
    //expect(await app.client.isExisting("[data-tid='container']")).toBe(true);
  });

  // it("should not have any errors in logs in console of main window", async () => {
  //   const { client } = app;
  //   const logs = await client.getRenderProcessLogs();
  //   // Print renderer process logs
  //   logs.forEach((log: any) => {
  //     console.log(log.message);
  //     console.log(log.source);
  //     console.log(log.level);
  //     expect(log.message.indexOf("error") > -1).toBeFalsy();
  //   });
  //   //expect(logs).toHaveLength(0);
  // });
});
