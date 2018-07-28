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

  public componentWillUnMount() {
    console.error("Export Dialog unmounting.");
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
          onRequestClose={() => this.handleCloseModal(false)}
          ariaHideApp={false}
        >
          <div className={"dialogTitle "}>Export Project</div>
          <div className="dialogContent">
            <fieldset>
              <legend>Choose an export format:</legend>
              <label>
                <input type="radio" name="format" value="csv" />
                Zip of CSVs
              </label>

              <p>
                A single zip archive that contains one comma-separated file for
                each of Project, Session, and People.
              </p>
              <label>
                <input type="radio" name="format" value="spreadsheet" />{" "}
                Spreadsheet
              </label>
              <p>
                A single file with sheets for each of Project, Session, and
                People
              </p>
              <label>
                <input type="radio" name="format" value="imdi" /> IMDI
              </label>
              <p>
                An single&nbsp;
                <a target="_blank" href="https://tla.mpi.nl/imdi-metadata/">
                  ISLE Meta Data Initiative
                </a>
                &nbsp;XML file.
              </p>
            </fieldset>
            <div className={"bottomButtonRow"}>
              {/* List as default last (in the corner), then stylesheet will reverse when used on Windows */}
              <div className={"okCancelGroup"}>
                <button onClick={() => this.handleCloseModal(false)}>
                  Cancel
                </button>
                <button
                  id="okButton"
                  onClick={() => this.handleCloseModal(true)}
                >
                  Export
                </button>
              </div>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
