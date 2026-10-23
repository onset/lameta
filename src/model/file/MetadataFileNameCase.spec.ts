import fs from "fs";
import Path from "path";
import temp from "temp";
import { describe, it, expect } from "vite-plus/test";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";

temp.track();

// A folder renamed by changing only the case of its name, or a project copied
// from a case-sensitive file system, leaves a metadata file whose name differs
// from the folder's only in case.
describe("a metadata file whose name differs from its folder only in case", () => {
  function makeSession(fileName: string) {
    const dir = Path.join(temp.mkdirSync("metadataNameCase"), "CaseMix");
    fs.mkdirSync(dir);
    fs.writeFileSync(
      Path.join(dir, fileName),
      `<?xml version="1.0" encoding="utf-8"?><Session><title type="string">Kept title</title></Session>`,
    );
    return { dir, session: Session.fromDirectory(dir, new EncounteredVocabularyRegistry()) };
  }

  it("is loaded as the session's metadata file and not also listed as an attached file", () => {
    const { session } = makeSession("casemix.session");

    expect(session.properties.getTextStringOrEmpty("title")).toBe("Kept title");
    const sessionFiles = session.files.filter((f) =>
      f.pathInFolderToLinkFileOrLocalCopy.toLowerCase().endsWith(".session"),
    );
    expect(sessionFiles).toEqual([session.metadataFile]);
  });

  it("gets no sidecar and ends up named after the folder", () => {
    const { dir } = makeSession("casemix.session");

    expect(fs.readdirSync(dir)).toEqual(["CaseMix.session"]);
  });

  it("is found when only its extension differs in case", () => {
    const { dir, session } = makeSession("CaseMix.SESSION");

    expect(session.properties.getTextStringOrEmpty("title")).toBe("Kept title");
    expect(fs.readdirSync(dir)).toEqual(["CaseMix.session"]);
  });
});
