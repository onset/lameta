import * as React from "react";
import ReactModal from "react-modal";
//import "./RegistrationDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { Trans } from "@lingui/react";
import * as isEmail from "isemail";
import userSettingsSingleton from "../../settings";

// tslint:disable-next-line:no-empty-interface
interface IProps {}
interface IState {
  isOpen: boolean;
  email: string;
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
      email: "foo",
      validEmail: false,
      acceptable: false
    };
    RegistrationDialog.singleton = this;
  }
  private handleCloseModal(doSave: boolean) {
    if (doSave) {
      userSettingsSingleton.setString("email", this.state.email);
    }
    this.setState({ isOpen: false });
  }

  public static async show() {
    RegistrationDialog.singleton.setState({
      isOpen: true,
      email: userSettingsSingleton.get("email", "")
    });
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
          <div className={"dialogTitle"}>
            <Trans>Registration</Trans>
          </div>
          <div className="dialogContent">
            <div className="row">
              <Trans>Email</Trans>
              <input
                autoFocus
                // onKeyDown={e => {
                //   this.setState({
                //     validEmail: isEmail.validate(this.state.email)
                //   });
                // }}
                value={this.state.email}
                onChange={e =>
                  this.setState({
                    email: e.target.value,
                    validEmail: isEmail.validate(e.target.value),
                    acceptable: this.getAcceptable()
                  })
                }
              />
              {this.state.validEmail ? "Valid" : "Invalid"}
            </div>
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
        </ReactModal>
      </CloseOnEscape>
    );
  }
  getAcceptable(): boolean {
    return isEmail.validate(this.state.email);
  }
}
