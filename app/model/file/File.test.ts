import { OtherFile } from "./File";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { SessionMetadataFile } from "../Project/Session/Session";
import { ProjectMetadataFile } from "../Project/Project";
/*
function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

describe("file.save()", () => {
  it("should create a metadata file to go with audio file", () => {
    const mediaFilePath = getPretendAudioFile();
    new OtherFile(mediaFilePath).save();
    expect(fs.existsSync(mediaFilePath + ".meta"));
  });
});

describe("FolderMetadataFile constructor", () => {
  it("should make the appropriate metadata file if it doesn't exist", () => {
    //temp.track();
    const dir = temp.mkdirSync("blah");
    const f = new FolderMetadataFile(dir, "Session", ".session");
    const files = fs.readdirSync(dir);
    expect(files.length).toBe(1);
    expect(files[0].indexOf(".session")).toBeGreaterThan(0);
    temp.cleanupSync();
  });
});

describe("file", () => {
  it("should roundtrip notes with dangerous characters", () => {
    const mediaFilePath = getPretendAudioFile();
    const f = new OtherFile(mediaFilePath);
    const notes: string = "<you> & me > 1 \"quote\" 'single quote'";
    f.setTextProperty("notes", notes);
    f.save();
    const f2 = new OtherFile(mediaFilePath);
    expect(f2.getTextField("notes").text).toBe(notes);
  });
});
*/
// describe("file", () => {
//   it("should roundtrip custom field", () => {
//     const mediaFilePath = getPretendAudioFile();
//     const f = new OtherFile(mediaFilePath);
//     f.setTextProperty("customone", "hello");
//     f.save();
//     const f2 = new OtherFile(mediaFilePath);
//     expect(f2.getTextField("customone").text).toBe("hello");
//   });
// });

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

    const f = new SessionMetadataFile(newDir);
    f.save();
    const newXml: string = fs.readFileSync(newPath, "utf8");
    // console.log("-----------------------------");
    // console.log(newXml);

    expect(newXml).toBe(originalXml);
  });
  test.only("can roundtrip sample project file", () => {
    const originalPath = "./sample data/Edolo sample/Edolo sample.sprj";
    const originalXml: string = fs.readFileSync(originalPath, "utf8");
    const newDir = Path.join(temp.dir, "Edolo sample");
    if (fs.existsSync(newDir)) {
      fs.removeSync(newDir);
    }
    fs.mkdirSync(newDir);
    const newPath = Path.join(newDir, "Edolo sample.sprj");
    fs.writeFileSync(newPath, originalXml, "utf8");

    const f = new ProjectMetadataFile(newDir);
    f.save();
    const newXml: string = fs.readFileSync(newPath, "utf8");
    // console.log("-----------------------------");
    // console.log(newXml);
    expect(newXml).toBe(originalXml);
  });
});
