import * as React from "react";
import ReactModal from "react-modal";
import "./ExportDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import CsvExporter from "../../export/CsvExporter";
import { Project, ProjectHolder } from "../../model/Project/Project";
import { showInExplorer } from "../../crossPlatformUtilities";
import ImdiGenerator from "../../export/ImdiGenerator";
import { remote } from "electron";
import * as Path from "path";

// tslint:disable-next-line:no-empty-interface
interface IProps {
  projectHolder: ProjectHolder;
}
interface IState {
  isOpen: boolean;
  selectedOption: string;
}
export default class ExportDialog extends React.Component<IProps, IState> {
  private static singleton: ExportDialog;

  constructor(props: IProps) {
    super(props);
    ExportDialog.singleton = this;
    this.state = { isOpen: false, selectedOption: "csv" };
  }

  private handleCloseModal(doSave: boolean) {
    if (doSave) {
      remote.dialog.showSaveDialog(
        {
          title: "Save As",
          //${Path.basename(this.projectHolder.project.directory)}
          defaultPath: `${Path.basename(
            this.props.projectHolder.project!.directory
          )}-${this.state.selectedOption}.zip`,
          filters: [
            {
              extensions: ["zip"],
              name: "ZIP Archive"
            }
          ]
        },
        path => {
          if (path) {
            if (this.state.selectedOption === "csv") {
              const exporter = new CsvExporter(
                this.props.projectHolder.project!
              );
              exporter.makeZipFile(path);
              showInExplorer(path);
            } else {
              ImdiGenerator.saveImdiZip(
                this.props.projectHolder.project!,
                path
              );
            }
            showInExplorer(path);
            this.setState({ isOpen: false });
          }
        }
      );
    } else {
      this.setState({ isOpen: false });
    }
  }

  private handleOptionChange(changeEvent) {
    this.setState({
      selectedOption: changeEvent.target.value
    });
  }

  public static async show() {
    ExportDialog.singleton.setState({
      isOpen: true
    });
  }
  public render() {
    const selectedOption = this.state.selectedOption;
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
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={selectedOption === "csv"}
                  onChange={e => this.handleOptionChange(e)}
                />
                Zip of CSVs
              </label>

              <p>
                A single zip archive that contains one comma-separated file for
                each of Project, Session, and People.
              </p>

              <label>
                <input
                  type="radio"
                  name="format"
                  value="spreadsheet"
                  checked={true}
                  disabled={true}
                />
                Spreadsheet (not implemented yet)
              </label>
              <p>
                A single file with sheets for each of Project, Session, and
                People
              </p>

              <label>
                <input
                  type="radio"
                  name="format"
                  value="imdi"
                  checked={selectedOption === "imdi"}
                  onChange={e => this.handleOptionChange(e)}
                />
                IMDI
              </label>
              <p>
                A single&nbsp;
                <a target="_blank" href="https://tla.mpi.nl/imdi-metadata/">
                  ISLE Meta Data Initiative
                </a>
                &nbsp;XML file.
              </p>
            </fieldset>
          </div>
          <div className={"bottomButtonRow"}>
            {/* List as default last (in the corner), then stylesheet will reverse when used on Windows */}
            <div className={"okCancelGroup"}>
              <button onClick={() => this.handleCloseModal(false)}>
                Cancel
              </button>
              <button id="okButton" onClick={() => this.handleCloseModal(true)}>
                Export
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
