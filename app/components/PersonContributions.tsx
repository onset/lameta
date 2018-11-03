import * as React from "react";
import { observer } from "mobx-react";
import { Person } from "../model/Project/Person/Person";
import { Project } from "../model/Project/Project";
import { Contribution } from "../model/file/File";
import ReactTable from "react-table";

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
        Header: "Name",
        width: 300,
        accessor: (row: Contribution) => row.sessionName
      },
      {
        id: "role",
        Header: "Role",
        width: 100,
        accessor: (row: Contribution) =>
          row ? row.role.toLocaleUpperCase() : ""
      },
      {
        id: "comments",
        Header: "Comments",
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
        style={{ flexGrow: 1 }}
        showPagination={false}
        data={rows}
        columns={columns}
        minRows={0}
      />
    );
  }
}
