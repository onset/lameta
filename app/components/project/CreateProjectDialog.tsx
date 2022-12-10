// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
const sanitize = require("sanitize-filename");
import "./CreateProjectDialog.scss";
const { app } = require("@electron/remote");
import { t, Trans } from "@lingui/macro";
import {
  DialogBottomButtons,
  DialogButton,
  DialogCancelButton,
  DialogMiddle,
  DialogTitle,
  LametaDialog,
} from "../LametaDialog";

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
    const root = process.env.E2ERoot ?? app.getPath("documents");
    return Path.join(root, "lameta", sanitize(this.state.projectName));
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

      message = t`There is already a project at: ${path}.`;
      messageClass = "error";
    } else {
      projectNameIsViable = true;
      message = t`Project will be created in: ${path}.`;
    }

    const title = this.props.useSampleProject
      ? t`Create Project Using Sample Data`
      : t`Create New lameta Project`;
    return (
      <LametaDialog
        //className={"createProject"}
        open={this.props.isOpen}
        onClose={() => this.handleCloseModal(false)}
        //        onAfterOpen={() => analyticsLocation("Create Project Dialog")}
      >
        <DialogTitle title={title} />
        <DialogMiddle
          css={css`
            width: 400px;
          `}
        >
          <h1
            css={css`
              // because comonDialog.scss is messing us up, can remove once we get rid of it
              margin-bottom: revert !important;
              font-size: 16px;
            `}
          >
            <Trans>What would you like to call this project?</Trans>
          </h1>
          <input
            id="projectNameInput"
            autoFocus
            onChange={(event) =>
              this.setState({ projectName: event.target.value })
            }
            css={css`
              // because comonDialog.scss is messing us up, can remove once we get rid of it
              margin-left: revert !important;
            `}
          />

          <p
            css={css`
              max-width: 100%;
              min-height: 4em; // so that the dialog doesn't grow unnecessarily when this shows something
              overflow-wrap: anywhere;
              color: ${messageClass === "error" ? "red" : "black"};
            `}
          >
            {message}
          </p>
        </DialogMiddle>
        <DialogBottomButtons>
          <DialogButton
            onClick={() => this.handleCloseModal(true)}
            disabled={!projectNameIsViable}
            default={true}
          >
            <Trans>Create</Trans>
          </DialogButton>
          <DialogCancelButton onClick={() => this.handleCloseModal(false)} />
        </DialogBottomButtons>
      </LametaDialog>
    );
  }
}
