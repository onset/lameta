import { OtherFile } from "./File";
import { getStatusOfFile } from "./FileStatus";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { VocabularyRegistry } from "../Project/VocabularyRegistry";
import {
  setCurrentProjectId,
  setMediaFolderOrEmptyForThisProjectAndMachine
} from "../Project/MediaFolderAccess";
import { i18nUnitTestPrep } from "../../other/localization";
i18nUnitTestPrep();

function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

let externalMediaDirectory;
let mp3PathInMediaDirectory;
let mp3InChildDirectory;
let testSessionFolder;

beforeAll(() => {
  setCurrentProjectId("foobar");
  const tmp = temp.mkdirSync("testSessionFolder");
  testSessionFolder = Path.join(tmp, "foobar");
  fs.mkdirpSync(testSessionFolder);
  // this is our simulated place where media lives and is linked in. E.g. an external drive full of videos.
  externalMediaDirectory = temp.mkdirSync("testMediaDirectory");

  // during a test, this will create a fake store of settings
  setMediaFolderOrEmptyForThisProjectAndMachine(externalMediaDirectory);
  externalMediaDirectory;
  mp3PathInMediaDirectory = Path.join(externalMediaDirectory, "test.mp3");
  fs.writeFileSync(mp3PathInMediaDirectory, "pretend contents");

  const child = Path.join(externalMediaDirectory, "child");
  fs.mkdirpSync(child);
  mp3InChildDirectory = Path.join(child, "minor.mp3");
  fs.writeFileSync(mp3InChildDirectory, "pretend contents");
});

describe("Linked file", () => {
  it("getNameWithoutLinkExtension", () => {
    const f = getOtherFileForMinorMp3();
    expect(OtherFile.getNameWithoutLinkExtension("minor.mp3.link")).toBe(
      "minor.mp3"
    );
  });

  it("renames correctly", () => {
    const f = getOtherFileForMinorMp3();
    f.tryToRenameBothFiles("blah");
    expect(f.isLinkFile()).toBe(true); // shouldn't change that
    expect(Path.basename(f.metadataFilePath)).toBe("blah.mp3.meta");
    expect(Path.basename(f.pathInFolderToLinkFileOrLocalCopy)).toBe(
      "blah.mp3.link"
    );

    expect(f.getFilenameToShowInList()).toBe("blah.mp3");
  });

  it("renames for consent correctly", () => {
    const f = getOtherFileForMinorMp3();
    f.renameForConsent();
    expect(f.getFilenameToShowInList()).toBe("foobar_Consent.mp3");
  });

  it("looks right when file is in root", () => {
    const f = OtherFile.CreateLinkFile(
      mp3PathInMediaDirectory,
      new VocabularyRegistry(),
      testSessionFolder
    );
    expect(Path.dirname(f.pathInFolderToLinkFileOrLocalCopy)).toBe(
      testSessionFolder
    );
    expect(fs.readFileSync(f.pathInFolderToLinkFileOrLocalCopy, "utf8")).toBe(
      "test.mp3"
    );

    commonTests(f, "test.mp3");
  });

  it("looks right when file is in minor directory", () => {
    setMediaFolderOrEmptyForThisProjectAndMachine(externalMediaDirectory);
    const f = getOtherFileForMinorMp3();
    expect(
      fs
        .readFileSync(f.pathInFolderToLinkFileOrLocalCopy, "utf8")
        // on windows, this is "child\\minor.mp3". On mac, it is "child/minor.mp3"
        .replace("\\", "/")
    )
      // so we normalized it
      .toBe("child/minor.mp3");
    expect(f.getActualFilePath()).toBe(mp3InChildDirectory);
    commonTests(f, "minor.mp3");

    fs.removeSync(mp3InChildDirectory);
    expect(f.getActualFileExists()).toBe(false);
    expect(getStatusOfFile(f).missing).toBe(true);
  });
});

function getOtherFileForMinorMp3() {
  return OtherFile.CreateLinkFile(
    mp3InChildDirectory,
    new VocabularyRegistry(),
    testSessionFolder
  );
}

function commonTests(f: OtherFile, fileName: string) {
  // "foo.mp3.meta", not "foo.mp3.link.meta"
  expect(Path.basename(f.metadataFilePath)).toBe(fileName + ".meta");

  expect(f.getFilenameToShowInList()).toBe(fileName);

  expect(Path.dirname(f.pathInFolderToLinkFileOrLocalCopy)).toBe(
    testSessionFolder
  );
  expect(f.isLinkFile()).toBe(true);

  expect(f.getActualFileExists()).toBe(true);
  expect(getStatusOfFile(f).missing).toBe(false);

  expect(f.getNameToUseWhenExportingUsingTheActualFile()).toBe(fileName);

  //note, even if the source was in a minordirectory (e.g. "child/"), on export the file will be a the top level
  expect(f.getRelativePathForExportingTheActualFile()).toBe(
    "foobar/" + fileName
  );
}
