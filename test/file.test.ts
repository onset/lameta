import { File } from "../app/model/File";
import * as fs from "fs";

function makeFile(contents: string): File {
  //fs.mkdirSync("c:/temp/saylessunittests");
  const path = "c:/temp/saylessunittests/blah.xml";
  //if(fs.existsSync(path)){ }
  fs.writeFileSync(path, contents);
  return new File(path);
}
describe("file", () => {
  it("should roundtrip notes", () => {
    const f = makeFile("<Blah></Blah>");
    f.setTextProperty("notes", "foo");
    f.save();
    const f2 = new File(f.path);
    expect(f2.getTextField("notes").text).toBe("foo");
  });
});
