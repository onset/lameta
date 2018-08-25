import { SessionMetadataFile } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import {
  setResultXml,
  xexpect as expect,
  count,
  value,
  xexpect
} from "../../../export/xmlUnitTestUtils";
const os = require("os");

let projectDirectory;
let projectName;

describe("Session Write", () => {
  beforeEach(async () => {
    projectDirectory = temp.mkdirSync("test");
    projectName = Path.basename(projectDirectory);
  });
  afterEach(async () => {
    temp.cleanupSync();
  });
  it("should write simple text field", () => {
    const f = new SessionMetadataFile(projectDirectory);
    f.setTextProperty("location", "Centreville, Brazzaville");
    setResultXml(f.getXml());
    expect("Session/location").toMatch("Centreville, Brazzaville");
  });
  it("should put 'additional fields' under an <AdditionalFields> parent, as SayMore Windows Classic does", () => {
    const f = new SessionMetadataFile(projectDirectory);
    f.setTextProperty("socialContext", "family");
    setResultXml(f.getXml());
    expect("Session/AdditionalFields/Social_Context").toMatch("family");
    // const expected = `<AdditionalFields>${
    //   os.EOL
    // }  <Social_Context type="string">family</Social_Context>${
    //   os.EOL
    // }</AdditionalFields>`;
    // if (output.indexOf(expected) < 0) {
    //   throw new Error(
    //     `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
    //   );
    // }
  });
  /* it("should put 'additional fields' under an <AdditionalFields> parent, as SayMore Windows Classic does", () => {
    const f = GetProjectFileWithOneField(
      "VernacularISO3CodeAndName",
      "foo: Foo"
    );
    f.properties.setText("vernacularIso3CodeAndName", "bar: Bar");
    f.save(true);
    expect(
      fs.readFileSync(f.metadataFilePath).indexOf("VernacularISO3CodeAndName")
    ).toBeGreaterThan(-1);

    //console.log("abc:" + fs.readFileSync(f.metadataFilePath));

    expect(
      fs
        .readFileSync(f.metadataFilePath)
        .indexOf(
          "<VernacularISO3CodeAndName>bar: Bar</VernacularISO3CodeAndName>"
        )
    ).toBeGreaterThan(-1);
  });*/
});

// function AttemptRoundTripOfOneField(
//   key: string,
//   xmlTag: string,
//   content: string
// ) {
//   const f = GetSessionFileWithOneField(xmlTag, content);
//   f.save(true);
//   let output = fs.readFileSync(f.metadataFilePath);
//   let expected = `<${xmlTag}>${content}</${xmlTag}>`;
//   if (output.indexOf(expected) < 0) {
//     throw new Error(
//       `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
//     );
//   }

//   // now, can we change it and see it saved?
//   let newValue = "something different";
//   if (f.properties.getFieldDefinition(key).type === "date") {
//     f.setTextProperty(key, newValue);
//   } else {
//     newValue = "1911-1-11";
//     f.properties.getDateField(key).setValueFromString(newValue);
//   }
//   f.save(true);
//   output = fs.readFileSync(f.metadataFilePath);
//   expected = `<${xmlTag}>${newValue}</${xmlTag}>`;
//   if (output.indexOf(expected) < 0) {
//     throw new Error(
//       `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
//     );
//   }
// }

// function GetSessionFileWithOneField(
//   tag: string,
//   content: string
// ): ProjectMetadataFile {
//   fs.writeFileSync(
//     Path.join(projectDirectory, projectName + ".sprj"),
//     `<?xml version="1.0" encoding="utf-8"?>
//   <Project><${tag}>${content}</${tag}></Project>`
//   );
//   return new ProjectMetadataFile(projectDirectory);
// }
