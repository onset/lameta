import { vi, describe, it, beforeAll, beforeEach } from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../other/xmlUnitTestUtils";
import { CustomFieldRegistry } from "../model/Project/CustomFieldRegistry";
import temp from "temp";
vi.mock("@electron/remote", () => ({ exec: vi.fn() })); //See commit msg for info

let project: Project;
let session: Session;
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
