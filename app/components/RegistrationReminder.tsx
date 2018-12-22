import * as React from "react";
import userSettings from "../UserSettings";
import "./RegistrationReminder.scss";
import RegistrationDialog from "./registration/RegistrationDialog";
import * as mobx from "mobx-react";

@mobx.observer
export default class RegistrationReminder extends React.Component {
  public render() {
    let buttonText: string | undefined;
    let passiveText = "";
    switch (userSettings.HowUsing) {
      case "":
        buttonText = "Please Register";
        break;
      // the student/workskhop participant may start using it for research, so we want to show
      // the student status so-as to provide an incentive for them to change their registration
      // if that happens.
      case "student":
        passiveText = "Student";
        break;
      case "developer":
        passiveText = "Developer";
        break;
      default:
        break;
    }

    const core = buttonText ? (
      <button onClick={() => RegistrationDialog.show()}>{buttonText}</button>
    ) : (
      <label>{passiveText}</label>
    );
    return (
      <div id="registrationReminder" onClick={() => RegistrationDialog.show()}>
        {core}
      </div>
    );
  }
}
