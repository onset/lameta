import * as React from "react";
import { observer } from "mobx-react";
import { File, Contribution } from "../../model/file/File";
import ReactTable from "react-table";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import RoleChooser from "../../RoleChooser";
import PersonChooser from "./PersonChooser";
import "./ContributorsTable.scss";
import { i18n } from "../../localization";
import { t } from "@lingui/macro";

export interface IProps {
  file: File;
  authorityLists: AuthorityLists;
  selectContribution?: Contribution;
}
interface IState {
  unused: number;
}
@observer
export default class ContributorsTable extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
  }
  public UNSAFE_componentWillMount() {
    this.ensureOneBlankRow(this.props);
  }
  public UNSAFE_componentWillReceiveProps(nextProps: IProps) {
    //if <different className=""></different>
    this.ensureOneBlankRow(nextProps);
  }
  private ensureOneBlankRow(propToUse: IProps) {
    console.log("ensureOnBlankRow(): " + propToUse.file.describedFilePath);
    let i = propToUse.file.contributions.length;
    while (i--) {
      const c = propToUse.file.contributions[i];
      if (!c.personReference || c.personReference.length === 0) {
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

    const highlight: boolean =
      this.props.selectContribution !== undefined &&
      contribution.personReference ===
        this.props.selectContribution.personReference;

    return (
      <PersonChooser
        getPeopleNames={this.props.authorityLists.getPeopleNames}
        name={contribution.personReference}
        onChange={name => {
          contribution.personReference = name;
          this.ensureOneBlankRow(this.props);
          this.setState({}); // update to show the change
        }}
        highlight={highlight}
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
    return (
      <RoleChooser
        contribution={contribution}
        choices={this.props.authorityLists.roleChoices}
      />
    );
  }
  private renderDeleteButton(cellInfo: any) {
    // don't provide a delete on the intentionally blank row
    if (cellInfo.index === this.props.file.contributions.length - 1) {
      return null;
    }
    return (
      <button
        className="deleteButton"
        onClick={() => {
          this.props.file.removeContribution(cellInfo.index);
          this.setState({}); // update to show the change
        }}
      >
        <img alt="delete" src={require(`../../img/trash.png`)} />
      </button>
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
      },
      {
        //Header: i18n._(t`Comments`),
        maxWidth: 40,
        accessor: "delete",
        Cell: (cellInfo: any) => this.renderDeleteButton(cellInfo)
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
