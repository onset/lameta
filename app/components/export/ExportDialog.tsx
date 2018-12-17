import * as React from "react";
import ReactModal from "react-modal";
import "./ExportDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import CsvExporter from "../../export/CsvExporter";
import { ProjectHolder } from "../../model/Project/Project";
import { showInExplorer } from "../../crossPlatformUtilities";
import ImdiGenerator from "../../export/ImdiGenerator";
import { remote } from "electron";
import * as Path from "path";
import { Trans } from "@lingui/react";
import { t } from "@lingui/macro";
import { i18n } from "../../l10nUtils";

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
          title: i18n._(t`Save As`),
          //${Path.basename(this.projectHolder.project.directory)}
          defaultPath: `${Path.basename(
            this.props.projectHolder.project!.directory
          )}-${this.state.selectedOption}.zip`,
          filters: [
            {
              extensions: ["zip"],
              name: i18n._(t`ZIP Archive`)
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
          <div className={"dialogTitle "}>
            <Trans>Export Project</Trans>
          </div>
          <div className="dialogContent">
            <fieldset>
              <legend>
                <Trans>Choose an export format:</Trans>
              </legend>
              <label>
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={selectedOption === "csv"}
                  onChange={e => this.handleOptionChange(e)}
                />
                <Trans>Zip of CSVs</Trans>
              </label>

              <p>
                <Trans>
                  A single zip archive that contains one comma-separated file
                  for each of Project, Session, and People.
                </Trans>
              </p>

              {/* <label>
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
              </p> */}

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
                <Trans>A single ISLE Meta Data Initiative XML file.</Trans>
              </p>
            </fieldset>
          </div>
          <div className={"bottomButtonRow"}>
            {/* List as default last (in the corner), then stylesheet will reverse when used on Windows */}
            <div className={"okCancelGroup"}>
              <button onClick={() => this.handleCloseModal(false)}>
                <Trans>Cancel</Trans>
              </button>
              <button id="okButton" onClick={() => this.handleCloseModal(true)}>
                <Trans>Export</Trans>
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
