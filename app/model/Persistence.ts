import { Session } from "./Session";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "./Project";
import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";

export default class Persistence {
  public static loadProjectFolder(path: string): Project {
    const project = new Project();
    Persistence.loadSession(
      project,
      "test/sample/Sessions/Community Members/Community Members.session"
    );
    Persistence.loadSession(
      project,
      "test/sample/Sessions/Flowers/Flowers.session"
    );
    project.selectedSession.index = 0;
    return project;
  }
  public static loadSession(project: Project, sessionPath: string) {
    const s: string = fs.readFileSync(sessionPath, "utf8");
    const session: Session = Session.fromObject(JSON.parse(s));
    session.selectedFile = session.files[0];
    session.path = fs.realpathSync(sessionPath);
    session.directory = Path.dirname(session.path);
    const filename = Path.basename(session.path);
    const files = glob.sync(Path.join(session.directory, "*.*"));
    files.forEach(f => {
      if (!f.startsWith(filename)) {
        // we don't want the session file itself
        console.log("File: " + f);
      }
    });

    console.log("loaded " + session.getString("title"));
    project.sessions.push(session);

    mobx.autorunAsync(
      () => Persistence.saveSession(project, session),
      10 * 1000 /* min 10 seconds in between */
    );
  }

  public static saveSession(project: Project, session: Session) {
    console.log("saving " + session.getString("title"));
    fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}
