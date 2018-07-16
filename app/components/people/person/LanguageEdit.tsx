import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../../model/field/Field";
import TextFieldEdit from "../../TextFieldEdit";
import ParentButton from "./ParentButton";
import { locate } from "../../../crossPlatformUtilities";

export interface IProps {
  language: Field;
  fatherLanguage: Field;
  motherLanguage: Field;
  //changed?: () => void;
}

@observer
export default class LanguageEdit extends React.Component<IProps> {
  private femaleSelected: string = locate("assets/Female_Selected.png");
  private femaleNotSelected: string = locate("assets/Female_NotSelected.png");
  private maleSelected: string = locate("assets/Male_Selected.png");
  private maleNotSelected: string = locate("assets/Male_NotSelected.png");
  constructor(props: IProps) {
    super(props);
  }

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
          selectedIcon={this.femaleSelected}
          notSelectedIcon={this.femaleNotSelected}
        />
        <ParentButton
          childLanguage={this.props.language}
          parentLanguage={this.props.motherLanguage}
          selectedIcon={this.maleSelected}
          notSelectedIcon={this.maleNotSelected}
        />
      </div>
    );
  }
}
