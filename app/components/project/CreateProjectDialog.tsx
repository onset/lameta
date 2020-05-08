import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
import ReactModal from "react-modal";
const sanitize = require("sanitize-filename");
import "./CreateProjectDialog.scss";
const { app } = require("electron").remote;
import { t } from "@lingui/macro";
import { i18n } from "../../localization";
import { Trans } from "@lingui/react";
import { analyticsLocation } from "../../analytics";

interface IProps {
  isOpen: boolean;
  callback: (answer: string, useSampleProject: boolean) => void;
  useSampleProject: boolean;
}
interface IState {
  projectName: string;
}

export default class CreateProjectDialog extends React.Component<
  IProps,
  IState
> {
  constructor(props: IProps) {
    super(props);
    this.state = { projectName: "" };
  }
  private handleCloseModal(doCreate: boolean) {
    this.props.callback(
      doCreate ? this.getChosenPath() : "",
      this.props.useSampleProject
    );
  }
  private getChosenPath(): string {
    return Path.join(
      app.getPath("documents"),
      "lameta",
      sanitize(this.state.projectName)
    );
  }

  public render() {
    const haveProjectName = this.state.projectName.length > 0;
    // const projectNameIsViable =
    //   haveProjectName && !fs.existsSync(this.getChosenPath());
    const projectNameIsDuplicate =
      haveProjectName && fs.existsSync(this.getChosenPath());
    let projectNameIsViable: boolean;
    let message = "";
    let messageClass = "black";
    const path = this.getChosenPath();
    if (!haveProjectName) {
      projectNameIsViable = false;
    } else if (projectNameIsDuplicate) {
      projectNameIsViable = false;

      message = i18n._(t`There is already a project at: ${path}.`);
      messageClass = "error";
    } else {
      projectNameIsViable = true;
      message = i18n._(t`Project will be created in: ${path}.`);
    }

    const title = this.props.useSampleProject
      ? i18n._(t`Create Project Using Sample Data`)
      : i18n._(t`Create New lameta Project`);
    return (
      <ReactModal
        ariaHideApp={false}
        className={"createProject"}
        isOpen={this.props.isOpen}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => this.handleCloseModal(false)}
        onAfterOpen={() => analyticsLocation("Create Project Dialog")}
      >
        <div className={"dialogTitle"}>{title}</div>
        <div className={"dialogContent"}>
          <h1>
            <Trans>What would you like to call this project?</Trans>
          </h1>
          <input
            id="projectNameInput"
            autoFocus
            onChange={(event) =>
              this.setState({ projectName: event.target.value })
            }
          />

          <p className={"message " + messageClass}>{message}</p>
        </div>
        <div className="bottomButtonRow">
          <div className="okCancelGroup">
            {/* actual order of these will be platform-specific, controlled by
          app.global.scss */}
            <button onClick={() => this.handleCloseModal(false)}>
              <Trans>Cancel</Trans>
            </button>
            <button
              id="okButton"
              onClick={() => this.handleCloseModal(true)}
              disabled={!projectNameIsViable}
            >
              <Trans>OK</Trans>
            </button>
          </div>
        </div>
      </ReactModal>
    );
  }
}
