import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll
} from "vitest";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import {
  setResultXml,
  xexpect as expect,
  count
} from "../other/xmlUnitTestUtils";
import * as mobx from "mobx";
import temp from "temp";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { Field } from "../model/field/Field";

mobx.configure({
  enforceActions: "never"
});
let project: Project;
let person: Person;
let generator: ImdiGenerator;
const pretendSessionDate = new Date("2010-06-06");

beforeAll(async () => {
  temp.track();
});
afterAll(() => {
  temp.cleanupSync();
});

beforeEach(() => {
  const projectDir = temp.mkdirSync("lameta imdi actor generator test");
  project = Project.fromDirectory(projectDir);
  person = project.addPerson();
  generator = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
});

const generate = () => {
  setResultXml(
    generator.actor(person, "pretend-role", pretendSessionDate) as string
  );
};
describe("actor imdi export", () => {
  it("should not include Notes in the Keys", () => {
    person.properties.setText("notes", "I wonder if he took my red hots?");
    generate();
    expect("//Actor/Keys/Key[@Name='Notes']").toNotExist();
  });

  it("should export description in Description element, not in Keys", () => {
    person.properties.setText("description", "likes sour candy");
    generate();
    expect("//Actor/Description").toMatch("likes sour candy");
    expect("//Actor/Keys/Key[@Name='Description']").toNotExist();
  });
  it("should export Unspecified for the Age if there is no birth year", () => {
    person.properties.setText("birthYear", "");
    generate();
    expect("//Actor/Age").toMatch("Unspecified");
  });
});
// function makeCustomField(key: string, value: string) {
//   const definition: FieldDefinition = {
//     key,
//     englishLabel: key,
//     persist: true,
//     type: "Text",
//     tabIndex: 0,
//     isCustom: true,
//     showOnAutoForm: false,
//     multilingual: false
//   };
//   return Field.fromFieldDefinition(definition);
// }
