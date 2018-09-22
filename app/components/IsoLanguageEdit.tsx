import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import LanguagePickerDialog from "./LanguagePickerDialog/LanguagePickerDialog";
import "./IsoLanguageEdit.scss";

export interface IProps {
  language: Field;
}

// automatically update when the value changes
@observer
export default class IsoLanguageEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <div className={"field " + this.props.className}>
        <label>{this.props.language.englishLabel}</label>
        <a
          className="languageEdit"
          onClick={() => LanguagePickerDialog.show(this.props.language)}
        >
          {this.props.language.text && this.props.language.text.length > 0
            ? this.props.language.text
            : "choose..."}
        </a>
      </div>
    );
  }
}
