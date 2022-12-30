import { OtherFile } from "./File";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { SessionMetadataFile } from "../Project/Session/Session";
import { ProjectMetadataFile } from "../Project/Project";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../../other/xmlUnitTestUtils";
jest.mock("@electron/remote", () => ({ exec: jest.fn() })); //See commit msg for info

function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

function writeSessionFile(contents: string): {
  tmpFolder;
  sessionFolder;
  filePath;
} {
  const tmpFolder = temp.mkdirSync();
  const sessionFolder = Path.join(tmpFolder, "test");
  fs.mkdirSync(sessionFolder);
  const filePath = Path.join(sessionFolder, "test.session");
  fs.writeFileSync(
    filePath,
    `
  <?xml version="1.0" encoding="utf-8"?>
  <Session>
    ${contents}
  </Session>`
  );
  return { tmpFolder, sessionFolder, filePath };
}

function runTestsOnMetadataFile(contents: string, tests: () => any) {
  let sessionFolder;
  let filePath;
  let tmpFolder;
  ({ tmpFolder, sessionFolder, filePath } = writeSessionFile(contents));

  // note, we are using a session to run these just because we need something
  // concrete. It would be an improvement to do it in some more generic way.
  const f = new SessionMetadataFile(sessionFolder, new CustomFieldRegistry());
  fs.removeSync(filePath); // remove the old file, just to make sure
  f.save(/*forceSave*/ true);
  try {
    setResultXml(fs.readFileSync(filePath, "utf8"));
    tests();
  } finally {
    try {
      fs.removeSync(tmpFolder);
    } catch (e) {
      console.error("could not remove test folder " + tmpFolder);
    }
  }
}

describe("file.save()", () => {
  it("should create a metadata file to go with audio file", () => {
    const mediaFilePath = getPretendAudioFile();
    new OtherFile(mediaFilePath, new CustomFieldRegistry()).save();
    expect(fs.existsSync(mediaFilePath + ".meta"));
  });
});

describe("FolderMetadataFile constructor", () => {
  it("should make the appropriate metadata file if it doesn't exist", () => {
    //temp.track();
    const dir = temp.mkdirSync("blah");
    const f = new SessionMetadataFile(dir, new CustomFieldRegistry());
    const files = fs.readdirSync(dir);
    expect(files.length).toBe(1);
    expect(files[0].indexOf(".session")).toBeGreaterThan(0);
    temp.cleanupSync();
  });
});

describe("file", () => {
  it("should roundtrip notes with dangerous characters", () => {
    const mediaFilePath = getPretendAudioFile();
    const f = new OtherFile(mediaFilePath, new CustomFieldRegistry());
    const notes: string = "<you> & me > 1 \"quote\" 'single quote'";
    f.setTextProperty("notes", notes);
    f.save();
    const f2 = new OtherFile(mediaFilePath, new CustomFieldRegistry());
    expect(f2.getTextField("notes").text).toBe(notes);
  });
});

describe("file", () => {
  it("should roundtrip custom field", () => {
    const mediaFilePath = getPretendAudioFile();
    const f = new OtherFile(mediaFilePath, new CustomFieldRegistry());
    f.setTextProperty("customone", "hello");
    f.save();
    const f2 = new OtherFile(mediaFilePath, new CustomFieldRegistry());
    expect(f2.getTextField("customone").text).toBe("hello");
  });

  // e.g., SayMore Windows Classic has more fields that we do; we need
  // to preserve those so that people don't lose their work
  // just because they tried out this version of SayMore
  it("should roundtrip xml elements it doesn't understand", () => {
    runTestsOnMetadataFile(
      `
    <stage_transcriptionN type="string">Complete</stage_transcriptionN>
    <something_With_craZy_casING>foobar</something_With_craZy_casING>
    <title type="string">war &amp; peace</title>`,
      () => {
        // this is a field we don't have but SayMore Windows Classic does
        expect("Session/stage_transcriptionN").toMatch("Complete");
        // did we roundtrip the type attribute?
        expect("Session/stage_transcriptionN[@type='string']").toHaveCount(1);

        expect("Session/something_With_craZy_casING").toHaveCount(1);

        /***** Things we can't roundtrip yet. (SayMore Windows 3.x doesn't need any of this as far as I know)
         *  If @type isn't "date" or "string"
         *  If there are other attributes
         *  If there is nested xml
         */
      }
    );
  });
});

describe("FolderMetadataFile", () => {
  it("can roundtrip sample session file", () => {
    const originalPath =
      "./sample data/Edolo sample/Sessions/ETR009/ETR009.session";
    const originalXml: string = fs.readFileSync(originalPath, "utf8");
    const newDir = Path.join(temp.dir, "ETR009");
    if (fs.existsSync(newDir)) {
      fs.removeSync(newDir);
    }
    fs.mkdirSync(newDir);
    const newPath = Path.join(newDir, "ETR009.session");
    fs.writeFileSync(newPath, originalXml, "utf8");

    const f = new SessionMetadataFile(newDir, new CustomFieldRegistry());
    f.save();
    const newXml: string = fs.readFileSync(newPath, "utf8");
    // console.log("-----------------------------");
    // console.log(newXml);

    expect(newXml).toBe(originalXml);
  });
  it("can roundtrip sample project file", () => {
    const originalPath = "./sample data/Edolo sample/Edolo sample.sprj";
    const originalXml: string = fs.readFileSync(originalPath, "utf8");
    const newDir = Path.join(temp.dir, "Edolo sample");
    if (fs.existsSync(newDir)) {
      fs.removeSync(newDir);
    }
    fs.mkdirSync(newDir);
    const newPath = Path.join(newDir, "Edolo sample.sprj");
    fs.writeFileSync(newPath, originalXml, "utf8");

    const f = new ProjectMetadataFile(newDir, new CustomFieldRegistry());
    f.save();
    const newXml: string = fs.readFileSync(newPath, "utf8");
    // console.log("-----------------------------");
    // console.log(newXml);
    expect(newXml).toBe(originalXml);
  });
});
