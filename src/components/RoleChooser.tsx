import * as React from "react";
import { observer } from "mobx-react";
import ReactSelectClass, { components } from "react-select";
import { Contribution } from "../model/file/File";
import { translateRole } from "../other/localization";
import { titleCase } from "title-case";
import { IChoice } from "../model/field/Field";
import { OptionWithTooltip } from "./OptionWithTooltip";
import { css } from "@emotion/react";
import { SearchContext } from "./SearchContext";
import { highlightMatches } from "./highlighting";

export interface IProps {
  contribution: Contribution;
  choices: IChoice[];
}

class RoleChooser extends React.Component<IProps> {
  static contextType = SearchContext;
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const choices = this.props.choices ? this.props.choices : [];

    const options = choices.map((c) => {
      const label = translateRole(c.id);
      return {
        value: c.id, // snake case, matching olac-roles.xml
        label,
        title: c.description
      };
    });
    const currentValueWrappedForSelect = {
      value: this.props.contribution.role,
      label: titleCase(translateRole(this.props.contribution.role))
    };
    const searchTerm = (this.context && (this.context as any).searchTerm) || "";
    const labelText = currentValueWrappedForSelect.label || "";
    const highlightedLabel = highlightMatches(labelText, searchTerm);
    return (
      <ReactSelectClass
        name={"select role"}
        value={currentValueWrappedForSelect}
        onChange={(s: any) => {
          this.props.contribution.role = (
            s && s.value ? s.value : ""
          ) as string;
          this.setState({});
        }}
        options={options}
        components={{
          Option: OptionWithTooltip,
          SingleValue: (props: any) => (
            <components.SingleValue {...props}>
              {highlightedLabel}
            </components.SingleValue>
          )
        }}
      />
    );
  }
}

export default observer(RoleChooser);
