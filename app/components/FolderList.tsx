import * as React from "react";
import { default as ReactTable, Resize } from "react-table";

import { Folder, IFolderSelection } from "../model/Folder";
import * as mobxReact from "mobx-react";
import * as mobx from "mobx";
// tslint:disable-next-line:no-submodule-imports
import { Field, FieldType, HasConsentField } from "../model/field/Field";
import "./FolderList.scss";
import { locate } from "../crossPlatformUtilities";
import { ReactTableColumnWidthManager } from "./ReactTableColumnWidthManager";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { i18n } from "../l10nUtils";
import { t } from "@lingui/macro";
const titleCase = require("title-case");

export interface IProps {
  nameForPersistingUsersTableConfiguration: string;
  folders: Folder[];
  selectedFolder: IFolderSelection;
  columns: string[];
  columnWidths: number[];
}
@mobxReact.observer
export class FolderList extends React.Component<IProps> {
  private hasConsentPath = locate("assets/hasConsent.png");
  private noConsentPath = locate("assets/noConsent.png");
  private columnWidthManager: ReactTableColumnWidthManager;
  constructor(props: IProps) {
    super(props);
    this.columnWidthManager = new ReactTableColumnWidthManager(
      this.props.nameForPersistingUsersTableConfiguration + ".columnWidths",
      this.props.columns,
      this.props.columnWidths
    );
  }

  public render() {
    // Because the class has the mobxReact.observer decorator, mobx is watching the render function.
    // But what happens inside the table's cells is invisible to mobx; it doesn't
    // have a way of knowing that these are reliant on the filename of the file.
    // See https://mobx.js.org/best/react.html#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    // However the <Observer> wrapper suggested by that link messes up the display of the table.
    this.props.folders.map(folder => {
      // Access every filename right here, while mobx is watching. That's enough to get it to trigger a re-render
      // when the user does something that causes a rename.
      const dummy = folder.displayName;
      if (folder instanceof Session) {
        const dummyId = folder.properties.getTextStringOrEmpty("id");
      }

      // Similarly, the Person consent mark is derived from having some child file that has the word "Consent" in the file name.
      // We explicitly do something with each file name, so that mobx will know it should re-run the render function
      // as needed.
      if (folder instanceof Person) {
        folder.files.forEach(child => child.describedFilePath);
      }
      // The Session status also needs to be immediately updated in the table view.
      if (folder instanceof Session) {
        folder.metadataFile!.getTextProperty("status");
      }
    });

    const columns = this.props.columns.map((key, index) => {
      const c: object = {
        id: key,
        width: this.columnWidthManager.columnWidths[key],
        className: key,
        Header:
          this.props.folders.length > 0
            ? this.props.folders[0].properties.getValueOrThrow(key)
                .labelInUILanguage
            : titleCase(key),
        accessor: (f: Folder) => {
          const field = f.properties.getValueOrThrow(key);
          if (field.type === FieldType.Text) {
            if (field.key === "status") {
              return (
                <img title={field.text} src={this.getStatusIcon(field.text)} />
              );
            } else {
              return field.toString();
            }
          }
          if (field.type === FieldType.Date) {
            return field.asDateDisplayString();
          }
          if (field.type === FieldType.Function) {
            const consentField = field as HasConsentField;
            if (consentField.hasConsent()) {
              return (
                <img
                  src={this.hasConsentPath}
                  title={i18n._(t`Found file with a name containing 'Consent'`)}
                />
              );
            } else {
              return (
                <img
                  src={this.noConsentPath}
                  title={i18n._(
                    t`Found no file with a name containing 'Consent'`
                  )}
                />
              );
            }
          }
          return "ERROR";
        }
      };
      return c;
    });

    return (
      <div className={"folderList"}>
        <ReactTable
          showPagination={false}
          data={this.props.folders}
          columns={columns}
          onResizedChange={(resizedState: Resize[]) =>
            this.columnWidthManager.handleResizedChange(resizedState)
          }
          pageSize={this.props.folders.length} // show all rows. Watch https://github.com/react-tools/react-table/issues/1054 for a better way someday?
          getTrProps={(state: any, rowInfo: any, column: any) => {
            //NB: "rowInfo.row" is a subset of things that are mentioned with an accessor. "original" is the original.
            return {
              onClick: (e: any, x: any) => {
                // console.log(
                //   "row " + JSON.stringify(rowInfo.original.directory)
                // );
                this.props.selectedFolder.index = rowInfo.index;
                this.setState({}); // trigger re-render so that the following style: takes effect
              },
              className:
                rowInfo && rowInfo.index === this.props.selectedFolder.index
                  ? "selected"
                  : ""
            };
          }}
        />
      </div>
    );
  }

  private getStatusIcon(status: string) {
    try {
      return require(`../img/status-${status}.png`);
    } catch (e) {
      // there is some status this version doesn't understand
      return require(`../img/Warning.png`);
    }
  }
}

export default FolderList;
