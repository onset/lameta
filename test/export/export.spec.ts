import ImdiGenerator from "../../app/export/imdiGenerator";
import { File } from "../../app/model/file/File";
import { Project } from "../../app/model/Project/Project";
import { Session } from "../../app/model/Project/Session/Session";
const xpath = require("xpath");
const dom = require("xmldom").DOMParser;

let session: Session;
let sessionXml: string;
let sessionImdiDom: any;
/* I was trying to not have to include a ns prefix in the tests,
  but this isn't called unless I give it some namespace.

  const resolver = {
  lookupNamespaceURI: (prefix: string) => {
    return "http://www.mpi.nl/IMDI/Schema/IMDI";
  }
};*/

beforeAll(() => {
  session = Session.fromDirectory("sample data/Edolo sample/Sessions/ETR009");
  sessionXml = ImdiGenerator.generateSession(session, true /*omit namespace*/);
  sessionImdiDom = new dom().parseFromString(sessionXml);
});
beforeEach(() => {});

describe("session imdi export", () => {
  it("should contain METATRANSCRIPT/Session", () => {
    expect(matches("METATRANSCRIPT/Session")).toBe(1);
  });
  it("should contain Session/Title", () => {
    expect(matches("METATRANSCRIPT/Session/Title")).toBe(1);
  });
});

describe("dummy", () => {
  expect(1).toBe(1);
});

function matches(path: string): number {
  const nodes = xpath.selectWithResolver(
    path,
    sessionImdiDom
    //, resolver
  );
  return nodes.length;
}
