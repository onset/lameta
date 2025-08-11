import { describe, it, beforeAll, afterAll } from "vitest";

import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count
} from "../other/xmlUnitTestUtils";
import ImdiBundler from "./ImdiBundler";
import * as fs from "fs-extra";
import * as os from "os";
import * as Path from "path";
import { IMDIMode } from "./ImdiGenerator";
import { Contribution } from "../model/file/File";

// find the the temp directory of this computer

describe("Consent in OPEX+Files export", () => {
  let thisRunDir: string;
  let targetDir: string;
  beforeAll(async () => {
    const thisSpecDir = Path.join(os.tmpdir(), "consent opex bundler tests");
    [thisRunDir, targetDir] = await doExport(IMDIMode.OPEX, thisSpecDir, true);
    const xml = fs.readFileSync(
      Path.join(targetDir, "ConsentDocuments", "ConsentDocuments.opex"),
      "utf8"
    );
    expect(xml).toBeTruthy();
    setResultXml(xml);
  });
  it("The name should be ConsentDocuments", () => {
    // per ELAR, notion #241
    expect("//Session/Name").toMatch("ConsentDocuments");
  });

  it("should have the correct genre", () => {
    /* previous:
      expect("//Session/MDGroup/Content/Genre").toMatch("Secondary Document");
      expect("//Session/MDGroup/Content/SubGenre").toMatch("Consent Forms");
    */
    /* per notion #241 */
    expect("//Session/MDGroup/Content/Genre").toMatch("Consent");
    expect("//Session/MDGroup/Content/SubGenre").toMatch(""); // subgenre element apparently has to be there, but should be empty
  });

  it("should contain 2 Actors", () => {
    // should have one entry each for person 1 and person 2. Should not have one for person 3, because we do not have consent for them.
    expect(count("//Session/MDGroup/Actors/Actor")).toBe(2);
  });

  it("There should be 2 consent files in the ConsentDocuments folder", () => {
    expect(
      fs.existsSync(
        Path.join(targetDir, "ConsentDocuments", "Person_1_Consent.JPG")
      )
    ).toBeTruthy();
    expect(
      fs.existsSync(
        Path.join(targetDir, "ConsentDocuments", "Person_2_Consent.JPG")
      )
    ).toBeTruthy();
  });

  // per Notion #241
  // see comment in beforeAll() about why this is ELAR-specific
  it("If ELAR, it should have an Access of 'S'", () => {
    expect("//MediaFile/Access/Availability").toMatch("S");
    expect("//MediaFile/Access/Description").toMatch("Consent documents");
  });

  // per Notion #241
  it("Resources/MediaFile/ResourceLink should be ConsentDocuments", () => {
    expect("//MediaFile[1]/ResourceLink").toMatch(
      "ConsentDocuments/Person_1_Consent.JPG"
    );
    expect("//MediaFile[2]/ResourceLink").toMatch(
      "ConsentDocuments/Person_2_Consent.JPG"
    );
  });
});

describe("Consent in IMDI-only export", () => {
  let thisRunDir: string;
  let targetDir: string;
  beforeAll(async () => {
    const thisSpecDir = Path.join(os.tmpdir(), "consent imdi bundler tests");
    fs.mkdirSync(thisSpecDir, { recursive: true });
    [thisRunDir, targetDir] = await doExport(
      IMDIMode.RAW_IMDI,
      thisSpecDir,
      false
    );
  });
  it("The file ConsentDocuments.imdi should exist", () => {
    expect(
      fs.existsSync(Path.join(targetDir, "ConsentDocuments.imdi"))
    ).toBeTruthy();
  });
});

async function doExport(
  imdiMode: IMDIMode,
  thisSpecDir: string,
  includeFiles: boolean
): Promise<[thisRunDir: string, targetDir: string]> {
  fs.mkdirSync(thisSpecDir, { recursive: true });
  const randomStringForFileName = Math.random().toString(36).substring(7);
  // including "fssync" in the path tells our file copy thing to just do the copy synchronously
  const thisRunDir = Path.join(
    thisSpecDir,
    "run-" + randomStringForFileName + "-fssync"
  );
  fs.mkdirSync(thisRunDir);
  const projectDir = Path.join(thisRunDir, "projectDir");
  fs.mkdirSync(projectDir);
  const targetDir = Path.join(thisRunDir, "target");
  fs.mkdirSync(targetDir);

  const project = Project.fromDirectory(projectDir);

  // NB: this is to test the access protocol used for consent bundles,
  // which has a hard-coded knowledge of the access protocol used for
  // ELAR currently. If/when we add knowledge of what other archives
  // would want, this will have to become more complicated if we want
  // to unit test ones other than ELAR.
  project.properties.setText("archiveConfigurationName", "ELAR");

  const person1 = project.addPerson("Person 1");
  await person1.addFileForTestAsync("Person 1_Consent.JPG");
  const person2 = project.addPerson("Person 2");
  await person2.addFileForTestAsync("Person 2_Consent.JPG");
  const person3 = project.addPerson("Person 3");
  // person 3 has no consent form

  const session = project.addSession();
  session.addContribution(
    new Contribution(person1.getIdToUseForReferences(), "Consultant", "blah")
  );
  session.addContribution(
    new Contribution(person2.getIdToUseForReferences(), "Speaker", "blah")
  );
  session.addContribution(
    new Contribution(person3.getIdToUseForReferences(), "Translator", "blah")
  );

  await ImdiBundler.addConsentBundle(
    project,
    targetDir, // review is it this or targetDir?
    "",
    [],
    imdiMode,
    includeFiles,
    (f) => true,
    true
  );
  return [thisRunDir, targetDir];
}
