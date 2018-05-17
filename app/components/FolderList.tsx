import * as React from "react";
import { default as ReactTable, RowInfo } from "react-table";

import { Folder, IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
// tslint:disable-next-line:no-submodule-imports
import { Field, FieldType, HasConsentField } from "../model/field/Field";
import "./FolderList.scss";
import { locate } from "../crossPlatformUtilities";
const titleCase = require("title-case");

export interface IProps {
  folders: Folder[];
  selectedFolder: IFolderSelection;
  columns: string[];
  columnWidths: number[];
}
@observer
export class FolderList extends React.Component<IProps> {
  private hasConsentPath = locate("assets/hasConsent.png");
  private noConsentPath = locate("assets/noConsent.png");
  constructor(props: IProps) {
    super(props);
  }
  public render() {
    // What this mobxDummy is about:
    // What happens inside the component blueprintjs's cells is invisible to mobx; it doesn't
    // have a way of knowing that these are reliant on the filename of the file.
    // See https://mobx.js.org/best/react.html#mobx-only-tracks-data-accessed-for-observer-components-if-they-are-directly-accessed-by-render
    // However the <Observer> wrapper suggested by that link messes up the display of the table.
    // So for now, we just access every filename right here, while mobx is watching. That's enough to get it to trigger a re-render
    // when the user does something that causes a rename.
    const mobxDummy = this.props.folders.map(f => f.displayName);
    const columns = this.props.columns.map((key, index) => {
      const c: object = {
        id: key,
        width: this.props.columnWidths[index],
        className: key,
        Header:
          this.props.folders.length > 0
            ? this.props.folders[0].properties.getValueOrThrow(key).englishLabel
            : titleCase(key),
        accessor: (f: Folder) => {
          const field = f.properties.getValueOrThrow(key);
          if (field.type === FieldType.Text) {
            return field.toString();
          }
          if (field.type === FieldType.Date) {
            return field.asLocaleDateString();
          }
          if (field.type === FieldType.Function) {
            const consentField = field as HasConsentField;
            if (consentField.hasConsent()) {
              return (
                <img
                  src={this.hasConsentPath}
                  title="Found file with a name containing 'Consent'"
                />
              );
            } else {
              return (
                <img
                  src={this.noConsentPath}
                  title="Found no file with a name containing 'Consent'"
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
          data={this.props.folders.slice()} // slice is needed because this is a mobx observable array. See https://mobx.js.org/refguide/array.html#observable-arrays
          columns={columns}
          getTrProps={(state: any, rowInfo: any, column: any) => {
            //NB: "rowInfo.row" is a subset of things that are mentioned with an accessor. "original" is the original.
            return {
              onClick: (e: any, t: any) => {
                console.log(
                  "row " + JSON.stringify(rowInfo.original.directory)
                );
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
}

export default FolderList;
