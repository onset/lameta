import * as React from "react";
import { observer } from "mobx-react";
import ReactSelectClass, { components } from "react-select";
import { Contribution } from "../model/file/File";
import { translateRole, translateRoleToLanguage } from "../other/localization";
import { titleCase } from "title-case";
import { IChoice } from "../model/field/Field";
import { OptionWithTooltip } from "./OptionWithTooltip";
import { SearchContext } from "./SearchContext";
import { highlightMatches } from "./highlighting";
import Tooltip from "react-tooltip-lite";
import { tooltipBackground } from "../containers/theme";
import { buildTranslationTooltip } from "./TranslationTooltip";
import WarningIcon from "@mui/icons-material/Warning";
import { css } from "@emotion/react";

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
    const roleId = this.props.contribution.role;
    const { content: tooltipContent, hasMissing } = buildTranslationTooltip(
      roleId,
      translateRoleToLanguage
    );
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
          SingleValue: (p: any) => {
            return (
              <components.SingleValue {...p}>
                <span
                  css={css`
                    display: flex;
                    align-items: center;
                    gap: 4px;
                  `}
                >
                  {hasMissing && tooltipContent && (
                    <Tooltip
                      direction="down"
                      content={tooltipContent}
                      background={tooltipBackground}
                      color="white"
                      hoverDelay={300}
                    >
                      <WarningIcon
                        css={css`
                          font-size: 14px;
                          color: #f5a623;
                        `}
                      />
                    </Tooltip>
                  )}
                  {tooltipContent ? (
                    <Tooltip
                      direction="down"
                      content={tooltipContent}
                      background={tooltipBackground}
                      color="white"
                      hoverDelay={300}
                    >
                      <span>{highlightedLabel}</span>
                    </Tooltip>
                  ) : (
                    highlightedLabel
                  )}
                </span>
              </components.SingleValue>
            );
          }
        }}
      />
    );
  }
}

export default observer(RoleChooser);
