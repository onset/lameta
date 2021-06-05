import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
import ReactModal from "react-modal";
import "./ConfirmDeleteDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../other/crossPlatformUtilities";
import { Trans } from "@lingui/macro";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  path?: string;
  deleteAction?: (path: string) => void;
}

export default class ConfirmDeleteDialog extends React.Component<
  IProps,
  IState
> {
  private static singleton: ConfirmDeleteDialog;

  constructor(props: IProps) {
    super(props);
    this.state = { isOpen: false };
    ConfirmDeleteDialog.singleton = this;
  }
  private handleCloseModal(doDelete: boolean) {
    if (doDelete && this.state.deleteAction && this.state.path) {
      this.state.deleteAction(this.state.path);
    }
    this.setState({ isOpen: false, deleteAction: () => {} });
  }

  public static async show(path: string, deleteAction: (path: string) => void) {
    const fileName = Path.basename(path);
    ConfirmDeleteDialog.singleton.setState({
      path: fileName,
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
                <Trans>{this.state.path} will be moved to the Trash</Trans>
              </h1>
            </div>
          </div>
          <div className={"bottomButtonRow"}>
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
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
