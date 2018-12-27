import * as React from "react";
import { observer } from "mobx-react";
import { Person } from "../model/Project/Person/Person";
import { Project } from "../model/Project/Project";
import { Contribution } from "../model/file/File";
import ReactTable from "react-table";
import { i18n } from "../localization";
import { t } from "@lingui/macro";

export interface IProps {
  person: Person;
  project: Project;
}

@observer
export class PersonContributions extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const columns = [
      {
        id: "name",
        Header: i18n._(t`Name`),
        width: 300,
        accessor: (row: Contribution) => row.sessionName
      },
      {
        id: "role",
        Header: i18n._(t`Role`),
        width: 100,
        accessor: (row: Contribution) =>
          row && row.role ? row.role.toLocaleUpperCase() : ""
      },
      {
        id: "comments",
        Header: i18n._(t`Comments`),
        //width: 200,
        accessor: (row: Contribution) => row.comments
      }
    ];
    const rows = this.props.project.getContributionsMatchingPersonName(
      this.props.person
    );

    return (
      <ReactTable
        className={"personContributions"}
        showPagination={false}
        data={rows}
        columns={columns}
        minRows={0}
      />
    );
  }
}
