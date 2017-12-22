import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import TextFieldEdit from "./../TextFieldEdit";

export interface IProps {
  language: Field;
  fatherLanguage: Field;
  motherLangauge: Field;
}

@observer
export default class LanguageEdit extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <div className={"field language " + this.props.language.key}>
        <TextFieldEdit hideLabel={true} field={this.props.language} />
      </div>
    );
  }
}
