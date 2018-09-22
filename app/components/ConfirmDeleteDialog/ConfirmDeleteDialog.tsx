import * as React from "react";
import * as fs from "fs";
import * as Path from "path";
import ReactModal from "react-modal";
import "./ConfirmDeleteDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../crossPlatformUtilities";

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
      deleteAction
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
          onRequestClose={() => this.handleCloseModal(false)}
        >
          <div className={"dialogTitle"}>Confirm Delete</div>
          <div className="dialogContent">
            <div className="row">
              <img src={locate("assets/trash.png")} />
              <h1>{`${this.state.path} will be moved to the Trash`}</h1>
            </div>{" "}
          </div>
          <div className={"bottomButtonRow"}>
            <div className={"okCancelGroup"}>
              {/* List as default last (in the corner). */}
              {/* The actual order of these will be platform-specific, controlled by
          a flex-direction rule in app.global.scss because this is has class okCancelButtonRow*/}
              <button onClick={() => this.handleCloseModal(false)}>
                Cancel
              </button>
              <button
                id="deleteButton"
                onClick={() => this.handleCloseModal(true)}
              >
                Delete
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
