import { describe, it, beforeAll, afterAll } from "vitest";

import { Project } from "../model/Project/Project";
import {
  setResultXml,
  xexpect as expect,
  count
} from "../other/xmlUnitTestUtils";
import ImdiBundler from "./ImdiBundler";
import temp from "temp";
import * as fs from "fs-extra";
import * as Path from "path";
import { IMDIMode } from "./ImdiGenerator";

temp.track(); // cleanup on exit: doesn't work

/* April 2021 this needs work. It relies on a file, ConsentDocuments.imdi being in the Edolo Sample, but that
  wouldn't normally have that file since imdi's don't come with the sample, they need to be generated.*/

let rootDirectory: string;
describe("Consent Form Inclusion", () => {
  afterAll(() => {
    try {
      fs.emptyDirSync(rootDirectory);
      fs.removeSync(rootDirectory);
    } catch (e) {
      // was having trouble cleaning up when running all tests
      console.warn(`consentImdi-edolo.spec.ts: afterAll: ${e}`);
    }
  });
  beforeAll(async () => {
    const project = Project.fromDirectory("sample data/Edolo sample");
    // including "fssync" in the path tells our file copy thing to just do the copy synchronously
    rootDirectory = temp.mkdirSync("ImdiBundlerTest-fssync");
    await ImdiBundler.addConsentBundle(
      project,
      rootDirectory,
      "",
      [],
      IMDIMode.RAW_IMDI,
      true, //<-- copy in files
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      (f) => true,
      true
    );
    const xml = fs.readFileSync(
      Path.join(rootDirectory, "ConsentDocuments.imdi"),
      "utf8"
    );
    expect(xml).toBeTruthy();
    setResultXml(xml);
  });
  it("The consent form dummy session to look reasonable", () => {
    expect(count("METATRANSCRIPT")).toBe(1);
    expect("METATRANSCRIPT/Session/Name").toMatch("ConsentDocuments"); // Notion #241
  });

  it("should contain Content", () => {
    expect("METATRANSCRIPT/Session/MDGroup/Content/Genre").toMatch("Consent");
  });
  it("should contain Actors", () => {
    // should have one entry for Awi, one for Ilawi. Should not include Hatton, because we do not have consent for him.
    expect(count("METATRANSCRIPT/Session/MDGroup/Actors/Actor")).toBe(2);
  });

  it("There should be 2 consent files in the ConsentDocuments folder", () => {
    expect(
      fs.existsSync(
        Path.join(rootDirectory, "ConsentDocuments", "Awi_Heole_Consent.JPG")
      )
    ).toBeTruthy();
    expect(
      fs.existsSync(
        Path.join(rootDirectory, "ConsentDocuments", "Ilawi_Amosa_Consent.JPG")
      )
    ).toBeTruthy();
  });

  // TODO: add tests of the session filter. Should limit what is in the IMDI and what files make it in

  it("should have a date", () => {
    // should match today
    expect("METATRANSCRIPT/Session/Date").toMatch(/20..-..-../);
  });
});
