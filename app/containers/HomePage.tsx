import Home from "../components/Home";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project, IProjectHolder } from "../model/Project/Project";
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
      // project: Project.fromDirectory(
      //   fs.realpathSync("sample data/Edolo sample")
      // )
      project: null
    };
  }
  private createProject() {
    this.setState({ showModal: true });
  }

  public componentDidMount() {
    ipcRenderer.on("open-project", () => {
      this.openProject();
    });
    ipcRenderer.on("create-project", () => {
      this.createProject();
    });

    //review: could just as well be "Close Project"; would do the same thing
    ipcRenderer.on("welcome-screen", () => {
      //todo: Is anything needed to save things off first?
      this.projectHolder.project = null;
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
    const title = this.projectHolder.project
      ? this.projectHolder.project.displayName + " - SayLess"
      : "SayLess";
    // if (this.projectHolder.project) {
    remote.getCurrentWindow().setTitle(title);
    return (
      <div style={{ height: "100%" }}>
        {this.projectHolder.project ? (
          <Home
            project={this.projectHolder.project}
            authorityLists={this.projectHolder.project.authorityLists}
          />
        ) : (
          <div className={"welcomeScreen"}>
            <h1>Welcome to SayMore!</h1>
            <div className={"contents"}>
              <a onClick={() => this.createProject()}>Create a new project</a>
              <a onClick={() => this.openProject()}>
                Open an existing project on this computer
              </a>
              <a
                onClick={() =>
                  (this.projectHolder.project = Project.fromDirectory(
                    fs.realpathSync("sample data/Edolo sample")
                  ))
                }
              >
                Play with sample project
              </a>
            </div>
          </div>
        )}
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
    // } else {
    //return <WelcomeScreen projectHolder={this.projectHolder} />;
    // return (
    //   <div className={"welcomeScreen"}>
    //     <h1>Welcome to SayMore!</h1>
    //     <div className={"contents"}>
    //       <a
    //         onClick={() =>
    //           (this.projectHolder.project = Project.fromDirectory(
    //             fs.realpathSync("sample data/Edolo sample")
    //           ))
    //         }
    //       >
    //         Play around with a Project containing some sample data
    //       </a>
    //       <a onClick={() => this.createProject()}>Create a new project</a>
    //       <a onClick={() => this.openProject()}>
    //         Open an existing project on this computer
    //       </a>
    //     </div>
    //   </div>
    // );
    // }
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
