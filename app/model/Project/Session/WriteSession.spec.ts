import { SessionMetadataFile } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../../../export/xmlUnitTestUtils";
import { Field, FieldType, FieldDefinition } from "../../field/Field";
import { CustomFieldRegistry } from "../CustomFieldRegistry";
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
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
    f.setTextProperty("location", "Centreville, Brazzaville");
    setResultXml(f.getXml());
    expect("Session/location").toMatch("Centreville, Brazzaville");
  });
  it("should write date of session in YYYY-MM-DD format", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
    const d = f.properties.getDateField("date");
    d.setValueFromString("2000-10-22");
    setResultXml(f.getXml());
    expect("Session/date").toMatch("2000-10-22");
  });

  it("should write custom text field", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
    const field = new Field("favoriteColor", FieldType.Text, "orange");
    field.definition = new FieldDefinition({});
    field.definition.isCustom = true;
    f.properties.setValue("favoriteColor", field);
    setResultXml(f.getXml());
    expect("Session/CustomFields/favoriteColor").toMatch("orange");
  });
  it("should not output an <CustomFields> if there are no children", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
    setResultXml(f.getXml());
    expect("Session/CustomFields").toHaveCount(0);
  });

  it("should not output an <AdditionalFields> if there are none", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
    setResultXml(f.getXml());
    expect("Session/AdditionalFields").toHaveCount(0);
  });

  it("should put 'additional fields' under an <AdditionalFields> parent, as SayMore Windows Classic does", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
    f.setTextProperty("socialContext", "family");
    setResultXml(f.getXml());
    expect("Session/AdditionalFields/Social_Context").toMatch("family");
  });
});
