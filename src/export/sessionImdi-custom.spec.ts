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
import { Contribution } from "../model/file/File";

let project: Project;
let session: Session;
const projectDir = temp.mkdirSync("lameta imdi session generator test");
beforeAll(async () => {
  temp.track();
  project = Project.fromDirectory(projectDir);
  await project.descriptionFolder.addFileForTestAsync(randomFileName());
  await project.otherDocsFolder.addFileForTestAsync(randomFileName());
  session = project.addSession();
  // set the session date to a known value so that the test results are predictable
  session.properties.setText("date", "2010-01-01");
  session.addFileForTestAsync(randomFileName());
  const mary = project.addPerson("Mary");
  mary.properties.setText("birthYear", "1980");
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

  it("should  output an Actor for a contributor with a matching person", () => {
    session.removeAllContributionsForUnitTest();
    session.addContribution(new Contribution("Mary", "Speaker", ""));
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /*omit namespace*/
      )
    );
    expect("//Actor").toHaveCount(1);
    expect("//Actor/Name").toHaveText("Mary");
    expect("//Actor/Age").toHaveText("30");
  });

  /* the actual policy is in discussion in Notion #238

  It's not clear what we will do, but at the moment, we're output a minimal Actor
  
  it("should not output an Actor for a contributor without a matching person", () => {
    session.addContribution(new Contribution("Joe", "Speaker", ""));
    setResultXml(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true 
      )
    );
    expect("//Actor").toNotExist();
  });*/
  it("should output an Actor for a contributor without a matching person", () => {
    session.removeAllContributionsForUnitTest();
    session.addContribution(new Contribution("Joe", "Speaker", ""));
    setResultXml(
      ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project, true)
    );
    expect("//Actor").toHaveCount(1);
    expect("//Actor/Age").toHaveText("Unspecified");
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
