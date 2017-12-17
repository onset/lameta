import { File } from "./File";
import * as fs from "fs";
//import * as temp from "temp";
import * as temp from "temp";

function writeFile(contents: string): string {
  const path = temp.path({ suffix: ".xml" }) as string;
  //if(fs.existsSync(path)){ }
  fs.writeFileSync(path, contents);
  return path;
}

describe("file", () => {
  it("should roundtrip notes", () => {
    const mediaFilePath = writeFile("<Blah></Blah>");
    const f = new File(mediaFilePath);
    f.setTextProperty("notes", "foo");
    f.save();
    const f2 = new File(mediaFilePath);
    expect(f2.getTextField("notes").text).toBe("foo");
  });
});
