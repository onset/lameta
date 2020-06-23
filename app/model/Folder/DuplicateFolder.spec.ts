import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { SessionMetadataFile, Session } from "../Project/Session/Session";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import { duplicateFolder } from "./DuplicateFolder";
import { Project } from "../Project/Project";

let rootDirectory;
let projectName;

describe("Duplicate Folder", () => {
  beforeEach(async () => {
    rootDirectory = temp.mkdirSync("testDuplicateFolder");
  });
  afterEach(async () => {
    temp.cleanupSync();
  });

  it("should make the new folder", () => {
    const dir = Path.join(rootDirectory, "foox");
    fs.mkdirSync(dir);
    const original = Session.fromDirectory(dir, new CustomFieldRegistry());
    original.properties.setText("id", "foox");
    original.saveFolderMetaData();
    expect(original.metadataFile.metadataFilePath).toBeTruthy();
    expect(fs.existsSync(original.metadataFile.metadataFilePath)).toBeTruthy();
    const { success, metadataFilePath, directory } = duplicateFolder(original);
    expect(success).toBeTruthy();
    expect(Path.extname(metadataFilePath)).toBe(".session");
  });
});

/* 

    // const f = new SessionMetadataFile(
    //   rootDirectory,
    //   new CustomFieldRegistry()
    // );

    */
