import * as React from "react";
import { DateInput } from "@blueprintjs/datetime";
import { Session } from "../model/Session";
import { observer, Provider } from "mobx-react";
import PolytextField from "./PolytextField";
import { Polytext } from "../model/BaseModel";
const styles = require("./Sessions.scss");

export interface IProps {
  session: Session;
}
@observer
export default class SessionForm extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
    this.onChange = this.onChange.bind(this);
    console.log(this.props.session.properties.getValue("title").default());
  }

  private renderDatePicker = () => (
    <div>
      <DateInput />
    </div>
  );

  private updateProperty(key: string, value: string) {
    this.props.session.setString(key, value);
    console.log(key + " = " + value);
  }

  private onChange(event: React.FormEvent<HTMLInputElement>) {
    this.updateProperty(event.currentTarget.name, event.currentTarget.value);
  }

  public render() {
    return (
      <form className={styles.sessionForm}>
        <PolytextField text={this.props.session.properties.getValue("title")} />
        <PolytextField
          text={this.props.session.properties.getValue("people")}
        />
        <PolytextField text={this.props.session.properties.getValue("genre")} />
        <PolytextField
          text={this.props.session.properties.getValue("situation")}
          className={"text-block"}
        />
        <PolytextField text={this.props.session.properties.getValue("date")} />
        <PolytextField
          text={this.props.session.properties.getValue("setting")}
        />
        <PolytextField
          text={this.props.session.properties.getValue("location")}
        />
        <PolytextField
          text={this.props.session.properties.getValue("access")}
        />
        <PolytextField
          text={this.props.session.properties.getValue("description")}
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
