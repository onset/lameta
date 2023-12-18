import { vi, describe, it, beforeAll, afterAll } from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { setResultXml, xexpect as expect } from "../other/xmlUnitTestUtils";
import temp from "temp";

let project: Project;
let opexXml = "";

let projectDir;
beforeAll(() => {
  temp.track();
  projectDir = temp.mkdirSync("lameta sessionOpex.spec");
  project = Project.fromDirectory(projectDir);
  const session = project.addSession();
  opexXml = ImdiGenerator.generateSession(
    IMDIMode.OPEX,
    session,
    project,
    true /*omit namespace*/
  );
  setResultXml(opexXml);
});
afterAll(() => {
  temp.cleanupSync();
});

describe("session opex export", () => {
  it("should contain opex wrappers", () => {
    // xpaths with namespaces are a hassle so we regex it out
    expect(opexXml).toEqual(
      expect.stringMatching(
        /<?xml.*?>\s*<opex:OPEXMetadata.*>\s*<opex:DescriptiveMetadata.*>\s*<METATRANSCRIPT.*/
      )
    );
  });
});
