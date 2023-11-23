import { describe, it, beforeAll, beforeEach } from "vitest";
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

beforeAll(() => {
  const projectDir = temp.mkdirSync("lameta imdi session generator test");
  project = Project.fromDirectory(projectDir);
  person = project.addPerson();
  generator = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
});
beforeEach(() => {});

describe("actor imdi export", () => {
  it("should export description in Description element, not in Keys", () => {
    person.properties.setText("description", "likes sour candy");
    setResultXml(
      generator.actor(person, "pretend-role", pretendSessionDate) as string
    );
    expect("//Actor/Description").toMatch("likes sour candy");
    expect("//Actor/Keys/Key[@Name='Description']").toNotExist();
  });
});
