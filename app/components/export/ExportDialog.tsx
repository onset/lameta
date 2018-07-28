import * as React from "react";
import * as ReactModal from "react-modal";
import "./ExportDialog.scss";
import CloseOnEscape from "react-close-on-escape";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
}
export default class ExportDialog extends React.Component<IProps, IState> {
  private static singleton: ExportDialog;

  constructor(props: IProps) {
    super(props);
    ExportDialog.singleton = this;
    this.state = { isOpen: false };
  }

  private handleCloseModal(doSave: boolean) {
    if (doSave) {
      // if (this.homePage.projectHolder.project) {
      //   ImdiGenerator.saveImdiZip(this.homePage.projectHolder.project);
      // } else {
      //   alert("No project");
      // }
    }
    this.setState({ isOpen: false });
  }

  public componetnWillUnMount() {
    console.error("Export Dialog unmounting");
  }
  public static async show() {
    ExportDialog.singleton.setState({
      isOpen: true
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
          className="exportDialog"
          isOpen={this.state.isOpen}
          shouldCloseOnOverlayClick={true}
          ariaHideApp={false}
        >
          <div className={"dialogTitle"}>Export Project</div>
          <div className="dialogContent">
            <div className="foobar">
              <fieldset>
                <legend>Choose an export format:</legend>
                <p>
                  <input type="radio" name="format" value="csv" />{" "}
                  <label>Zip of CSVs</label>
                </p>
                <p>
                  <input type="radio" name="format" value="spreadsheet" />{" "}
                  <label>Spreadsheet</label>
                </p>
                <p>
                  <input type="radio" name="format" value="imdi" />{" "}
                  <label>IMDI</label>
                </p>
              </fieldset>
            </div>
            <div className={"bottomButtonRow"}>
              <button id="helpButton" disabled={true}>
                Help
              </button>
              <button id="okButton" onClick={() => this.handleCloseModal(true)}>
                OK
              </button>
              <button onClick={() => this.handleCloseModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
