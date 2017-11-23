import { Session } from "./Session";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "./Project";
import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";
import { DirectoryObject } from "./BaseModel";
import ComponentFile from "./ComponentFile";

export default class Persistence {
  public static loadProjectFolder(path: string): Project {
    const project = new Project();

    fs.readdirSync(Path.join(path, "Sessions"), "utf8").forEach(p => {
      const dir = Path.join(path, "Sessions", p);
      console.log(dir);
      Persistence.loadSession(project, dir);
    });

    project.selectedSession.index = 0;
    return project;
  }
  public static loadSession(project: Project, sessionDirectory: string) {
    const sessionName = Path.basename(sessionDirectory);
    const sessionPath = Path.join(sessionDirectory, sessionName + ".session");
    const contents: string = fs.readFileSync(sessionPath, "utf8");
    const session: Session = Session.fromObject(JSON.parse(contents));
    session.path = fs.realpathSync(sessionPath);
    session.directory = sessionDirectory;

    Persistence.loadChildFiles(session);
    session.selectedFile = session.files[0];

    console.log("loaded " + session.getString("title"));
    project.sessions.push(session);

    //start autosave
    mobx.autorunAsync(
      () => Persistence.saveSession(project, session),
      10 * 1000 /* min 10 seconds in between */
    );
  }

  ///Load the files constituting a session, person, or project
  private static loadChildFiles(obj: DirectoryObject) {
    //read the files
    const files = glob.sync(Path.join(obj.directory, "*.*"));
    files.forEach(f => {
      if (!f.endsWith(".meta") && !f.endsWith(".test")) {
        const file = new ComponentFile(f);
        obj.files.push(file);
      }
      // if (!f.endsWith(".session")) {
      //   // we don't want the session file itself
      //   console.log("File: " + f);
      // }
    });
  }

  public static saveSession(project: Project, session: Session) {
    console.log("saving " + session.getString("title"));
    fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}
