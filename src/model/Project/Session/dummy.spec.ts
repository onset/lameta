import { describe, it, beforeAll, beforeEach } from "vitest";
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
import { CustomFieldRegistry } from "../CustomFieldRegistry";
import { FieldDefinition } from "../../field/FieldDefinition";
import {
  getMimeType,
  getImdiResourceTypeForExtension
} from "../../file/FileTypeInfo";

let projectDirectory;
let projectName;

describe("foo", () => {
  it("foo", () => {
    const f = new SessionMetadataFile(
      projectDirectory,
      new CustomFieldRegistry()
    );
  });
});
