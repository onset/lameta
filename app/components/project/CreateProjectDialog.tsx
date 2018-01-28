import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
import * as ReactModal from "react-modal";
const { app } = require("electron").remote;

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
      "SayLess",
      this.state.projectName
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
    if (!haveProjectName) {
      projectNameIsViable = false;
    } else if (projectNameIsDuplicate) {
      projectNameIsViable = false;
      message = "There is already a project at: " + this.getChosenPath();
      messageClass = "error";
    } else {
      projectNameIsViable = true;
      message = "Project will be created in: " + this.getChosenPath();
    }

    const title = this.props.useSampleProject
      ? "Create Project Using Sample Data"
      : "Create New Saymore Project";
    return (
      <ReactModal
        ariaHideApp={false}
        className={"createProject"}
        isOpen={this.props.isOpen}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => this.handleCloseModal(false)}
      >
        <div className={"dialogTitle"}>{title}</div>
        <div className={"dialogContent"}>
          <h1>What would you like to call this project?</h1>
          <input
            autoFocus
            onChange={event =>
              this.setState({ projectName: event.target.value })
            }
          />

          <p className={"message " + messageClass}>{message}</p>
          <div className={"buttonRow"}>
            <button
              onClick={() => this.handleCloseModal(true)}
              disabled={!projectNameIsViable}
            >
              OK
            </button>
            <button onClick={() => this.handleCloseModal(false)}>Cancel</button>
          </div>
        </div>
      </ReactModal>
    );
  }
}
