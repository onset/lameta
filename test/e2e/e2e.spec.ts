import SayLessRunner from "./SaylessRunner";

// NOTE: if using JEST vscode extension, it doesn't seem to run in the background
// like with normal unit tests, but when you click "Debug" to run a test, it will
// run two copies of it.
// You can stop the Jest extension from doing this
// with ctrl+shift+p, Jest:stop Runner. There may be a way to
// stop it trying to run things in parrallel, that might help?

/// MUST call with await, e.g. await delay(3000);
const delay = (time: number) =>
  new Promise(resolve => setTimeout(resolve, time));

describe("main window", function spec() {
  const runner = new SayLessRunner();

  const kProjectName = "e2eproject";
  beforeAll(async () => {
    return runner.start();
  });
  beforeEach(async () => {
    runner.RemoveTestArtifacts();
  });
  afterAll(() => {
    return runner.stop();
  });

  it("should open window", async () => {
    const title = await runner.browser.getTitle();
    expect(title).toBe("SayMore Mac");
  });

  it("should start in start screen", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000;
    await runner.shouldExist(".startScreen");
  });

  it("can click menus", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000;
    await runner.clickMenu("Test", "Menu Test");
    await runner.expectWindowTitle("Menu Test Invoked");
  });

  it("smoketest", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000;
    await runner.goToStartScreen();

    await runner.clickMenu("Test", "Menu Test");

    await runner.shouldExist(".startScreen");
    await runner.click("#creatNewProjectLink");
    await runner.shouldExist(".createProject");

    //setting new project name

    await runner.type("input", runner.kProjectName);
    await runner.click("#okButton", "clicking ok");
    // look around
    await runner.click(".tab-sessions");
    await runner.click(".tab-project");

    // if we restart, it should open up to our project again
    await runner.restart(false);
    await runner.click(".tab-sessions");
    await runner.goToStartScreen();
    await runner.shouldExist(".startScreen");
  });

  it("sample data", async () => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10 * 1000;

    //await runner.restart(true);
    await runner.goToStartScreen();
    await runner.createdProjectWithSampleData();

    await runner.goToProjectTab();

    await runner.click("li=About This Project");
    await runner.expectFieldContentsByName("Project Title", "Edolo Sample");
    await runner.goToPeopleTab();
    await runner.expectFolderListRowCount(4);

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
