// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import { default as ReactTable, Resize } from "react-table-6";

import { Folder, IFolderSelection } from "../model/Folder/Folder";
import * as mobxReact from "mobx-react";
import * as mobx from "mobx";
// tslint:disable-next-line:no-submodule-imports
import { FieldType, HasConsentField } from "../model/field/Field";
import "./FolderList.scss";
import { locate } from "../other/crossPlatformUtilities";
import { ReactTableColumnWidthManager } from "./ReactTableColumnWidthManager";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { i18n } from "../other/localization";
import { t } from "@lingui/macro";
import scrollSelectedIntoView from "./FixReactTableScroll";

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
    // it's important that we access this at this level so that mobx will know to re-render us when this changes.
    const selectedFolderIndex = this.props.selectedFolder.index;

    // Because the class has the mobxReact.observer decorator, mobx is watching the render function.
    // But what happens inside the table's cells is invisible to mobx; it doesn't
    // have a way of knowing that these are reliant on the filename of the file.
    // See https://mobx.js.org/best/react.html#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    // However the <Observer> wrapper suggested by that link messes up the display of the table.
    this.props.folders.map((folder) => {
      // Access every filename right here, while mobx is watching. That's enough to get it to trigger a re-render
      // when the user does something that causes a rename.
      const dummy = folder.displayName;
      if (folder instanceof Session) {
        const dummyId = folder.properties.getTextStringOrEmpty("id");
        const dummyChecked = folder.marked;
      }

      // Similarly, the Person consent mark is derived from having some child file that has the word "Consent" in the file name.
      // We explicitly do something with each file name, so that mobx will know it should re-run the render function
      // as needed.
      if (folder instanceof Person) {
        folder.files.forEach(
          (child) => child.pathInFolderToLinkFileOrLocalCopy
        );
      }
      // The Session status also needs to be immediately updated in the table view.
      if (folder instanceof Session) {
        folder.metadataFile!.getTextProperty("status");
      }
    });

    const columns = this.props.columns.map((key, index) => {
      const header =
        key === "checked" ? (
          <input
            title={t`Mark for Deletion or Export`}
            type="checkbox"
            // css={css`
            //   accent-color: orange; // not yet
            // `}
            onChange={(e) => {
              e.stopPropagation(); // don't select the folder of row
              this.props.folders.forEach((f) => {
                f.marked = e.target.checked;
              });
            }}
          /> // Don't give a header for the checkbox column
        ) : this.props.folders.length > 0 ? (
          this.props.folders[0].properties.getValueOrThrow(key)
            .labelInUILanguage
        ) : (
          // Enhance: This is a design flaw. If we don't have any items in the folder list, then the above
          // cannot ask one of them for the labelInUiLanguage.
          // titleCase(key)
          key
            .replace(/([A-Z])/g, (match) => ` ${match}`)
            .replace(/^./, (match) => match.toUpperCase())
            .trim()
            .replace("Id", "ID")
            .replace("Display Name", "Person")
        );

      const c: object = {
        id: key,
        width:
          key === "checked"
            ? 30 /*checkbox... has to be wide enough that the column resize things don't interfere */
            : this.columnWidthManager.columnWidths[key],
        className: key,
        Header: header,
        accessor: (f: Folder) => {
          // checked is a special case because it isn't actually a field on some file, just a property on the folder.
          if (key === "checked") {
            return (
              <input
                type="checkbox"
                title={t`Mark for Export`}
                checked={f.marked}
                onChange={(e) => {
                  e.stopPropagation(); // don't select the folder of row
                  //(field as SelectionField).toggle();
                  f.marked = !f.marked;
                }}
              />
            );
          }
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
            return field.asISODateString();
          }

          if (field instanceof HasConsentField) {
            const consentField = field as HasConsentField;
            if (consentField.hasConsent()) {
              return (
                <img
                  src={this.hasConsentPath}
                  title={t`Found file with a name containing 'Consent'`}
                />
              );
            } else {
              return (
                <img
                  src={this.noConsentPath}
                  title={t`Found no file with a name containing 'Consent'`}
                />
              );
            }
          }

          if (field.type === FieldType.Function) {
            return field.text;
          }
          return "ERROR";
        },
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
          onFetchData={() => scrollSelectedIntoView("folderList")}
          pageSize={this.props.folders.length} // show all rows. Watch https://github.com/react-tools/react-table/issues/1054 for a better way someday?
          getTrProps={(state: any, rowInfo: any, column: any) => {
            //NB: "rowInfo.row" is a subset of things that are mentioned with an accessor. "original" is the original.
            return {
              onClick: (e: any, x: any) => {
                // console.log(
                //   "row " + JSON.stringify(rowInfo.original.directory)
                // );
                if (this.props.selectedFolder && selectedFolderIndex > -1) {
                  this.props.folders[
                    selectedFolderIndex
                  ].saveAllFilesInFolder();
                }
                this.props.selectedFolder.index = rowInfo.index;
                this.setState({}); // trigger re-render so that the following style: takes effect
              },
              className:
                rowInfo && rowInfo.index === selectedFolderIndex
                  ? "selected"
                  : "",
            };
          }}
        />
      </div>
    );
  }

  private getStatusIcon(status: string) {
    try {
      return locate(`assets/status-${status}.png`);
    } catch (e) {
      // there is some status this version doesn't understand
      return locate("assets/warning.png");
    }
  }
}

export default FolderList;
