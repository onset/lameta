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
const projectDir = temp.mkdirSync("lameta imdi session generator test");
beforeAll(async () => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  await project.descriptionFolder.addFileForTestAsync(randomFileName());
  await project.otherDocsFolder.addFileForTestAsync(randomFileName());
  session = project.addSession();
  session.addFileForTestAsync(randomFileName());
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

  // notion issue #255
  it("session access applies to resources", () => {
    session.properties.setText("access", "open");

    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(`//Resources/WrittenResource/Access/Availability`).toMatch("open");
  });

  it("missing access should still emit access nodes", () => {
    session.properties.removeProperty("access");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect(count(`//Resources/WrittenResource/Access`)).toBe(1);
    expect(`//Resources/WrittenResource/Access/Availability`).toMatch("");
  });
  it("should not include Notes in the Keys", () => {
    session.properties.setText("notes", "We shared red hots.");
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect("//Content/Keys/Key[@Name='Notes']").toNotExist();
  });
});

function randomFileName() {
  return Math.random().toString(36).substring(7) + ".test.txt";
}
