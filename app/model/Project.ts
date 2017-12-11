import * as fs from "fs";
import * as mobx from "mobx";
import * as glob from "glob";
import * as Path from "path";
import { Session } from "./Session";

export class SelectedItem {
  @mobx.observable public index: number;
}

export class Project {
  @mobx.observable public selectedSession: SelectedItem;
  @mobx.observable public sessions: Session[] = [];

  constructor() {
    this.selectedSession = new SelectedItem();
  }

  public static FromDirectory(path: string): Project {
    const project = new Project();

    fs.readdirSync(Path.join(path, "Sessions"), "utf8").forEach(childName => {
      const dir = Path.join(path, "Sessions", childName);
      if (fs.lstatSync(dir).isDirectory()) {
        console.log(dir);
        const session = Session.fromDirectory(dir);
        project.sessions.push(session);
      }
      // else ignore it
    });

    project.selectedSession.index = 0;
    return project;
  }
}
