import {
  vi,
  describe,
  it,
  beforeAll,
  beforeEach,
  expect,
  afterAll
} from "vitest";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import ImdiBundler from "./ImdiBundler";
import { IMDIMode } from "./ImdiGenerator";
import fs from "fs";
import * as Path from "path";
vi.mock("@electron/remote", () => ({ exec: vi.fn() })); //See commit msg for info

let project: Project;
let session: Session;
const projectDir = temp.mkdirSync("lameta imdi bundler test");
const projectName = Path.basename(projectDir);
const targetDir = temp.mkdirSync("lameta imdi bundler test output");
beforeAll(() => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  project.descriptionFolder.addFileForTest("test.txt");
  project.otherDocsFolder.addFileForTest("test.txt");
  session = project.addSession();
  ImdiBundler.saveImdiBundleToFolder(
    project,
    targetDir,
    IMDIMode.OPEX,
    false,
    (f) => true
  );
});
afterAll(() => {
  temp.cleanupSync();
});

describe("opex file placement", () => {
  it("should have a project opex inside of the project folder", () => {
    const p = Path.join(targetDir, projectName, projectName + ".opex"); //?
    expect(fs.existsSync(p)).toBe(true);
  });
  /* this would just be too expensive to set up at this point
  
  it("should have a consent opex inside of the Consent folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "ConsentDocuments",
      "ConsentDocuments.opex"
    ); //?
    expect(fs.existsSync(p)).toBe(true);
  });
  */
  it("should have a DescriptionDocuments opex inside of the Description folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "DescriptionDocuments",
      "DescriptionDocuments.opex"
    );
    expect(fs.existsSync(p)).toBe(true);
  });
  it("should have a OtherDocuments opex inside of the OtherDocuments folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "OtherDocuments",
      "OtherDocuments.opex"
    );
    expect(fs.existsSync(p)).toBe(true);
  });
  it("should have a session opex inside of the session folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "New Session",
      "New_Session.opex"
    );
    expect(fs.existsSync(p)).toBe(true);
  });
});
