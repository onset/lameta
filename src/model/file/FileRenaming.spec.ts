import { OtherFile } from "./File";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { CustomVocabularies } from "../Project/CustomVocabularies";
import {
  setCurrentProjectId,
  setMediaFolderOrEmptyForThisProjectAndMachine
} from "../Project/MediaFolderAccess";

function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

let mp3Path;
let testSessionFolder;
let mp3FileObject: OtherFile;

beforeEach(() => {
  setCurrentProjectId("foobar");
  const tmp = temp.mkdirSync("testSessionFolder");
  testSessionFolder = Path.join(tmp, "foobar");
  fs.mkdirpSync(testSessionFolder);
  mp3Path = Path.join(testSessionFolder, "test.mp3");
  fs.writeFileSync(mp3Path, "pretend contents");
  mp3FileObject = new OtherFile(
    mp3Path,
    new CustomVocabularies(),
    testSessionFolder
  );
});

test("renames correctly", () => {
  mp3FileObject.tryToRenameBothFiles("blah");
  expect(mp3FileObject.getFilenameToShowInList()).toBe("blah.mp3");
  expect(Path.dirname(mp3FileObject.metadataFilePath)).toBe(testSessionFolder);
  expect(Path.basename(mp3FileObject.metadataFilePath)).toBe("blah.mp3.meta");
});

test("renames for consent correctly", () => {
  mp3FileObject.renameForConsent();
  expect(Path.dirname(mp3FileObject.metadataFilePath)).toBe(testSessionFolder);
  expect(mp3FileObject.getFilenameToShowInList()).toBe("foobar_Consent.mp3");
});
