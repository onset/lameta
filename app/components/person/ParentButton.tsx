import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import TextFieldEdit from "../TextFieldEdit";

export interface IProps {
  parentLanguage: Field;
  childLanguage: Field;
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
          visibility: this.props.childLanguage.text.length === 0 ? "hidden" : ""
        }}
        className={"state " + (matching ? " on" : "")}
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
        {this.props.children}
      </button>
    );
  }
}
