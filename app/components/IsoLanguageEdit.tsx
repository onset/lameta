import * as React from "react";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import LanguagePickerDialog from "./LanguagePickerDialog/LanguagePickerDialog";
import "./IsoLanguageEdit.scss";

export interface IProps {
  field: Field;
}

class IsoLanguageEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    console.assert(this.props.field);
    const label = this.props.field.labelInUILanguage;
    return (
      <div className={"field " + this.props.className}>
        <label>{label}</label>
        <a
          className="languageEdit"
          onClick={() => LanguagePickerDialog.show(this.props.field)}
        >
          {this.props.field.text && this.props.field.text.length > 0 ? (
            this.props.field.text
          ) : (
            <Trans>choose...</Trans>
          )}
        </a>
      </div>
    );
  }
}

export default observer(IsoLanguageEdit);
