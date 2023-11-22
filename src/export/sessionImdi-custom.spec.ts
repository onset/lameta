import { describe, it, beforeAll, afterAll } from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count
} from "../other/xmlUnitTestUtils";
import temp from "temp";

let project: Project;
let session: Session;
const projectDir = temp.mkdirSync("lameta imdi bundler test");
beforeAll(() => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  project.descriptionFolder.addFileForTest("test.txt");
  project.otherDocsFolder.addFileForTest("test.txt");
  session = project.addSession();
});
afterAll(() => {
  temp.cleanupSync();
});
describe("session imdi export", () => {
  it("genres should show title case version instead of underscored", () => {
    session.properties.setText("genre", "academic_output");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    // expect there to be a <Genre> element with text "Academic Output"
    expect(count("//Genre")).toBe(1);
    expect("//Genre").toHaveText("Academic Output");
  });

  // notion issue #239
  it("keyword case handling", () => {
    session.properties.setText("keyword", "foo, one two UN, FLEx, XYZ");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("One two UN");
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("FLEx");
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("Foo");
    expect(`//Keys/Key[@Name="Keyword"]`).toHaveSomeMatch("XYZ");
  });
});
