import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import TextFieldEdit from "./../TextFieldEdit";
import { Button } from "@blueprintjs/core";
import { observable, intercept } from "mobx";
import StateButton, { ObservableBoolean } from "./StateButton";

export interface IProps {
  language: Field;
  fatherLanguage: Field;
  motherLanguage: Field;
}

@observer
export default class LanguageEdit extends React.Component<IProps> {
  @observable private mother: ObservableBoolean;
  @observable private father: ObservableBoolean;

  constructor(props: IProps) {
    super(props);
    this.mother = this.wireParent(this.props.motherLanguage);
    this.father = this.wireParent(this.props.fatherLanguage);
  }

  private wireParent(parentLanguageField: Field) {
    const parent = new ObservableBoolean();
    parent.value = parentLanguageField.text === this.props.language.text;
    intercept(parent, change => {
      parentLanguageField.setValueFromString(
        change.newValue ? this.props.language.text : ""
      );
      return change;
    });
    return parent;
  }

  public render() {
    return (
      <div className={"field language " + this.props.language.key}>
        <TextFieldEdit
          className={"language-name"}
          hideLabel={true}
          field={this.props.language}
        />
        <StateButton on={this.father}>{"F"}</StateButton>
        <StateButton on={this.mother}>{"M"}</StateButton>
      </div>
    );
  }
}
