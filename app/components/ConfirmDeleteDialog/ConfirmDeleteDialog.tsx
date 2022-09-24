// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
import ReactModal from "react-modal";
import "./ConfirmDeleteDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../other/crossPlatformUtilities";
import { Trans } from "@lingui/macro";
import { t } from "@lingui/macro";
import { lameta_orange } from "../../containers/theme";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  isDeleting: boolean;
  descriptionOfWhatWillBeDeleted?: string;
  deleteAction?: () => void;
}

export default class ConfirmDeleteDialog extends React.Component<
  IProps,
  IState
> {
  private static singleton: ConfirmDeleteDialog;

  constructor(props: IProps) {
    super(props);
    this.state = { isOpen: false, isDeleting: false };
    ConfirmDeleteDialog.singleton = this;
  }
  private handleCloseModal(doDelete: boolean) {
    if (
      doDelete &&
      this.state.deleteAction &&
      this.state.descriptionOfWhatWillBeDeleted
    ) {
      const action = this.state.deleteAction;
      this.setState({ isDeleting: true });
      window.setTimeout(() => {
        try {
          action();
          this.setState({
            isDeleting: false,
            isOpen: false,
            deleteAction: () => {},
          });
        } catch (error) {}
      }, 10);
    } else {
      this.setState({
        isDeleting: false,
        isOpen: false,
        deleteAction: () => {},
      });
    }
  }

  public static async show(name: string, deleteAction: () => void) {
    ConfirmDeleteDialog.singleton.setState({
      descriptionOfWhatWillBeDeleted: name,
      isOpen: true,
      deleteAction,
    });
  }
  public render() {
    return (
      <CloseOnEscape
        onEscape={() => {
          this.handleCloseModal(false);
        }}
      >
        <ReactModal
          ariaHideApp={false}
          className="confirmDeleteDialog"
          isOpen={this.state.isOpen}
          shouldCloseOnOverlayClick={true}
          shouldCloseOnEsc={true}
          onRequestClose={() => this.handleCloseModal(false)}
        >
          <div className={"dialogTitle"}>
            <Trans>Confirm Delete</Trans>
          </div>
          <div className="dialogContent">
            <div className="row">
              <img src={locate("assets/trash.png")} />
              <h1>
                <Trans>
                  {this.state.descriptionOfWhatWillBeDeleted} will be moved to
                  the Trash
                </Trans>
              </h1>
            </div>
          </div>
          <div className={"bottomButtonRow"}>
            {this.state.isDeleting ? (
              <span
                css={css`
                  color: ${lameta_orange};
                `}
              >
                {t`Deleting...`}
              </span>
            ) : (
              <div className={"okCancelGroup"}>
                {}
                {}
                <button onClick={() => this.handleCloseModal(false)}>
                  <Trans>Cancel</Trans>
                </button>
                <button
                  id="deleteButton"
                  onClick={() => this.handleCloseModal(true)}
                >
                  <Trans>Delete</Trans>
                </button>
              </div>
            )}
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
