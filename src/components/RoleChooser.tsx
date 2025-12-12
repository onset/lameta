import * as React from "react";
import { observer } from "mobx-react";
import ReactSelectClass, { components } from "react-select";
import { Contribution } from "../model/file/File";
import { translateRole, translateRoleToLanguage } from "../other/localization";
import { titleCase } from "title-case";
import { IChoice } from "../model/field/Field";
import { OptionWithTooltip } from "./OptionWithTooltip";
import { css } from "@emotion/react";
import { SearchContext } from "./SearchContext";
import { highlightMatches } from "./highlighting";
import { Project } from "../model/Project/Project";
import Tooltip from "react-tooltip-lite";
import { tooltipBackground } from "../containers/theme";

export interface IProps {
  contribution: Contribution;
  choices: IChoice[];
}

// Build tooltip content showing translations in project's metadata language slots
const buildRoleTranslationTooltip = (roleId: string): React.ReactNode => {
  const slots = Project.getMetadataLanguageSlots();
  if (slots.length <= 1 || !roleId) return null;

  const translations: { name: string; text: string }[] = [];
  for (const slot of slots) {
    const translated = translateRoleToLanguage(roleId, slot.tag);
    if (translated) {
      // Use autonym if available, otherwise fall back to name
      const displayName = slot.autonym || slot.name || slot.label;
      translations.push({ name: displayName, text: translated });
    }
  }

  if (translations.length === 0) return null;

  return (
    <div>
      {translations.map((t, i) => (
        <div key={i}>
          <strong>{t.name}:</strong> {t.text}
        </div>
      ))}
    </div>
  );
};

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
    const tooltipContent = buildRoleTranslationTooltip(roleId);
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
              </components.SingleValue>
            );
          }
        }}
      />
    );
  }
}

export default observer(RoleChooser);
