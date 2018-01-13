import * as React from "react";
import { observer } from "mobx-react";
import { Field, FieldType } from "../model/field/Field";
import { File, Contribution } from "../model/file/File";
import ReactTable from "react-table";
import DatePicker from "react-datepicker";
import { Moment } from "moment";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import RoleChooser from "../RoleChooser";
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

    // this.state = {
    //   selectedContribution: this.props.file.contributions[
    //     this.props.file.contributions.length - 1
    //   ]
    // };
  }
  public componentWillMount() {
    this.ensureOneBlankRow();
  }
  public componentWillReceiveProps(nextProps: IProps) {
    //if <different className=""></different>
    this.ensureOneBlankRow();
  }
  private ensureOneBlankRow() {
    console.log("ensureOnBlankRow(): " + this.props.file.describedFilePath);
    let i = this.props.file.contributions.length;
    while (i--) {
      const c = this.props.file.contributions[i];
      if (!c.name || c.name.length === 0) {
        console.log("removing blank contribution at " + i);
        this.props.file.contributions.splice(i, 1);
      }
    }
    console.log("Adding blank contribution");
    this.props.file.contributions.push(new Contribution());
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
    const m: Moment = contribution[key] ? moment(contribution[key]) : null;
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
    const c = this.props.file.contributions; //.slice(); //make normal array
    const columns = [
      {
        Header: "Name",
        accessor: "name",
        Cell: (cellInfo: any) => this.renderEditableText(cellInfo)
      },
      {
        Header: "Role",
        accessor: "role",
        Cell: (cellInfo: any) => this.renderRole(cellInfo)
      },
      {
        Header: "Date",
        accessor: "date",
        Cell: (cellInfo: any) => this.renderDate(cellInfo)
      },
      {
        Header: "Comments",
        accessor: "comments",
        Cell: (cellInfo: any) => this.renderEditableText(cellInfo)
      }
    ];

    return (
      <ReactTable showPagination={false} data={c} columns={columns} />
      // <ReactTable data={[{name:"one"}]} columns={columns} />
    );
  }
}
