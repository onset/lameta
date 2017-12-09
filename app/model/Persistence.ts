import { Session } from "./Session";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "./Project";
import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";
import { DirectoryObject } from "./DirectoryObject";
import { ComponentFile } from "./ComponentFile";
import { xml2js, xml2json } from "xml-js";

export default class Persistence {
  public static loadProjectFolder(path: string): Project {
    const project = new Project();

    fs.readdirSync(Path.join(path, "Sessions"), "utf8").forEach(childName => {
      const dir = Path.join(path, "Sessions", childName);
      if (fs.lstatSync(dir).isDirectory()) {
        console.log(dir);
        const session = Persistence.loadSession(dir);
        project.sessions.push(session);
      }
      // else ignore it
    });

    project.selectedSession.index = 0;
    return project;
  }

  public static loadSession(sessionDirectory: string): Session {
    const files = Persistence.loadChildFiles(sessionDirectory, ".session");
    return new Session(sessionDirectory, files);

    //start autosave
    // mobx.autorunAsync(
    //   () => Persistence.saveSession(project, session),
    //   10 * 1000 /* min 10 seconds in between */
    // );
  }

  ///Load the files constituting a session, person, or project
  private static loadChildFiles(
    directory: string,
    mainMetadataFileExtensionWithDot: string
  ): ComponentFile[] {
    const files = new Array<ComponentFile>();

    // the first file we want to return is special. It is the metadata file for the DirectoryObject (Project | Session | Person)
    const name = Path.basename(directory);
    const mainMetaPath = Path.join(
      directory,
      name + mainMetadataFileExtensionWithDot
    );
    if (!fs.existsSync(mainMetaPath)) {
      fs.writeFileSync(mainMetaPath, "<Session></Session>", "utf8");
    }
    const xml: string = fs.readFileSync(mainMetaPath, "utf8");
    const json: string = xml2json(xml, {
      ignoreComment: true,
      compact: true,
      ignoreDoctype: true,
      ignoreDeclaration: true,
      trim: true
    });
    const data = JSON.parse(json).Session;
    const f = new ComponentFile(mainMetaPath);
    f.loadFromJSObject(data);
    files.push(f);

    //read the other files
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      if (!path.endsWith(mainMetadataFileExtensionWithDot)) {
        // the .meta companion files will be read and loaded into the properties of
        // the files they describe will be found and loaded, by the constructor of the ComponentFile
        if (!path.endsWith(".meta") && !path.endsWith(".test")) {
          files.push(new ComponentFile(path));
        }
      }
    });
    return files;
  }

  public static saveSession(project: Project, session: Session) {
    //console.log("saving " + session.getString("title"));
    //fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}
