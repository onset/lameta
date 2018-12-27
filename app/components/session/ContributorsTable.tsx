import * as React from "react";
import { observer } from "mobx-react";
import { Field, FieldType } from "../../model/field/Field";
import { File, Contribution } from "../../model/file/File";
import ReactTable from "react-table";
import DatePicker from "react-datepicker";
import { Moment } from "moment";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import RoleChooser from "../../RoleChooser";
import PersonChooser from "./PersonChooser";
import "./ContributorsTable.scss";
import { i18n } from "../../localization";
import { t } from "@lingui/macro";
const moment = require("moment");

export interface IProps {
  // contributions: Contribution[];
  file: File;
  authorityLists: AuthorityLists;
}
interface IState {
  unused: number;
}
@observer
export default class ContributorsTable extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
  }
  public componentWillMount() {
    this.ensureOneBlankRow(this.props);
  }
  public componentWillReceiveProps(nextProps: IProps) {
    //if <different className=""></different>
    this.ensureOneBlankRow(nextProps);
  }
  private ensureOneBlankRow(propToUse: IProps) {
    console.log("ensureOnBlankRow(): " + propToUse.file.describedFilePath);
    let i = propToUse.file.contributions.length;
    while (i--) {
      const c = propToUse.file.contributions[i];
      if (!c.name || c.name.length === 0) {
        //console.log("removing blank contribution at " + i);
        propToUse.file.contributions.splice(i, 1);
      }
    }
    //console.log("Adding blank contribution");
    propToUse.file.contributions.push(new Contribution("", "", "", ""));
  }
  private renderPerson(cellInfo: any) {
    const contribution = this.props.file.contributions[cellInfo.index];
    const key: keyof Contribution = cellInfo.column.id;
    return (
      <PersonChooser
        getPeopleNames={this.props.authorityLists.getPeopleNames}
        name={contribution.name}
        onChange={name => {
          console.log("name:" + name);
          contribution.name = name;
          this.ensureOneBlankRow(this.props);
          this.setState({}); // update to show the change
        }}
      />
    );
  }
  private renderEditableText(cellInfo: any) {
    const contribution = this.props.file.contributions[cellInfo.index];
    const key: keyof Contribution = cellInfo.column.id;
    return (
      <textarea
        onChange={e => {
          this.props.file.contributions[cellInfo.index][key] = e.target.value;
          this.setState({}); //review: having to do this, to get an update, usually means something isn't wired right with mobx
        }}
        value={contribution[key]}
      />
    );
  }
  private renderRole(cellInfo: any) {
    const contribution = this.props.file.contributions[cellInfo.index];
    const key: keyof Contribution = cellInfo.column.id;
    return (
      <RoleChooser
        contribution={contribution}
        choices={this.props.authorityLists.roleChoices}
      />
    );
  }

  private renderDate(cellInfo: any) {
    const contribution = this.props.file.contributions[cellInfo.index];
    const key: keyof Contribution = cellInfo.column.id;
    const m: Moment = contribution[key] ? moment(contribution[key]) : null;
    return (
      <DatePicker
        selected={m}
        onChange={newDate => {
          if (newDate != null) {
            contribution[key] = newDate.toISOString();
            this.setState({}); //review: having to do this, to get an update, usually means something isn't wired right with mobx
          }
        }}
      />
    );
  }

  public render() {
    //review: this seems wrong, having this data model change here in the render method...
    const contributors = this.props.file.contributions;
    const columns = [
      {
        Header: i18n._(t`Name`),
        accessor: "name",
        Cell: (cellInfo: any) => this.renderPerson(cellInfo)
      },
      {
        Header: i18n._(t`Role`),
        accessor: "role",
        Cell: (cellInfo: any) => this.renderRole(cellInfo)
      },
      /* the most recent SayMore Classic doesn't include a date, and I agree with that
      {
        Header: i18n._(t`Date`),
        accessor: "date",
        Cell: (cellInfo: any) => this.renderDate(cellInfo)
      },*/
      {
        Header: i18n._(t`Comments`),
        accessor: "comments",
        Cell: (cellInfo: any) => this.renderEditableText(cellInfo)
      }
    ];

    return (
      <ReactTable
        className={"contributors"}
        showPagination={false}
        data={contributors}
        columns={columns}
        minRows={0} // don't show empty rows
      />
    );
  }
}
