import { Session } from "./Session";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "./Project";
import * as fs from "fs";
import * as Path from "path";
import * as glob from "glob";
import { Folder } from "./Folder";
import { File } from "./File";
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
  ): File[] {
    const files = new Array<File>();

    // the first file we want to return is special. It is the metadata file for the DirectoryObject (Project | Session | Person)
    const name = Path.basename(directory);
    const mainMetaPath = Path.join(
      directory,
      name + mainMetadataFileExtensionWithDot
    );
    if (!fs.existsSync(mainMetaPath)) {
      fs.writeFileSync(mainMetaPath, "<Session></Session>", "utf8");
    }
    const folder = new File(mainMetaPath);
    this.readMetaFile(folder, mainMetaPath);
    files.push(folder);

    //read the other files
    const filePaths = glob.sync(Path.join(directory, "*.*"));
    filePaths.forEach(path => {
      if (!path.endsWith(mainMetadataFileExtensionWithDot)) {
        // the .meta companion files will be read and loaded into the properties of
        // the files they describe will be found and loaded, by the constructor of the ComponentFile
        if (!path.endsWith(".meta") && !path.endsWith(".test")) {
          const file = new File(path);
          if (fs.existsSync(path + ".meta")) {
            this.readMetaFile(file, path + ".meta");
          }
          files.push(file);
        }
      }
    });
    return files;
  }

  private static readMetaFile(file: File, path: string) {
    const xml: string = fs.readFileSync(path, "utf8");
    const json: string = xml2json(xml, {
      ignoreComment: true,
      compact: true,
      ignoreDoctype: true,
      ignoreDeclaration: true,
      trim: true
    });
    const xmlAsObject = JSON.parse(json);
    // that will have a root with one child, like "Session" or "Meta". Zoom in on that
    // so that we just have the object with its properties.
    const properties = xmlAsObject[Object.keys(xmlAsObject)[0]];
    file.loadProperties(properties);
  }
  public static saveSession(project: Project, session: Session) {
    //console.log("saving " + session.getString("title"));
    //fs.writeFileSync(session.path + ".test", JSON.stringify(session), "utf8");
  }
}
