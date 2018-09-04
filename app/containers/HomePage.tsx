import Home from "../components/Home";
import * as React from "react";
import * as mobx from "mobx";
import { observer } from "mobx-react";
import { Project, ProjectHolder } from "../model/Project/Project";
import * as fs from "fs-extra";
import * as ncp from "ncp";
import * as Path from "path";
import { remote, OpenDialogOptions, powerMonitor } from "electron";
import CreateProjectDialog from "../components/project/CreateProjectDialog";
const { app } = require("electron").remote;
const { Menu } = require("electron");
import Store = require("electron-store");
import SayLessMenu from "../menu";
import { locate } from "../crossPlatformUtilities";
import "./StartScreen.scss";
import log from "../log";
import ExportDialog from "../components/export/ExportDialog";
const isDev = require("electron-is-dev");

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  showModal: boolean;
  useSampleProject: boolean;
}

@observer
export default class HomePage extends React.Component<IProps, IState> {
  // we wrap the project in a "holder" so that mobx can observe when we change it
  @mobx.observable
  public projectHolder: ProjectHolder;
  private userSettings: Store;
  private menu: SayLessMenu;
  public static homePageForTests: HomePage;

  constructor(props: IProps) {
    super(props);
    this.projectHolder = new ProjectHolder();
    this.state = {
      showModal: false,
      useSampleProject: false //enhance: this is a really ugly way to control this behavior
    };

    this.userSettings = new Store({ name: "saymore-user-settings" });
    let previousDirectory = this.userSettings.get("previousProjectDirectory");
    console.log(
      "************** process.env.startInStartScreen=" +
        process.env.startInStartScreen
    );
    log.info(
      "**************log process.env.startInStartScreen=" +
        process.env.startInStartScreen
    );
    if (process.env.startInStartScreen === "true") {
      previousDirectory = null;
    }
    if (previousDirectory && fs.existsSync(previousDirectory)) {
      const project = Project.fromDirectory(previousDirectory);
      this.projectHolder.setProject(project);
    } else {
      this.projectHolder.setProject(null);
    }

    HomePage.homePageForTests = this;
  }
  public createProject(useSample: boolean) {
    this.setState({ showModal: true, useSampleProject: useSample });
  }

  public goToStartScreenForTests() {
    console.log("********************goToStartScreenForTests()");
    //this.projectHolder.setProject(null);
  }

  public componentWillMount() {
    this.menu = new SayLessMenu(this);
    this.menu.setupContentMenu();
    // do this in case we're just opening to the start screen. Otherwise, we get some confusing default Electron menu
    this.menu.updateMainMenu(undefined, undefined);
  }
  private isRunningFromSource(): boolean {
    return /node_modules[\\/]electron[\\/]/.test(process.execPath);
  }

  public componentDidMount() {
    if (!this.isRunningFromSource()) {
      window.alert(
        "Warning: this version of SayMore Mac not suitable for real use. It probably isn't complete enough to do real work, and that's good because it would probably lose your work anyhow."
      );
    }
    // Save when we're quitting. Review: does this cover shutdown?
    window.addEventListener("beforeunload", e => {
      if (this.projectHolder.project) {
        this.projectHolder.project.saveAllFilesInFolder();
      }
    });

    // Without this timeout, one of: {remote, BrowserWindow, or getFocusedWindow()}, most likely the later,
    // was unavailble sometimes, particularly when running production build via "yarn start" on Windows.
    // So we give it a few seconds and catch the problem if it still fails.
    window.setTimeout(() => {
      try {
        // Save when we lose focus. Review: this might take care of the quitting one, above.
        remote.BrowserWindow.getFocusedWindow()!.on("blur", e => {
          if (this.projectHolder.project) {
            this.projectHolder.project.saveAllFilesInFolder();
          }
        });
        console.log("Successfully set window blur event callback");
      } catch (error) {
        log.error(
          "Error trying to set the window blur event callback: " + error
        );
      }
    }, 3000);
  }
  private handleCreateProjectDialogClose(
    directory: string,
    useSampleProject: boolean
  ) {
    this.setState({ showModal: false });
    if (directory) {
      fs.ensureDirSync(directory);

      if (useSampleProject) {
        const sampleSourceDir = locate("sample data/Edolo sample");
        ncp.ncp(sampleSourceDir, directory, err => {
          console.log("ncp err=" + err);
          const projectName = Path.basename(directory);
          fs.renameSync(
            Path.join(directory, "Edolo sample.sprj"),
            Path.join(directory, projectName + ".sprj")
          );
          this.projectHolder.setProject(Project.fromDirectory(directory));
        });
      } else {
        this.projectHolder.setProject(Project.fromDirectory(directory));
      }
      this.userSettings.set("previousProjectDirectory", directory);
    }
  }
  private listDir(dir: string) {
    fs.readdir(dir, (err, files) => {
      console.log("listing " + dir);
      files.forEach(file => {
        console.log(file);
      });
    });
  }
  public render() {
    let title = this.projectHolder.project
      ? this.projectHolder.project.displayName + " - SayMore Mac"
      : "SayMore Mac";
    title += " " + require("../package.json").version;

    remote.getCurrentWindow().setTitle(title);
    return (
      <div style={{ height: "100%" }}>
        {this.projectHolder.project ? (
          <Home
            project={this.projectHolder.project}
            authorityLists={this.projectHolder.project.authorityLists}
            menu={this.menu}
          />
        ) : (
          <div className={"startScreen"}>
            <div className={"top"}>
              <img src={locate("assets/start-screen/icon.png")} />
              <h1>
                SayMore <span>Mac</span>
              </h1>
            </div>
            <div className={"choices"}>
              <img src={locate("assets/start-screen/create.png")} />
              <a
                className={"creatNewProjectLink"}
                id="creatNewProjectLink"
                onClick={() => this.createProject(false)}
              >
                Create New Project
              </a>
              <br />
              <img src={locate("assets/start-screen/open.png")} />
              <a onClick={() => this.openProject()}>Open SayMore Project</a>
              <br />
              <img src={locate("assets/start-screen/sample.png")} />
              <a
                id="createNewProjectWithSampleDataLink"
                onClick={() => {
                  this.createProject(true);
                }}
              >
                Create New Project with Sample Data
              </a>
            </div>
          </div>
        )}
        {this.state.showModal ? (
          <CreateProjectDialog
            isOpen={this.state.showModal}
            useSampleProject={this.state.useSampleProject}
            callback={(answer, useSampleProject) =>
              this.handleCreateProjectDialogClose(answer, useSampleProject)
            }
          />
        ) : (
          ""
        )}
        <ExportDialog projectHolder={this.projectHolder} />
      </div>
    );
  }

  public openProject() {
    const defaultProjectParentDirectory = Path.join(
      app.getPath("documents"),
      "SayMore"
    );

    const options: OpenDialogOptions = {
      title: "Open Project...",
      defaultPath: defaultProjectParentDirectory,
      //note, we'd like to use openDirectory instead, but in Jan 2018 you can't limit to just folders that
      // look like saymore projects
      properties: ["openFile"],
      filters: [{ name: "SayMore/SayMore Project Files", extensions: ["sprj"] }]
    };
    remote.dialog.showOpenDialog(remote.getCurrentWindow(), options, paths => {
      if (paths) {
        const directory = Path.dirname(paths[0]);
        this.projectHolder.setProject(
          Project.fromDirectory(fs.realpathSync(directory))
        );
        this.userSettings.set("previousProjectDirectory", directory);
      }
    });
  }
}
