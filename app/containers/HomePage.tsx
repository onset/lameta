import Home from "../components/Home";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project } from "../model/Project/Project";
import * as fs from "fs-extra";
import * as Path from "path";
import { remote, OpenDialogOptions } from "electron";
import CreateProjectDialog from "../components/project/CreateProjectDialog";
const { ipcRenderer } = require("electron");
// tslint:disable-next-line:no-empty-interface

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  showModal: boolean;
}

interface IProjectHolder {
  project: Project;
}

@observer
export default class HomePage extends React.Component<IProps, IState> {
  // we wrap the project in a "holder" so that mobx can observe when we change it
  @mobx.observable private projectHolder: IProjectHolder;

  constructor(props: IProps) {
    super(props);
    this.state = {
      showModal: false
    };
    this.projectHolder = {
      project: Project.fromDirectory(
        fs.realpathSync("sample data/Edolo sample")
      )
    };
  }

  public componentDidMount() {
    ipcRenderer.on("open-project", () => {
      this.openProject();
    });
    ipcRenderer.on("create-project", () => {
      this.setState({ showModal: true });
    });
  }

  private handleCreateProjectClose(directory: string) {
    this.setState({ showModal: false });
    if (directory) {
      fs.ensureDirSync(directory);
      this.projectHolder.project = Project.fromDirectory(directory);
    }
  }
  public render() {
    remote
      .getCurrentWindow()
      .setTitle(this.projectHolder.project.displayName + " - SayLess");
    return (
      <div style={{ height: "100%" }}>
        <Home
          project={this.projectHolder.project}
          authorityLists={this.projectHolder.project.authorityLists}
        />
        {this.state.showModal ? (
          <CreateProjectDialog
            isOpen={this.state.showModal}
            callback={answer => this.handleCreateProjectClose(answer)}
          />
        ) : (
          ""
        )}
      </div>
    );
  }

  private openProject() {
    const options: OpenDialogOptions = {
      title: "Open Project...",
      defaultPath: "x:/temp",
      properties: ["openFile"],
      filters: [{ name: "SayMore/SayLess Project Files", extensions: ["sprj"] }]
    };
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), options, paths => {
      if (paths) {
        this.projectHolder.project = Project.fromDirectory(
          fs.realpathSync(Path.dirname(paths[0]))
        );
      }
    });
  }
}
