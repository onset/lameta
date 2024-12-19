import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import temp from "temp";
import { setResultXml, value } from "../other/xmlUnitTestUtils";

let project: Project;
const projectDir = temp.mkdirSync("lameta imdi generator vocab test");
describe("ImdiGenerator genre handling", () => {
  beforeAll(async () => {
    temp.track();
    project = Project.fromDirectory(projectDir);
    await project.descriptionFolder.addFileForTestAsync(randomFileName());
    await project.otherDocsFolder.addFileForTestAsync(randomFileName());
  });
  it("should convert genre to sentence case", () => {
    const session = project.addSession();
    session.properties.setText("genre", "procedural_discourse");
    const imdi = ImdiGenerator.generateSession(
      IMDIMode.RAW_IMDI,
      session,
      project,
      true
    );
    setResultXml(imdi);

    // Check for correct genre case in the output
    expect(value("//Session/MDGroup/Content/Genre")).toBe(
      "Procedural discourse"
    );
  });
});

function randomFileName() {
  return Math.random().toString(36).substring(7) + ".test.txt";
}
