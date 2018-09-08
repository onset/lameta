import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import LanguagePickerDialog from "./LanguagePickerDialog/LanguagePickerDialog";

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
      <div
        className={"field " + this.props.className}
        onClick={() => LanguagePickerDialog.show(this.props.language.form)}
      >
        <label>{this.props.language.englishLabel}</label>
        <div>{this.props.language.form}</div>
      </div>
    );
  }
}
