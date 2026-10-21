import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import temp from "temp";
import { Project } from "../Project";
import { Contribution } from "../../file/File";

beforeAll(() => {
  temp.track();
});
afterAll(() => {
  temp.cleanupSync();
});

describe("Session.getRulesViolationsString", () => {
  it("separates the message from the contributor list with a space", () => {
    const project = Project.fromDirectory(temp.mkdirSync("lameta rules violations test"));
    const session = project.addSession();
    session.metadataFile!.contributions.push(new Contribution("Hatton", "speaker", ""));
    expect(session.getRulesViolationsString([])).toMatch(/: Hatton \(speaker\)$/);
  });
});
