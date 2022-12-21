import fs from "fs";
import Path from "path";
import { SessionMetadataFile, Session } from "../Project/Session/Session";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import { duplicateFolder } from "./DuplicateFolder";
import { Project } from "../Project/Project";
import temp from "temp";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

temp.track();
describe("Duplicate Folder", () => {
  let rootDirectory;
  beforeEach(async () => {
    rootDirectory = temp.mkdirSync("testDuplicateFolder");
  });
  afterEach(async () => {
    //temp.cleanupSync(); sometimes cause test to fail
  });

  it("should make the new folder with all the right names", () => {
    const dir = Path.join(rootDirectory, "foox");
    fs.mkdirSync(dir);
    const mediaPath = Path.join(dir, "someMedia.txt");
    fs.writeFileSync(mediaPath, "hello");
    const original = Session.fromDirectory(dir, new CustomFieldRegistry());
    original.properties.setText("id", "foox");
    original.saveFolderMetaData();
    expect(original.metadataFile.metadataFilePath).toBeTruthy();
    expect(fs.existsSync(original.metadataFile.metadataFilePath)).toBeTruthy();
    const { success, metadataFilePath, directory } = duplicateFolder(original);
    expect(success).toBeTruthy();
    expect(Path.basename(metadataFilePath)).toBe("foox - Copy 1.session");
    expect(Path.extname(metadataFilePath)).toBe(".session");
    expect(fs.existsSync(mediaPath)).toBeTruthy();

    // now duplicate that first file again

    const result2 = duplicateFolder(original);
    expect(result2.success).toBeTruthy();
    expect(Path.basename(result2.metadataFilePath)).toBe(
      "foox - Copy 2.session"
    );
  });
});

/* 

    // const f = new SessionMetadataFile(
    //   rootDirectory,
    //   new CustomFieldRegistry()
    // );

    */
