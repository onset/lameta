import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { translateChoice } from "../other/localization";
import { SearchContext } from "./SearchContext";
import { css } from "@emotion/react";

export interface IProps {
  includeLabel: boolean;
  field: Field;
}

class ClosedChoiceEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  static contextType = SearchContext;
  constructor(props: IProps) {
    super(props);
  }

  private static onChange(
    event: React.FormEvent<HTMLSelectElement>,
    text: Field
  ) {
    text.text = event.currentTarget.value;
  }

  private static getValue(text: Field): string {
    if (text === undefined) {
      return "Null Text";
    }
    return text.text;
  }

  public render() {
    const label: string = this.props.field.labelInUILanguage;
    const v = ClosedChoiceEdit.getValue(this.props.field);
    const { searchTerm } = (this.context || { searchTerm: "" }) as any;
    const display = translateChoice(v);
    const hasHighlight =
      !!searchTerm && display.toLowerCase().includes(searchTerm);
    return (
      <div
        className={"field " + this.props.className}
        data-has-highlight={hasHighlight ? "true" : undefined}
      >
        {this.props.includeLabel ? <label>{label}</label> : ""}
        <select
          tabIndex={this.props.tabIndex}
          name={this.props.field.definition.englishLabel} //what does name do? Maybe accessibility?
          value={v}
          onChange={(event) => {
            ClosedChoiceEdit.onChange(event, this.props.field);
          }}
          css={hasHighlight ? highlightContainerStyle : undefined}
        >
          {
            //NB: an error about keys here means that the choices were not unique
            this.props.field.choices.map((s) => (
              <option key={s} value={s}>
                {s === "unspecified" ? "" : translateChoice(s)}
              </option>
            ))
          }
        </select>
      </div>
    );
  }
}

export default observer(ClosedChoiceEdit);

const highlightContainerStyle = css`
  background: #ffba8a; // align with inline <mark> highlight color
  padding: 0 1px;
`;
