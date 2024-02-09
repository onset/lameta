import { SessionMetadataFile } from "./Session";
import * as temp from "temp";
import Path from "path";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../../../other/xmlUnitTestUtils";
import { Field, FieldType } from "../../field/Field";
import { CustomVocabularies } from "../CustomVocabularies";
import { FieldDefinition } from "../../field/FieldDefinition";
import {
  getMimeType,
  getImdiResourceTypeForExtension
} from "../../file/FileTypeInfo";

let projectDirectory;
let projectName;

describe("Session Write", () => {
  beforeEach(() => {
    projectDirectory = temp.mkdirSync("test");
    projectName = Path.basename(projectDirectory);
  });
  afterEach(() => {
    temp.cleanupSync();
  });
  it("should write simple text field", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomVocabularies()
    );
    f.setTextProperty("location", "Centreville, Brazzaville");
    setResultXml(f.getXml());
    expect("Session/location").toMatch("Centreville, Brazzaville");
  });
  it("should write date of session in YYYY-MM-DD format", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomVocabularies()
    );
    const d = f.properties.getDateField("date");
    d.setValueFromString("2000-10-22");
    setResultXml(f.getXml());
    expect("Session/date").toMatch("2000-10-22");
  });

  it("should write custom text field", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomVocabularies()
    );
    const field = new Field("favoriteColor", FieldType.Text, "orange");
    field.definition = new FieldDefinition({
      key: "favoriteColor",
      englishLabel: "favoriteColor",
      persist: true,
      isCustom: true
    });
    f.properties.setValue("favoriteColor", field);
    setResultXml(f.getXml());
    expect("Session/CustomFields/favoriteColor").toMatch("orange");
  });
  it("should not output an <CustomFields> if there are no children", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomVocabularies()
    );
    setResultXml(f.getXml());
    expect("Session/CustomFields").toHaveCount(0);
  });

  it("should not output an <AdditionalFields> if there are none", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomVocabularies()
    );
    setResultXml(f.getXml());
    expect("Session/AdditionalFields").toHaveCount(0);
  });

  it("should put 'additional fields' under an <AdditionalFields> parent, as SayMore Windows Classic does", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomVocabularies()
    );
    f.setTextProperty("socialContext", "family");
    setResultXml(f.getXml());
    expect("Session/AdditionalFields/Social_Context").toMatch("family");
  });

  it("should give correct mime types", () => {
    expect(getMimeType("mp4")).toBe("video/mp4");
    expect(getMimeType("tiff")).toBe("image/tiff");
    expect(getMimeType("png")).toBe("image/png");
    // and then some custom linguistic ones:
    expect(getMimeType("pfsx")).toBe("text/x-pfsx+xml");
    expect(getMimeType("tbt")).toBe("text/x-toolbox-text");
    // and then some where the mime types aren't custom, but knowing that the suffix leads to this mimetype is something lameta has to know:
    expect(getMimeType("flextext")).toBe("application/xml");
    expect(getMimeType("fwbackup")).toBe("application/zip");
  });
  it("should give correct IMDI types", () => {
    expect(getImdiResourceTypeForExtension("mp4")).toBe("Video");
    expect(getImdiResourceTypeForExtension("tif")).toBe("Image");
    expect(getImdiResourceTypeForExtension("tiff")).toBe("Image");
    expect(getImdiResourceTypeForExtension("flextext")).toBe("FLEx");
  });
});
