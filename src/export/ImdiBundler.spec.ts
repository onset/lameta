import { describe, it, beforeAll, expect, afterAll } from "vitest";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import ImdiBundler from "./ImdiBundler";
import { IMDIMode } from "./ImdiGenerator";
import fs from "fs";
import * as Path from "path";

let project: Project;
const projectDir = temp.mkdirSync("lameta imdi bundler test");
const projectName = Path.basename(projectDir);
const targetDir = temp.mkdirSync("lameta imdi bundler test output");
beforeAll(async () => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  await project.descriptionFolder.addFileForTestAsync("test.txt");
  await project.otherDocsFolder.addFileForTestAsync("test.txt");
  project.addSession();
  try {
    await ImdiBundler.saveImdiBundleToFolder(
      project,
      targetDir,
      IMDIMode.OPEX,
      true,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (f) => true
    );
  } catch (e) {
    expect(e).toBeUndefined();
  }
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

  it("should have a ConsentDocuments folder", () => {
    // console.log("targetDir: " + targetDir);
    // // list all the files and directories in targetDir directory to the console
    // fs.readdirSync(targetDir).forEach((file) => {
    //   console.log(" /" + file);
    // });
    // console.log("target/project ");
    // // list all the files and directories in targetDir directory to the console
    // fs.readdirSync(Path.join(targetDir, projectName)).forEach((file) => {
    //   console.log(" /" + file);
    // });

    const p = Path.join(targetDir, projectName, "ConsentDocuments");
    expect(fs.existsSync(p)).toBe(true);
  });
  it("should have an imdi file in the ConsentDocuments folder", () => {
    const p = Path.join(
      targetDir,
      projectName,
      "ConsentDocuments",
      "ConsentDocuments.opex"
    );
    expect(fs.existsSync(p)).toBe(true);
  });
});
