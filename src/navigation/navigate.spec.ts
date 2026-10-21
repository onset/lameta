import { describe, it, beforeEach, expect } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { NavigationState } from "./NavigationState";
import { selectTarget } from "./navigate";

mobx.configure({ enforceActions: "never" });
temp.track();

let project: Project;
let state: NavigationState;

function copySampleProjectWithTwoSessions(): string {
  const dir = Path.join(temp.mkdirSync("navigate test"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  const second = Path.join(dir, "Sessions", "ETR010");
  fs.mkdirSync(second);
  fs.copyFileSync(
    Path.join(dir, "Sessions", "ETR009", "ETR009.session"),
    Path.join(second, "ETR010.session"),
  );
  return dir;
}

function session(id: string): Session {
  return project.sessions.items.find((s) => (s as Session).id === id) as Session;
}

describe("selectTarget", () => {
  beforeEach(() => {
    project = Project.fromDirectory(copySampleProjectWithTwoSessions());
    project.sessions.selectedIndex = 0;
    project.persons.selectedIndex = 0;
    state = new NavigationState();
  });

  it.each([
    ["title", "project"],
    ["archiveConfigurationName", "archive"],
    ["grantId", "grant"],
    ["country", "location"],
    ["WorkingLanguages", "languages"],
  ])("finds the Project sub-tab of %s from its form", (fieldKey, tab) => {
    state.setTopTab("people");
    expect(selectTarget(project, { folderType: "project", fieldKey }, state)).toEqual({
      found: true,
    });
    expect(state.topTab).toBe("project");
    expect(state.projectTab).toBe(tab);
  });

  it("reports a project field whose form has no tab, and changes nothing", () => {
    state.setTopTab("people");
    expect(
      selectTarget(
        project,
        { folderType: "project", fieldKey: "multilingualConversionPending" },
        state,
      ),
    ).toEqual({ found: false, missing: "tab", form: "primary" });
    expect(state.topTab).toBe("people");
  });

  it("reports a project field that does not exist", () => {
    expect(selectTarget(project, { folderType: "project", fieldKey: "nope" }, state)).toEqual({
      found: false,
      missing: "field",
    });
  });

  it("selects a session that was not selected, and asks for its Session tab", () => {
    expect(project.sessions.items[project.sessions.selectedIndex]).not.toBe(session("ETR010"));
    const result = selectTarget(
      project,
      { folderType: "session", folderId: "ETR010", fieldKey: "title" },
      state,
    );
    expect(result).toEqual({ found: true });
    expect(state.topTab).toBe("sessions");
    expect(project.sessions.items[project.sessions.selectedIndex]).toBe(session("ETR010"));
    expect(session("ETR010").selectedFile).toBe(session("ETR010").metadataFile);
    expect(state.fileTabRequest?.fileTab).toBe("session");
  });

  it.each([
    ["status", "status"], // form: "status"
    ["involvement", "session"], // in the More Fields table
    ["topic", "session"], // a custom field
    ["notes", "notes"],
    ["contributions", "contributors"],
  ])("finds the session tab of %s", (fieldKey, tab) => {
    expect(
      selectTarget(project, { folderType: "session", folderId: "ETR009", fieldKey }, state),
    ).toEqual({ found: true });
    expect(state.fileTabRequest?.fileTab).toBe(tab);
  });

  it("finds the Properties tab of a field of a media file", () => {
    const etr009 = session("ETR009");
    const result = selectTarget(
      project,
      {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_Careful.mp3",
        fieldKey: "accessDescription",
      },
      state,
    );
    expect(result).toEqual({ found: true });
    expect(etr009.selectedFile?.getTextProperty("filename")).toBe("ETR009_Careful.mp3");
    expect(state.takeFileTabRequest(etr009, etr009.selectedFile!)).toBe("properties");
    // the request is used up
    expect(state.fileTabRequest).toBeUndefined();
  });

  it("finds the Access tab of a project document", () => {
    state.setTopTab("sessions");
    const folder = project.otherDocsFolder;
    const result = selectTarget(
      project,
      {
        folderType: "project",
        documents: "other",
        fileName: "some other doc.txt",
        fieldKey: "accessDescription",
      },
      state,
    );
    expect(result).toEqual({ found: true });
    expect(state.topTab).toBe("project");
    expect(state.projectTab).toBe("other-docs");
    expect(folder.selectedFile?.getTextProperty("filename")).toBe("some other doc.txt");
    expect(state.takeFileTabRequest(folder, folder.selectedFile!)).toBe("access");
  });

  it("reports a missing project document", () => {
    expect(
      selectTarget(
        project,
        { folderType: "project", documents: "description", fileName: "x.txt" },
        state,
      ),
    ).toEqual({ found: false, missing: "file" });
  });

  it("finds the Contributors tab of a media file", () => {
    selectTarget(
      project,
      {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_Careful.mp3",
        fieldKey: "contributions",
      },
      state,
    );
    expect(state.fileTabRequest?.fileTab).toBe("contributors");
  });

  it("selects a file without asking for a tab when there is no field", () => {
    const etr009 = session("ETR009");
    expect(
      selectTarget(
        project,
        {
          folderType: "session",
          folderId: "ETR009",
          fileName: "ETR009_Tiny.mp4",
        },
        state,
      ),
    ).toEqual({ found: true });
    expect(etr009.selectedFile?.getTextProperty("filename")).toBe("ETR009_Tiny.mp4");
    expect(state.fileTabRequest).toBeUndefined();
  });

  it("does not give a tab request to a different file", () => {
    const etr009 = session("ETR009");
    selectTarget(
      project,
      { folderType: "session", folderId: "ETR009", fieldKey: "contributions" },
      state,
    );
    const otherFile = etr009.files.find((f) => f !== etr009.metadataFile)!;
    expect(state.takeFileTabRequest(etr009, otherFile)).toBeUndefined();
    expect(state.fileTabRequest).toBeDefined();
  });

  it("selects a person by name and asks for the Person tab", () => {
    const result = selectTarget(
      project,
      { folderType: "person", folderId: "Igali Sagali", fieldKey: "birthYear" },
      state,
    );
    expect(result).toEqual({ found: true });
    expect(state.topTab).toBe("people");
    expect(project.persons.items[project.persons.selectedIndex].displayName).toBe("Igali Sagali");
    expect(state.fileTabRequest?.fileTab).toBe("person");
  });

  it("reports that a person file has no contributions", () => {
    expect(
      selectTarget(
        project,
        {
          folderType: "person",
          folderId: "Igali Sagali",
          fieldKey: "contributions",
        },
        state,
      ),
    ).toEqual({ found: false, missing: "field" });
  });

  it("clears a search filter that hides the target", () => {
    project.sessions.filteredItems = [session("ETR009")];
    selectTarget(project, { folderType: "session", folderId: "ETR010" }, state);
    expect(project.sessions.filteredItems).toBeUndefined();
  });

  it("reports a deleted session and changes nothing", () => {
    project.sessions.items.splice(project.sessions.items.indexOf(session("ETR010")), 1);
    state.setTopTab("people");
    expect(
      selectTarget(
        project,
        { folderType: "session", folderId: "ETR010", fieldKey: "title" },
        state,
      ),
    ).toEqual({ found: false, missing: "folder" });
    expect(state.topTab).toBe("people");
    expect(project.sessions.selectedIndex).toBe(0);
    expect(state.fileTabRequest).toBeUndefined();
  });

  it("reports a missing file", () => {
    expect(
      selectTarget(
        project,
        { folderType: "session", folderId: "ETR009", fileName: "gone.mp3" },
        state,
      ),
    ).toEqual({ found: false, missing: "file" });
  });

  it("reports a missing field", () => {
    expect(
      selectTarget(project, { folderType: "session", folderId: "ETR009", fieldKey: "nope" }, state),
    ).toEqual({ found: false, missing: "field" });
  });
});
