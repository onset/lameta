import * as React from "react";
import userSettingsSingleton from "../UserSettings";
import "./RegistrationReminder.scss";
import RegistrationDialog from "./registration/RegistrationDialog";

export default class RegistrationReminder extends React.Component {
  public render() {
    let msg = "";
    switch (userSettingsSingleton.HowUsing) {
      case "":
        msg = "Please Register";
        break;
      // the student/workskhop participant may start using it for research, so we want to show
      // the student status so-as to provide an incentive for them to change their registration
      // if that happens.
      case "student":
        msg = "Student";
        break;
      case "developer":
        msg = "Developer";
        break;
      default:
        break;
    }

    return (
      <button
        id="registrationReminder"
        onClick={() => RegistrationDialog.show()}
      >
        {msg}
      </button>
    );
  }
}
