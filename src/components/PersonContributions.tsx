import * as React from "react";
import { observer } from "mobx-react";
import { Person } from "../model/Project/Person/Person";
import { Project } from "../model/Project/Project";
import { Contribution } from "../model/file/File";
import ReactTable from "react-table-6";
import { translateRole } from "../other/localization";
import { t } from "@lingui/macro";
import Tooltip from "react-tooltip-lite";
import { HighlightSearchTerm } from "./HighlightSearchTerm";

export interface IProps {
  person: Person;
  project: Project;
}

export const PersonContributions = observer(
  class PersonContributions extends React.Component<IProps> {
    constructor(props: IProps) {
      super(props);
    }

    public render() {
      const columns = [
        {
          id: "name",
          Header: t`Session`,
          width: 300,
          accessor: (row: Contribution) => row.sessionName
        },
        {
          id: "role",
          Header: t`Role`,
          width: 100,
          accessor: (row: Contribution) =>
            row && row.role ? translateRole(row.role) : "",
          Cell: (cellInfo: any) => (
            <HighlightSearchTerm text={cellInfo.value || ""} />
          )
        },
        {
          id: "comments",
          Header: t`Comments`,
          //width: 200,
          accessor: (row: Contribution) => row.comments,
          Cell: (cellInfo: any) => (
            <HighlightSearchTerm text={cellInfo.value || ""} />
          )
        }
      ];
      const rows = this.props.project.getContributionsMatchingPerson(
        this.props.person.getIdToUseForReferences()
      );

      return (
        <Tooltip
          styles={{ display: "inline" }}
          background={"darkblue"}
          color={"white"}
          content={"Changes can only be made from the Sessions tab."}
        >
          <ReactTable
            className={"personContributions"}
            showPagination={false}
            data={rows}
            columns={columns}
            minRows={0}
          />
        </Tooltip>
      );
    }
  }
);
