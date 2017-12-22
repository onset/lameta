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
  @observable private mom: ObservableBoolean;

  constructor(props: IProps) {
    super(props);

    intercept(this.mom, "value", change => {
      this.props.motherLanguage.setValueFromString(
        change.newValue ? this.props.language.text : ""
      );
      return change;
    });
  }

  public render() {
    return (
      <div className={"field language " + this.props.language.key}>
        <TextFieldEdit
          className={"language-name"}
          hideLabel={true}
          field={this.props.language}
        />
        <Button value={1}>{"M"}</Button>
        <StateButton on={this.mom}>{"F"}</StateButton>
      </div>
    );
  }
}
