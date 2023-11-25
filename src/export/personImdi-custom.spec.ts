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
  const projectDir = temp.mkdirSync("lameta imdi session generator test");
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
});
