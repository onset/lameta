import { ProjectMetadataFile } from "./Project";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { EncounteredVocabularyRegistry } from "./EncounteredVocabularyRegistry";
import { describe, expect, it, beforeEach, afterEach } from "vite-plus/test";
import {
  setResultXml,
  xexpect,
  count,
  value
} from "../../other/xmlUnitTestUtils";
let projectDirectory;
let projectName;

describe("Project Write", () => {
  beforeEach(async () => {
    projectDirectory = temp.mkdirSync("test");
    projectName = Path.basename(projectDirectory);
  });
  afterEach(async () => {
    temp.cleanupSync();
  });

  it("should round-trip SubjectLanguages", () => {
    AttemptRoundTripOfOneField(
      "SubjectLanguages",
      "SubjectLanguages",
      "foo: Foo"
    );
    AttemptRoundTripOfOneField(
      "SubjectLanguages",
      "SubjectLanguages",
      "foo: Foo;bar: Bar"
    );
  });
  it("should round-trip WorkingLanguages", () => {
    AttemptRoundTripOfOneField(
      "WorkingLanguages",
      "WorkingLanguages",
      "foo: Foo"
    );
    AttemptRoundTripOfOneField(
      "WorkingLanguages",
      "WorkingLanguages",
      "foo: Foo;bar: Bar"
    );
  });
  it("should round-trip ArchiveConfigurationName", () => {
    AttemptRoundTripOfOneField(
      "archiveConfigurationName",
      "ArchiveConfigurationName",
      "FooBar"
    );
  });
  it("should write deprecated VernacularISO3CodeAndName with first language in SubjectLanguages", () => {
    const f = GetProjectFileWithOneField(
      "SubjectLanguages",
      "foo: Foo; bar: Bar"
    );
    setResultXml(f.getXml(true));
    // saving old field here for versions before lameta 3
    xexpect("Project/VernacularISO3CodeAndName").toMatch("foo: Foo");
    xexpect("Project/SubjectLanguages").toMatch("foo: Foo; bar: Bar");
    xexpect("Project/CollectionSubjectLanguages").toMatch("foo: Foo; bar: Bar");
  });

  it("should write languages", () => {
    const f = GetProjectFileWithOneField("unused", "x");
    f.properties.setText("SubjectLanguages", "ab;cd;ef");
    f.properties.setText("WorkingLanguages", "gh;ij");
    setResultXml(f.getXml());
    xexpect("Project/SubjectLanguages").toHaveCount(1);
    xexpect("Project/SubjectLanguages[text()='ab;cd;ef']").toHaveCount(1);
    xexpect("Project/WorkingLanguages").toHaveCount(1);
    xexpect("Project/WorkingLanguages[text()='gh;ij']").toHaveCount(
      1
    );
    xexpect("Project/CollectionSubjectLanguages").toHaveCount(1);
    xexpect("Project/CollectionWorkingLanguages").toHaveCount(1);
    // and these we output for backwards compatibility
    xexpect("Project/VernacularISO3CodeAndName").toHaveCount(1);
    xexpect("Project/VernacularISO3CodeAndName[text()='ab']").toHaveCount(1);
    xexpect("Project/AnalysisISO3CodeAndName").toHaveCount(1);
    xexpect("Project/AnalysisISO3CodeAndName[text()='gh']").toHaveCount(1);
  });

  it("should not write legacy CollectionKey fields", () => {
    const f = GetProjectFileWithOneField("CollectionKey", "obsolete-id");

    setResultXml(f.getXml(true));

    expect(count("Project/CollectionKey")).toBe(0);
    expect(count("Project/*[text()='obsolete-id']")).toBe(0);
  });
});

function AttemptRoundTripOfOneField(
  key: string,
  xmlTag: string,
  content: string
) {
  const f = GetProjectFileWithOneField(xmlTag, content);
  f.save(true);
  let output = fs.readFileSync(f.metadataFilePath);
  let expected = `<${xmlTag}>${content}</${xmlTag}>`;
  if (output.indexOf(expected) < 0) {
    throw new Error(
      `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
    );
  }

  // now, can we change it and see it saved?
  const newValue = "something different";

  f.setTextProperty(key, newValue);

  f.save(true);
  output = fs.readFileSync(f.metadataFilePath);
  expected = `<${xmlTag}>${newValue}</${xmlTag}>`;
  if (output.indexOf(expected) < 0) {
    throw new Error(
      `Expected output to contain \r\n${expected}\r\n but got \r\n${output}`
    );
  }
}

export function GetProjectFileWithOneField(
  tag: string,
  content: string
): ProjectMetadataFile {
  fs.writeFileSync(
    Path.join(projectDirectory, projectName + ".sprj"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Project><${tag}>${content}</${tag}></Project>`
  );
  return new ProjectMetadataFile(
    projectDirectory,
    new EncounteredVocabularyRegistry()
  );
}
