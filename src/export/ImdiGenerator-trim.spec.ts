import { describe, it, beforeAll, afterAll } from "vite-plus/test";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Contribution } from "../model/file/File";
import { setResultXml, xexpect as expect } from "../other/xmlUnitTestUtils";
import temp from "temp";

beforeAll(() => {
  temp.track();
});
afterAll(() => {
  temp.cleanupSync();
});

describe("IMDI export of values with spaces around them", () => {
  it("writes an actor's name and contribution comments without the spaces", () => {
    const project = Project.fromDirectory(temp.mkdirSync("lameta imdi trim test"));
    project.properties.setText("metadataLanguages", "en:English");
    const person = project.addPerson("Ana López");
    person.properties.setText("name", " Ana López ");
    const session = project.addSession();
    session.addContribution(new Contribution("Ana López", "speaker", "  told the fish story  "));

    setResultXml(
      ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project, true /*omit namespace*/),
    );

    expect("//Actor/Name").toHaveText("Ana López");
    expect("//Actor/FullName").toHaveText("Ana López");
    expect("//Actor/Keys/Key[@Name='contribution-comments']").toHaveText("told the fish story");
  });
});
