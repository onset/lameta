import Home from "../components/Home";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "../model/Project/Project";
import * as fs from "fs";
import * as Path from "path";
const { ipcRenderer } = require("electron");
// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IProjectHolder {
  project: Project;
}
import { remote, OpenDialogOptions } from "electron";
@observer
export default class HomePage extends React.Component<IProps> {
  // we have to wrap in in a "holder" so that mobx can observe when we change it
  @mobx.observable private projectHolder: IProjectHolder;
  //public project: Project;

  constructor(props: IProps) {
    super(props);
    ipcRenderer.on("open-project", () => {
      console.log("received open-project");
      const options: OpenDialogOptions = {
        title: "Open Project...",
        defaultPath: "x:/temp",
        properties: ["openFile"],
        filters: [
          { name: "SayMore/SayLess Project Files", extensions: ["sprj"] }
        ]
      };
      remote.dialog.showOpenDialog(options, paths => {
        if (paths) {
          this.projectHolder.project = Project.fromDirectory(
            fs.realpathSync(Path.dirname(paths[0]))
          );
        }
      });
    });

    this.projectHolder = {
      project: Project.fromDirectory(
        fs.realpathSync("sample data/Edolo sample")
      )
    };
  }

  public render() {
    return (
      <Home
        project={this.projectHolder.project}
        authorityLists={this.projectHolder.project.authorityLists}
      />
    );
  }
}
