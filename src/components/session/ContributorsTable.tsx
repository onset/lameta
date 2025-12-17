import * as React from "react";
import { observer } from "mobx-react";
import { File, Contribution } from "../../model/file/File";
import ReactTable from "react-table-6";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import RoleChooser from "../RoleChooser";
import PersonChooser from "./PersonChooser";
import "./ContributorsTable.css";
import { i18n } from "../../other/localization";
import { t } from "@lingui/macro";
import { SearchContext, useHasSearchMatch, useSearchContext } from "../SearchContext";
import { highlightMatches } from "../highlighting";
import { css } from "@emotion/react";
import { searchHighlight } from "../../containers/theme";

// CommentCell extracted outside of ContributorsTable to prevent re-creation on every render
// which was causing focus loss after typing each character
const CommentCell: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => {
  const shouldHighlight = useHasSearchMatch(value);
  const { searchTerm } = useSearchContext();
  return (
    <div
      data-testid="contributor-comment-cell"
      data-has-highlight={shouldHighlight ? "true" : "false"}
      css={
        shouldHighlight
          ? css`
              background: ${searchHighlight};
            `
          : undefined
      }
    >
      <textarea
        data-testid="contributor-comment-textarea"
        onChange={(e) => onChange(e.target.value)}
        value={value}
      />
      {shouldHighlight && (
        <div data-testid="contributor-comment-inline-preview">
          {highlightMatches(value, searchTerm)}
        </div>
      )}
    </div>
  );
};

export interface IProps {
  file: File;
  authorityLists: AuthorityLists;
  selectContribution?: Contribution;
}
interface IState {
  unused: number;
}

class ContributorsTable extends React.Component<IProps> {
  static contextType = SearchContext;
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
    let i = propToUse.file.contributions.length;
    while (i--) {
      const c = propToUse.file.contributions[i];
      const isCompletelyEmpty =
        (!c.personReference || c.personReference.length === 0) &&
        (!c.role || c.role.length === 0) &&
        (!c.comments || c.comments.length === 0);
      if (isCompletelyEmpty) {
        //console.log("removing blank contribution at " + i);
        propToUse.file.contributions.splice(i, 1);
      }
    }
    //console.log("Adding blank contribution");
    propToUse.file.contributions.push(new Contribution("", "", ""));
  }
  private renderPerson(cellInfo: any) {
    const contribution = this.props.file.contributions[cellInfo.index];
    const highlight: boolean =
      this.props.selectContribution !== undefined &&
      contribution.personReference ===
        this.props.selectContribution.personReference;

    return (
      <PersonChooser
        getPeopleNames={this.props.authorityLists.getPeopleNames}
        name={contribution.personReference}
        onChange={(name) => {
          contribution.personReference = name;
          this.props.file.encounteredVocabularyRegistry.encountered(
            "contributor",
            name
          );
          this.ensureOneBlankRow(this.props);
          this.setState({}); // update to show the change
        }}
        highlight={highlight}
      />
    );
  }
  private renderEditableText(cellInfo: any) {
    const contribution = this.props.file.contributions[cellInfo.index];
    const fieldOfThisColumn: keyof Contribution = cellInfo.column.id;
    const cellValue = (contribution[fieldOfThisColumn] as any) || "";

    return (
      <CommentCell
        value={cellValue as string}
        onChange={(v: string) => {
          this.props.file.contributions[cellInfo.index][fieldOfThisColumn] = v;
          this.setState({});
        }}
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
        <img alt="delete" src={"assets/small-trash.png"} />
      </button>
    );
  }

  public render() {
    //review: this seems wrong, having this data model change here in the render method...
    const contributors = this.props.file.contributions;
    const columns = [
      {
        Header: t`Name`,
        accessor: "name",
        Cell: (cellInfo: any) => this.renderPerson(cellInfo)
      },
      {
        Header: t`Role`,
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
        Header: t`Comments`,
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

export default observer(ContributorsTable);
