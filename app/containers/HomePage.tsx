// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import Workspace from "../components/Workspace";
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
import userSettings from "../UserSettings";

import SayLessMenu from "../menu";
import { locate } from "../crossPlatformUtilities";
import "./StartScreen.scss";
import log from "../log";
import { ExportDialog } from "../components/export/ExportDialog";
import { Trans } from "@lingui/react";
import { t } from "@lingui/macro";
import { i18n } from "../localization";
import { analyticsEvent } from "../analytics";
import RegistrationDialog from "../components/registration/RegistrationDialog";
import {
  AlertDialog,
  ShowAlertDialog,
} from "../components/AlertDialog/AlertDialog";
import { sentryBreadCrumb } from "../errorHandling";

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

  private menu: SayLessMenu;
  public static homePageForTests: HomePage;

  constructor(props: IProps) {
    super(props);
    this.projectHolder = new ProjectHolder();
    this.state = {
      showModal: false,
      useSampleProject: false, //enhance: this is a really ugly way to control this behavior
    };

    let previousDirectory = userSettings.PreviousProjectDirectory;
    // console.log(
    //   "************** process.env.startInStartScreen=" +
    //     process.env.startInStartScreen
    // );
    // log.info(
    //   "**************log process.env.startInStartScreen=" +
    //     process.env.startInStartScreen
    // );
    if (process.env.startInStartScreen === "true") {
      previousDirectory = null;
    }
    if (previousDirectory && fs.existsSync(previousDirectory)) {
      const project = Project.fromDirectory(previousDirectory);
      this.projectHolder.setProject(project);
    } else {
      this.projectHolder.setProject(null);
    }

    this.updateMenu();
    HomePage.homePageForTests = this;
  }
  public createProject(useSample: boolean) {
    this.setState({ showModal: true, useSampleProject: useSample });
  }

  public goToStartScreenForTests() {
    //this.projectHolder.setProject(null);
  }

  public componentDidUpdate() {
    this.updateMenu();
  }
  private updateMenu() {
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
      ShowAlertDialog({
        title: `Warning: this is a beta test version, so make sure you have a backup of your work.`,
        text: "",
        buttonText: "I understand",
      });
    }

    if (userSettings.HowUsing === "") {
      RegistrationDialog.show();
    }
    // Save when we're quitting. Review: does this cover shutdown?
    window.addEventListener("beforeunload", (e) => {
      if (this.projectHolder.project) {
        this.projectHolder.project.saveAllFilesInFolder();
      }
    });

    // Without this timeout, one of: {remote, BrowserWindow, or getFocusedWindow()}, most likely the later,
    // was unavailable sometimes, particularly when running production build via "yarn start" on Windows.
    // So we give it a few seconds and catch the problem if it still fails.
    window.setTimeout(() => {
      try {
        // Save when we lose focus. Review: this might take care of the quitting one, above.
        remote.BrowserWindow.getFocusedWindow()!.on("blur", (e) => {
          if (this.projectHolder.project) {
            this.projectHolder.project.saveAllFilesInFolder();
          }
        });
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
        ncp.ncp(sampleSourceDir, directory, (err) => {
          console.log("ncp err=" + err);
          const projectName = Path.basename(directory);
          fs.renameSync(
            Path.join(directory, "Edolo sample.sprj"),
            Path.join(directory, projectName + ".sprj")
          );
          this.projectHolder.setProject(Project.fromDirectory(directory));
        });
        analyticsEvent("Create Project", "Create Sample Project");
      } else {
        this.projectHolder.setProject(Project.fromDirectory(directory));
        analyticsEvent("Create Project", "Create Custom Project");
      }
      userSettings.PreviousProjectDirectory = directory;
    }
  }
  // private listDir(dir: string) {
  //   fs.readdir(dir, (err, files) => {
  //     console.log("listing " + dir);
  //     files.forEach(file => {
  //       console.log(file);
  //     });
  //   });
  // }
  public render() {
    // enhance: make this error com up in an Alert Dialog. I think doing that will be easier to reason about when
    // this has been converted to modern react with hooks.
    if (this.projectHolder.project?.loadingError) {
      return (
        <h1
          css={css`
            padding: 50px;
          `}
        >
          {this.projectHolder.project.loadingError}
        </h1>
      );
    }

    let title = this.projectHolder.project
      ? `${Path.basename(this.projectHolder.project.directory)}/ ${
          this.projectHolder.project.displayName
        }  - lameta`
      : "lameta";
    title += " " + require("../package.json").version + " Beta";

    remote.getCurrentWindow().setTitle(title);
    return (
      <div style={{ height: "100%" }}>
        {(this.projectHolder.project && (
          <Workspace
            project={this.projectHolder.project}
            authorityLists={this.projectHolder.project.authorityLists}
            menu={this.menu}
          />
        )) || (
          <div className={"startScreen"}>
            <div className={"core"}>
              <div className={"top"}>
                <img src={locate("assets/start-screen/wordmark.png")} />
              </div>
              <div className={"choices"}>
                <img src={locate("assets/start-screen/create.png")} />
                <a
                  className={"creatNewProjectLink"}
                  id="creatNewProjectLink"
                  onClick={() => this.createProject(false)}
                >
                  <Trans>Create New Project</Trans>
                </a>
                <br />
                <img src={locate("assets/start-screen/open.png")} />
                <a onClick={() => this.openProject()}>
                  <Trans>Open Project</Trans>
                </a>
                <br />
                <img src={locate("assets/start-screen/sample.png")} />
                <a
                  id="createNewProjectWithSampleDataLink"
                  onClick={() => {
                    this.createProject(true);
                  }}
                >
                  <Trans>Create New Project with Sample Data</Trans>
                </a>
              </div>
              {/* <p className="description">
                SayMore<sub>X</sub> is a cross-platform rewrite of SayMore. At
                this point, SayMore<sub>X</sub> lacks the BOLD (Basic Oral
                Language Documentation) features of the original SayMore.
              </p> */}
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
        <AlertDialog />
      </div>
    );
  }

  public openProject() {
    const defaultProjectParentDirectory = Path.join(
      app.getPath("documents"),
      "lameta" // we don't translate this
    );
    sentryBreadCrumb("open project dialog");
    const options: OpenDialogOptions = {
      title: i18n._(t`Open Project...`),
      defaultPath: defaultProjectParentDirectory,
      //note, we'd like to use openDirectory instead, but in Jan 2018 you can't limit to just folders that
      // look like saymore projects
      properties: ["openFile"],
      filters: [
        {
          name: i18n._(t`lameta and SayMore Project Files`),
          extensions: ["sprj"],
        },
      ],
    };
    remote.dialog
      .showOpenDialog(remote.getCurrentWindow(), options)
      .then((results) => {
        sentryBreadCrumb("processing callback of open project dialog");
        if (
          results &&
          results!.filePaths &&
          results.filePaths!.length > 0 &&
          results.filePaths![0].length > 0
        ) {
          const directory = Path.dirname(results.filePaths[0]);
          this.projectHolder.setProject(
            Project.fromDirectory(fs.realpathSync(directory))
          );
          userSettings.PreviousProjectDirectory = directory;
        }
      });
  }
}
