import * as React from "react";
import ReactModal from "react-modal";
//import "./RegistrationDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { Trans } from "@lingui/react";
import * as isEmail from "isemail";
import userSettings from "../../UserSettings";
import "./RegistrationDialog.scss";
import { SMRadioGroup, SMRadio } from "../SMRadio";
import { analyticsLocation } from "../../analytics";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  email: string;
  howUsing: string;
  validEmail: boolean;
  acceptable: boolean;
}

export default class RegistrationDialog extends React.Component<
  IProps,
  IState
> {
  private static singleton: RegistrationDialog;

  constructor(props: IProps) {
    super(props);
    this.state = {
      isOpen: false,
      email: "",
      validEmail: false,
      howUsing: "",
      acceptable: false
    };
    RegistrationDialog.singleton = this;
  }
  private handleCloseModal(doSave: boolean) {
    if (doSave) {
      userSettings.Email = this.state.email;
      userSettings.HowUsing = this.state.howUsing;
    }
    this.setState({ isOpen: false });
  }

  public static async show() {
    RegistrationDialog.singleton.update({
      isOpen: true,
      email: userSettings.Email,
      howUsing: userSettings.HowUsing
    });
    analyticsLocation("Registration Dialog");
  }

  public render() {
    return (
      <CloseOnEscape
        onEscape={() => {
          this.handleCloseModal(false);
        }}
      >
        <ReactModal
          ariaHideApp={false}
          className="registrationDialog"
          isOpen={this.state.isOpen}
          shouldCloseOnOverlayClick={true}
          onRequestClose={() => this.handleCloseModal(false)}
        >
          <label className={"dialogTitle"}>
            <Trans>Registration</Trans>
          </label>
          <div className="dialogContent">
            <div className="row">
              <label>
                <Trans>Email Address</Trans>
              </label>
              <input
                className={
                  this.state.validEmail ? "" : "markInvalidIfNotFocussed"
                }
                autoFocus
                value={this.state.email}
                onChange={e => {
                  this.update({ email: e.target.value });
                }}
              />
            </div>
            <div className="row">
              <label>
                <Trans>How are you using lameta?</Trans>
              </label>
              <SMRadioGroup
                id="howUsingRadioGroup"
                name="howUsingRadioGroup"
                className="howUsingRadioGroup"
                selectedValue={this.state.howUsing}
                onChange={value => {
                  this.update({ howUsing: value });
                }}
              >
                <SMRadio value="own-language">
                  <Trans>For documenting my own language</Trans>
                </SMRadio>
                <SMRadio value="another-language">
                  <Trans>For documenting another language</Trans>
                </SMRadio>
                <SMRadio value="learner">
                  <Trans>For a course or workshop</Trans>
                </SMRadio>
                <SMRadio value="trainer">
                  <Trans>As a trainer</Trans>
                </SMRadio>
                <SMRadio value="curator">
                  <Trans>As a curator</Trans>
                </SMRadio>
                <SMRadio value="developer">
                  <Trans>As a developer</Trans>
                </SMRadio>
              </SMRadioGroup>
            </div>
            <div className={"bottomButtonRow"}>
              <div className={"okCancelGroup"}>
                <button onClick={() => this.handleCloseModal(false)}>
                  <Trans>Cancel</Trans>
                </button>
                <button
                  id="okButton"
                  disabled={!this.state.acceptable}
                  onClick={() => this.handleCloseModal(true)}
                >
                  <Trans>OK</Trans>
                </button>
              </div>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }

  private update(stateChanges: any) {
    const email = stateChanges.email || this.state.email;
    const howUsing = stateChanges.howUsing || this.state.howUsing;
    const validEmail = isEmail.validate(email, {
      minDomainAtoms: 2
    });
    this.setState({
      ...stateChanges,
      validEmail,
      acceptable: howUsing !== "" && validEmail
    });
  }
}
