import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../../model/field/Field";
import { i18n } from "../../../localization";
import { t } from "@lingui/macro";

export interface IProps {
  parentLanguage: Field;
  childLanguage: Field;

  selectedIcon: string;
  notSelectedIcon: string;
}

@observer
export default class ParentButton extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const matching =
      this.props.parentLanguage.text === this.props.childLanguage.text;
    //console.log(`Render StateButton(${this.props.childLanguage.text})`);
    return (
      <button
        type="button"
        style={{
          visibility:
            this.props.childLanguage.text.length === 0 ? "hidden" : "visible"
        }}
        className={"state " + (matching ? " on" : "")}
        title={i18n._(
          t`Indicates that this is the father or mother's primary language.`
        )}
        onClick={() => {
          if (matching) {
            this.props.parentLanguage.setValueFromString("");
          } else {
            this.props.parentLanguage.setValueFromString(
              this.props.childLanguage.text
            );
          }
        }}
      >
        <img
          src={matching ? this.props.selectedIcon : this.props.notSelectedIcon}
        />
      </button>
    );
  }
}
