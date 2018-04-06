import * as electronPath from "electron";
//import * as webdriverio from "webdriverio";
import { Application } from "spectron";
import * as fs from "fs-extra";
import * as Path from "path";
import SayLessRunner from "./SayLessRunner";

// NOTE: if using JEST vscode extension, it doesn't seem to run in the background
// like with normal unit tests, but when you click "Debug" to run a test, it will
// run two copies of it.
// You can stop the Jest extension from doing this
// with ctrl+shift+p, Jest:stop Runner. There may be a way to
// stop it trying to run things in parrallel, that might help?

const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

describe("main window", function spec() {
  const runner = new SayLessRunner();

  const kProjectName = "e2eproject";
  beforeAll(async () => {
    return runner.start();
  });

  afterAll(() => {
    return runner.stop();
  });

  it("should open window", async () => {
    const title = await runner.browser.getTitle();
    expect(title).toBe("SayLess");
  });

  it("smoketest", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    await runner.shouldExist(".startScreen");
    await runner.click("#creatNewProjectLink");
    await runner.shouldExist(".createProject");

    //setting new project name

    await runner.type("input", runner.kProjectName);
    await runner.click("button", "clicking ok");

    // look around
    await runner.click(".tab-sessions");
    await runner.click(".tab-project");

    // if we restart, it should open up to our project again
    await runner.restart();
    await runner.click(".tab-sessions");

    //expect(await app.client.isExisting("[data-tid='container']")).toBe(true);
  });

  it("sample data", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
    await runner.createdProjectWithSampleData();
    await runner.goToProjectTab();
    await runner.click("li=About This Project");
    await runner.expectFieldContentsByName("Project Title", "Edolo Sample");
    await runner.goToPeopleTab();
    await runner.expectFolderListRowCount(4);
    await delay(1000);
    await runner.clickFolderRowWithText("Awi Heole");
    await runner.expectFileListRowCount(3);
    await runner.clickFolderRowWithText("Igali Sagali (Joseph)");
    await runner.expectFileListRowCount(2);
    await runner.click("button=New Person");
    await runner.expectFileListRowCount(1);
    await runner.click("li=Person");
    await runner.typeField("Full Name", "joe");
    await runner.shouldExist("//div[text()='joe']"); // the folder
    await runner.shouldExist("//div[text()='joe.person']"); // the metadata file
  });
});
