import * as React from "react";
import userSettings from "../UserSettings";
import "./RegistrationReminder.scss";
import RegistrationDialog from "./registration/RegistrationDialog";
import * as mobx from "mobx-react";
import { t } from "@lingui/macro";
import { i18n } from "../localization";
import { Trans } from "@lingui/react";

// This is in the upper left corner of the screen. It shows either
// * A button asking you to register, or
// * The name of a role that is unusual (developer) or temporary (learner)
// * Nothing, if you're registered with a normal, permanent role
@mobx.observer
export default class RegistrationReminder extends React.Component {
  public render() {
    let buttonText: string | undefined;
    let passiveText = <></>;
    switch (userSettings.HowUsing) {
      case "":
        buttonText = i18n._(t`Please Register`);
        break;
      // the student/workskhop participant may eventually start using it for research, so we want to show
      // the student status so-as to provide an incentive for them to change their registration
      // if that happens.
      case "learner":
        passiveText = (
          <label>
            <Trans>Learner</Trans>
          </label>
        );
        break;
      case "developer":
        passiveText = <label style={{ color: "blue" }}>Developer Mode</label>;
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
