import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import * as temp from "temp";
import * as fs from "fs";
import * as Path from "path";
import * as mobx from "mobx";
import { Project } from "../Project";
import { Person } from "./Person";

mobx.configure({ enforceActions: "never" });
temp.track();

const nfc = (s: string) => s.normalize("NFC");
const nfd = (s: string) => s.normalize("NFD");

describe("Project.findPerson", () => {
  let project: Project;

  beforeEach(() => {
    const dir = Path.join(temp.mkdirSync("findPerson"), "Find Person");
    fs.mkdirSync(dir);
    project = Project.fromDirectory(dir);
  });
  afterEach(() => {
    temp.cleanupSync();
  });

  function addPerson(name: string, code?: string): Person {
    const person = project.addPerson(name);
    if (code !== undefined) person.properties.setText("code", code);
    return person;
  }

  it("finds a person by name or by code", () => {
    const ana = addPerson("Ana López", "AL");
    const ben = addPerson("Ben Smith");
    expect(project.findPerson("Ana López")).toBe(ana);
    expect(project.findPerson("AL")).toBe(ana);
    expect(project.findPerson("Ben Smith")).toBe(ben);
  });

  it("ignores case, spaces around the reference and how accents are composed", () => {
    const jose = addPerson(nfd("José Núñez"), ` ${nfd("Zoë")} `);
    expect(project.findPerson(nfc(" josé núñez "))).toBe(jose);
    expect(project.findPerson(nfc("ZOË"))).toBe(jose);
  });

  it("finds nobody for a reference that matches no person", () => {
    addPerson("Ana López", "AL");
    expect(project.findPerson("Ana Lopez")).toBeUndefined();
    expect(project.findPerson("")).toBeUndefined();
  });

  it("returns the first person in the list when two people share a reference", () => {
    const first = addPerson("Sam");
    addPerson("Samuel Jones", "sam");
    expect(project.findPerson("SAM")).toBe(first);
  });

  it("finds a person under a new name and no longer under the old one", () => {
    const ana = addPerson("Ana López");
    expect(project.findPerson("Ana López")).toBe(ana);
    ana.properties.setText("name", "Ana Pérez");
    expect(project.findPerson("Ana Pérez")).toBe(ana);
    expect(project.findPerson("Ana López")).toBeUndefined();
  });

  it("follows a code that is added, changed or cleared", () => {
    const ana = addPerson("Ana López");
    ana.properties.setText("code", "AL");
    expect(project.findPerson("AL")).toBe(ana);
    ana.properties.setText("code", "AP");
    expect(project.findPerson("AP")).toBe(ana);
    expect(project.findPerson("AL")).toBeUndefined();
    ana.properties.setText("code", "");
    expect(project.findPerson("AP")).toBeUndefined();
    expect(project.findPerson("Ana López")).toBe(ana);
  });

  it("finds a person who was added, and not one who was removed", () => {
    expect(project.findPerson("Ana López")).toBeUndefined();
    const ana = addPerson("Ana López");
    expect(project.findPerson("Ana López")).toBe(ana);
    project.persons.items.splice(project.persons.items.indexOf(ana), 1);
    expect(project.findPerson("Ana López")).toBeUndefined();
  });

  it("makes a MobX reaction that looked a person up run again when the person is renamed", () => {
    const ana = addPerson("Ana López");
    const found: (Person | undefined)[] = [];
    const dispose = mobx.autorun(() => found.push(project.findPerson("Ana Pérez")));
    ana.properties.setText("name", "Ana Pérez");
    dispose();
    expect(found).toEqual([undefined, ana]);
  });
});
