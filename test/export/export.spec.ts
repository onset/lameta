import ImdiGenerator from "../../app/export/imdiGenerator";
import { File } from "../../app/model/file/File";
import { Project } from "../../app/model/Project/Project";
import { Session } from "../../app/model/Project/Session/Session";
const XPATH = require("xpath");
const dom = require("xmldom").DOMParser;

let project: Project;
let session: Session;
let sessionXml: string;
let sessionImdiDom: any;
/* I was trying to not have to include a ns prefix in the tests,
  but this isn't called unless I give it some namespace, so what's the point?

  const resolver = {
  lookupNamespaceURI: (prefix: string) => {
    return "http://www.mpi.nl/IMDI/Schema/IMDI";
  }
};*/

// I haven't figured out to extend
// to novel names properly.
const xexpect: any = expect;

// This overrides an existing expect function in order to have a convenient
// check using an xpath and an expected value.
expect.extend({
  toMatch(xpath, expectedValue) {
    const hits = select(xpath);
    if (!hits || hits.length === 0) {
      console.log(sessionXml);
      return {
        message: () =>
          `expected ${xpath} to be '${expectedValue}' but it did not match anything`,
        pass: false
      };
    }
    const pass = value(xpath) === expectedValue;
    if (pass) {
      return {
        message: () => `expected ${xpath} to be '${expectedValue}'`,
        pass: true
      };
    } else {
      return {
        message: () => `expected ${xpath} to be '${expectedValue}'`,
        pass: false
      };
    }
  }
});

expect.extend({
  toDeclareVocabulary(xpath, url) {
    const hits = select(xpath);
    if (!hits || hits.length === 0) {
      console.log(sessionXml);
      return {
        message: () =>
          `expected ${xpath} to be '${url}' but it did not match anything ${sessionXml}`,
        pass: false
      };
    }
    const xpathWithAttr = xpath + `[@Link="${url}"]`;
    const pass = select(xpathWithAttr).length > 0;
    if (pass) {
      return {
        message: () => `expected ${xpathWithAttr} Link to be '${url}'`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `expected ${xpathWithAttr} Link to be '${url}'\r\n ${sessionXml}`,
        pass: false
      };
    }
  }
});

expect.extend({
  toBeClosed(xpath) {
    const hits = select(xpath);
    if (!hits || hits.length === 0) {
      console.log(sessionXml);
      return {
        message: () => `expected ${xpath} to be exist ${sessionXml}`,
        pass: false
      };
    }
    const xpathWithAttr = xpath + `[@Type="ClosedVocabulary"]`;
    const pass = select(xpathWithAttr).length > 0;
    if (pass) {
      return {
        message: () => `expected ${xpathWithAttr} type to be closed}'`,
        pass: true
      };
    } else {
      return {
        message: () =>
          `expected ${xpathWithAttr} Link to be type to be closed. `,
        pass: false
      };
    }
  }
});

function assertAttribute(xpath: string, attribute: string, expected: string) {
  const hits = select(xpath);
  if (!hits || hits.length === 0) {
    console.log(sessionXml);
    return {
      message: () => `expected ${xpath} to exist `,
      pass: false
    };
  }
  const xpathWithAttr = xpath + `[@${attribute}="${expected}"]`;
  const pass = select(xpathWithAttr).length > 0;
  if (pass) {
    return {
      message: () =>
        `expected ${xpathWithAttr} ${attribute} to be ${expected}. `,
      pass: true
    };
  } else {
    return {
      message: () =>
        `expected ${xpathWithAttr} ${attribute} to be ${expected}. `,
      pass: false
    };
  }
}

expect.extend({
  toBeOpen(xpath) {
    return assertAttribute(xpath, "Type", "OpenVocabulary");
  }
});

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  session = Session.fromDirectory("sample data/Edolo sample/Sessions/ETR009");
  sessionXml = ImdiGenerator.generateSession(
    session,
    project,
    true /*omit namespace*/
  );
  sessionImdiDom = new dom().parseFromString(sessionXml);
});
beforeEach(() => {});

describe("session imdi export", () => {
  it("should contain METATRANSCRIPT/Session", () => {
    expect(count("METATRANSCRIPT/Session")).toBe(1);
  });
  it("should contain Session/Name", () => {
    expect(count("METATRANSCRIPT/Session/Name")).toBe(1);
  });
  it("should contain Session/Name", () => {
    expect(value("METATRANSCRIPT/Session/Name")).toBe("ETR009");
  });
  it("should contain Session/Title", () => {
    expect(count("METATRANSCRIPT/Session/Title")).toBe(1);
  });
  it("should contain Session/Description", () => {
    expect(count("METATRANSCRIPT/Session/Description")).toBe(1);
  });
  it("should contain Continent", () => {
    expect("METATRANSCRIPT/Session/MDGroup/Location/Continent").toMatch(
      "Oceania"
    );

    xexpect(
      "METATRANSCRIPT/Session/MDGroup/Location/Continent"
    ).toDeclareVocabulary("http://www.mpi.nl/IMDI/Schema/Continents.xml");

    xexpect("METATRANSCRIPT/Session/MDGroup/Location/Continent").toBeClosed();
  });
});

it("should contain Country", () => {
  expect("METATRANSCRIPT/Session/MDGroup/Location/Country").toMatch(
    "Papua New Guinea"
  );

  xexpect(
    "METATRANSCRIPT/Session/MDGroup/Location/Country"
  ).toDeclareVocabulary("http://www.mpi.nl/IMDI/Schema/Countries.xml");

  xexpect("METATRANSCRIPT/Session/MDGroup/Location/Country").toBeOpen();
});
it("should contain Project", () => {
  expect(count("METATRANSCRIPT/Session/MDGroup/Project")).toBe(1);
  xexpect("METATRANSCRIPT/Session/MDGroup/Project/Title").toMatch(
    "Edolo Sample"
  );
});
it("should contain Content", () => {
  expect(count("METATRANSCRIPT/Session/MDGroup/Content")).toBe(1);
  xexpect("METATRANSCRIPT/Session/MDGroup/Content/Genre").toMatch("narrative");
});
it("should contain MediaFiles", () => {
  expect(count("METATRANSCRIPT/Session/Resources/MediaFile")).toBe(4);
  expect(
    "METATRANSCRIPT/Session/Resources/WrittenResource/ResourceLink"
  ).toMatch("ETR009.session");
});

function count(xpath: string): number {
  return select(xpath).length;
}
function value(xpath: string): string {
  return select(xpath)[0].textContent;
}
function select(xpath: string): any[] {
  try {
    const nodes = XPATH.selectWithResolver(
      xpath,
      sessionImdiDom
      //, resolver
    );
    return nodes;
  } catch (ex) {
    console.log("error in xpath: " + xpath);
    console.log(ex);
    throw new Error("error in xpath: " + xpath);
  }
}
