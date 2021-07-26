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
import * as Path from "path";
import { remote, OpenDialogOptions, ipcRenderer } from "electron";
import CreateProjectDialog from "../components/project/CreateProjectDialog";
const { app } = require("electron").remote;
import userSettings from "../other/UserSettings";

import SayLessMenu from "../other/menu";
import { locate } from "../other/crossPlatformUtilities";
import "./StartScreen.scss";
import log from "../other/log";
import { ExportDialog } from "../components/export/ExportDialog";
import { t, Trans } from "@lingui/macro";
import { i18n } from "../other/localization";
import { analyticsEvent } from "../other/analytics";
import RegistrationDialog from "../components/registration/RegistrationDialog";
import {
  MessageDialog,
  ShowMessageDialog,
} from "../components/ShowMessageDialog/MessageDialog";
import { sentryBreadCrumb } from "../other/errorHandling";
import {
  NotifyError,
  NotifyRenameProblem,
  NotifyWarning,
} from "../components/Notify";
import { PatientFS } from "../other/patientFile";
import { SpreadsheetImportDialog } from "../components/import/SpreadsheetImportDialog";

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

    let expectedProjectDirectory = userSettings.PreviousProjectDirectory;

    const args = remote.getGlobal("arguments");
    // const args = [
    //   "ignore",
    //   "ignore",
    //   "C:/Users/hatto/Documents/laMeta/qq/qq.sprj",
    // ];
    console.log(`args = ${JSON.stringify(args)}`);
    if (args && args.length > 1 && (args[1] as string).endsWith(".sprj")) {
      expectedProjectDirectory = Path.dirname(args[1]);
    }

    // console.log(
    //   "************** process.env.startInStartScreen=" +
    //     process.env.startInStartScreen
    // );
    // log.info(
    //   "**************log process.env.startInStartScreen=" +
    //     process.env.startInStartScreen
    // );
    if (process.env.startInStartScreen === "true") {
      expectedProjectDirectory = null;
    }
    if (expectedProjectDirectory && fs.existsSync(expectedProjectDirectory)) {
      const project = Project.fromDirectory(expectedProjectDirectory);
      this.projectHolder.setProject(project);
    } else {
      this.projectHolder.setProject(null);
    }

    // remember this
    userSettings.PreviousProjectDirectory = expectedProjectDirectory;

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
      ShowMessageDialog({
        title: `Warning`,
        text:
          "This is a beta test version, so make sure you have a backup of your work.",
        width: "300px",
        buttonText: "I understand",
      });
    }

    if (userSettings.HowUsing === "") {
      RegistrationDialog.show();
    }
    // Save when we're quitting. Review: does this cover shutdown?
    window.addEventListener("beforeunload", (e) => {
      if (
        this.projectHolder.project &&
        this.projectHolder.project.saveAllFilesInFolder
      ) {
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
      try {
        if (useSampleProject) {
          const sampleSourceDir = locate("sample data/Edolo sample");
          fs.copySync(sampleSourceDir, directory);
          const projectName = Path.basename(directory);
          const srcPath = Path.join(directory, "Edolo sample.sprj");

          PatientFS.renameSyncWithNotifyAndRethrow(
            srcPath,
            Path.join(directory, projectName + ".sprj")
          );

          this.projectHolder.setProject(Project.fromDirectory(directory));
          analyticsEvent("Create Project", "Create Sample Project");
        } else {
          this.projectHolder.setProject(Project.fromDirectory(directory));
          analyticsEvent("Create Project", "Create Custom Project");
        }
        userSettings.PreviousProjectDirectory = directory;
      } catch (err) {
        NotifyError(
          `lameta had a problem while creating the project at ${directory} (useSampleProject=${useSampleProject}): ${err}`
        );
      }
    }
  }

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
    const v = require("../package.json");
    title += " " + v.version;

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
        <SpreadsheetImportDialog
        //projectHolder={this.projectHolder}
        />
        <MessageDialog />
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
      title: t`Open Project...`,
      defaultPath: defaultProjectParentDirectory,
      //note, we'd like to use openDirectory instead, but in Jan 2018 you can't limit to just folders that
      // look like saymore projects
      properties: ["openFile"],
      filters: [
        {
          name: t`lameta and SayMore Project Files`,
          extensions: ["sprj"],
        },
      ],
    };
    ipcRenderer.invoke("showOpenDialog", options).then((results) => {
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
