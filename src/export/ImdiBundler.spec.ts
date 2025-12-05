import { describe, it, beforeAll, expect, afterAll } from "vitest";
import * as temp from "temp";
import { Project } from "../model/Project/Project";
import ImdiBundler from "./ImdiBundler";
import { IMDIMode } from "./ImdiGenerator";
import fs from "fs";
import * as Path from "path";
import { ExportSessionData } from "./ExportBundleTypes";

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
      "New_Session",
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

describe("generateExportData async generator", () => {
  let generatorProject: Project;
  let generatorProjectDir: string;
  let generatorTargetDir: string;

  beforeAll(async () => {
    generatorProjectDir = temp.mkdirSync("lameta generator test");
    generatorTargetDir = temp.mkdirSync("lameta generator test output");
    generatorProject = Project.fromDirectory(generatorProjectDir);
    await generatorProject.descriptionFolder.addFileForTestAsync("desc.txt");
    await generatorProject.otherDocsFolder.addFileForTestAsync("other.txt");
    generatorProject.addSession();
    generatorProject.addSession();
  });

  it("should yield ExportSessionData for each folder", async () => {
    const generator = ImdiBundler.generateExportData(
      generatorProject,
      generatorTargetDir,
      IMDIMode.OPEX,
      true,
      () => true
    );

    const yieldedData: ExportSessionData[] = [];
    let result = await generator.next();
    while (!result.done) {
      yieldedData.push(result.value as ExportSessionData);
      result = await generator.next();
    }

    // Should yield: OtherDocuments, DescriptionDocuments, ConsentDocuments (may be empty), 2 sessions
    // At minimum we should get OtherDocuments and DescriptionDocuments
    expect(yieldedData.length).toBeGreaterThanOrEqual(2);

    // Check that each yielded data has required fields
    for (const data of yieldedData) {
      expect(data.displayName).toBeDefined();
      expect(data.imdiXml).toBeDefined();
      expect(data.imdiPath).toBeDefined();
      expect(data.directoriesToCreate).toBeInstanceOf(Array);
      expect(data.filesToCopy).toBeInstanceOf(Array);
    }

    // The final return value should be the corpus data
    expect(result.done).toBe(true);
    expect(result.value).toBeDefined();
    expect(result.value.imdiXml).toBeDefined();
    expect(result.value.imdiPath).toContain(".opex");
    expect(result.value.displayName).toBe(generatorProject.displayName);
  });

  it("should include file copy requests when copyInProjectFiles is true", async () => {
    const generator = ImdiBundler.generateExportData(
      generatorProject,
      generatorTargetDir,
      IMDIMode.OPEX,
      true,
      () => true
    );

    let hasFilesToCopy = false;
    let result = await generator.next();
    while (!result.done) {
      const data = result.value as ExportSessionData;
      if (data.filesToCopy.length > 0) {
        hasFilesToCopy = true;
        // Check file copy request structure
        for (const copyReq of data.filesToCopy) {
          expect(copyReq.source).toBeDefined();
          expect(copyReq.destination).toBeDefined();
        }
      }
      result = await generator.next();
    }

    expect(hasFilesToCopy).toBe(true);
  });

  it("should not include file copy requests when copyInProjectFiles is false", async () => {
    const generator = ImdiBundler.generateExportData(
      generatorProject,
      generatorTargetDir,
      IMDIMode.OPEX,
      false, // copyInProjectFiles = false
      () => true
    );

    let result = await generator.next();
    while (!result.done) {
      const data = result.value as ExportSessionData;
      expect(data.filesToCopy.length).toBe(0);
      result = await generator.next();
    }
  });

  it("should provide correct job info", () => {
    const jobInfo = ImdiBundler.getExportJobInfo(
      generatorProject,
      generatorTargetDir,
      () => true
    );

    expect(jobInfo.totalSessions).toBeGreaterThanOrEqual(2); // at least 2 sessions
    expect(jobInfo.rootDirectory).toBe(generatorTargetDir);
    expect(jobInfo.secondLevelDirectory).toBe(Path.basename(generatorProjectDir));
  });
});
