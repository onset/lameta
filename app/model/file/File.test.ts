import { OtherMetdataFile, SessionMetdataFile } from "./File";
import * as fs from "fs";
import * as temp from "temp";

function getPretendAudioFile(): string {
  const path = temp.path({ suffix: ".mp3" }) as string;
  fs.writeFileSync(path, "pretend contents");
  return path;
}

describe("file.save()", () => {
  it("should create a metadata file to go with audio file", () => {
    const mediaFilePath = getPretendAudioFile();
    new OtherMetdataFile(mediaFilePath).save();
    expect(fs.existsSync(mediaFilePath + ".meta"));
  });
});

describe("SessionMetdataFile.save", () => {
  it("should not create a .meta file", () => {
    const path = temp.path({ suffix: ".session" }) as string;
    fs.writeFileSync(path, "<Session/>");
    new SessionMetdataFile(path).save();
    expect(fs.existsSync(path + ".meta")).toBeFalsy();
  });
});

describe("file", () => {
  it("should roundtrip notes with dangerous characters", () => {
    const mediaFilePath = getPretendAudioFile();
    const f = new OtherMetdataFile(mediaFilePath);
    const notes: string = "<you> & me > 1 \"quote\" 'single quote'";
    f.setTextProperty("notes", notes);
    f.save();
    const f2 = new OtherMetdataFile(mediaFilePath);
    expect(f2.getTextField("notes").text).toBe(notes);
  });
});
