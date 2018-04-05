import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../../model/field/Field";
import TextFieldEdit from "./../../TextFieldEdit";
import { Button } from "@blueprintjs/core";
import { observable, intercept } from "mobx";
import ParentButton from "./ParentButton";

export interface IProps {
  language: Field;
  fatherLanguage: Field;
  motherLanguage: Field;
  //changed?: () => void;
}

@observer
export default class LanguageEdit extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
    // this.mothersLanguage = this.wireParent(this.props.motherLanguage);
    // this.fathersLanguage = this.wireParent(this.props.fatherLanguage);
  }

  // private wireParent(parentLanguageField: Field) {
  //   parent.value = parentLanguageField.text === this.props.language.text;
  //   intercept(parent, change => {
  //     console.log("------------- " + change.newValue);
  //     parentLanguageField.setValueFromString(
  //       change.newValue ? this.props.language.text : ""
  //     );
  //     if (this.props.changed) {
  //       this.props.changed();
  //     }
  //     return change;
  //   });
  //   return parent;
  // }

  public render() {
    //console.log("Render languageEdit:" + this.props.language.key);
    return (
      <div className={"field language " + this.props.language.key}>
        <TextFieldEdit
          className={"language-name"}
          hideLabel={true}
          field={this.props.language}
        />
        <ParentButton
          childLanguage={this.props.language}
          parentLanguage={this.props.fatherLanguage}
        >
          {"F"}
        </ParentButton>
        <ParentButton
          childLanguage={this.props.language}
          parentLanguage={this.props.motherLanguage}
        >
          {"M"}
        </ParentButton>
      </div>
    );
  }
}
