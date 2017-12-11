import * as React from "react";
import { DateInput } from "@blueprintjs/datetime";
import { Session } from "../model/Session";
import { observer, Provider } from "mobx-react";
import TextFieldEdit from "./TextFieldEdit";
import { TextField } from "../model/Field";
import DateFieldEdit from "./DateFieldEdit";
const styles = require("./Sessions.scss");

export interface IProps {
  session: Session;
}
@observer
export default class SessionForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
    console.log(
      "SessionForm constructor: " +
        this.props.session.properties.getValue("title").toString()
    );
  }

  private renderDatePicker = () => (
    <div>
      <DateInput />
    </div>
  );

  public render() {
    return (
      <form className={styles.sessionForm}>
        <TextFieldEdit text={this.props.session.getTextField("title")} />
        <TextFieldEdit text={this.props.session.getTextField("people")} />
        <TextFieldEdit text={this.props.session.getTextField("genre")} />
        <TextFieldEdit
          text={this.props.session.getTextField("situation")}
          className={"text-block"}
        />
        <DateFieldEdit date={this.props.session.getDateField("date")} />
        <TextFieldEdit text={this.props.session.getTextField("setting")} />
        <TextFieldEdit text={this.props.session.getTextField("location")} />
        <TextFieldEdit text={this.props.session.getTextField("access")} />
        <TextFieldEdit
          text={this.props.session.getTextField("description")}
          className={"text-block"}
        />
      </form>
    );
  }
}

// export default reduxForm({
//   // a unique name for the form
//   form: "sessionDetails"
// })(SessionForm);

//export default connect(mapStateToProps,mapDispatchToProps)
// export default connect()
// (reduxForm({
//   // a unique name for the form
//   form: "sessionDetails"
// })(SessionDetails);
