import ImdiGenerator from "../../app/export/imdiGenerator";
import { File } from "../../app/model/file/File";
import { Project } from "../../app/model/Project/Project";
import { Person } from "../../app/model/Project/Person/Person";
const XPATH = require("xpath");
const dom = require("xmldom").DOMParser;
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "./xmlUnitTestUtils";

let project: Project;
let person: Person;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  person = Person.fromDirectory("sample data/Edolo sample/People/Awi Heole");
  setResultXml(
    ImdiGenerator.generateActor(person, project, true /*omit namespace*/)
  );
});
beforeEach(() => {});

describe("actor imdi export", () => {
  it("should contain Actor", () => {
    expect("Actor/Name").toMatch("Awi Heole");
    expect(count("Actor/Languages/Language")).toBe(3);
  });
  it("should label languages correctly", () => {
    expect(
      count(
        "Actor/Languages/Language[Name[text()='Edolo']]/MotherTongue[text()='true']"
      )
    ).toBe(1);
    expect(
      count(
        "Actor/Languages/Language[Name[text()='Edolo']]/PrimaryLanguage[text()='true']"
      )
    ).toBe(1);

    expect(
      count(
        "Actor/Languages/Language[Name[text()='Huli']]/MotherTongue[text()='false']"
      )
    ).toBe(1);
    expect(
      count(
        "Actor/Languages/Language[Name[text()='Huli']]/PrimaryLanguage[text()='false']"
      )
    ).toBe(1);
  });
});
