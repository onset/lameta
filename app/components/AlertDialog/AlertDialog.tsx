import * as React from "react";
import ReactModal from "react-modal";
import "./AlertDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../crossPlatformUtilities";
import { Trans } from "@lingui/react";

interface IState {
  isOpen: boolean;
  config: IConfig;
}
interface IConfig {
  title?: string;
  text?: string;
  buttonText?: string;
}
export default class AlertDialog extends React.Component<{}, IState> {
  private static singleton: AlertDialog;

  constructor() {
    super({});
    this.state = {
      isOpen: false,
      config: { title: "message is not set yet" }
    };
    AlertDialog.singleton = this;
  }
  private handleCloseModal(doDelete: boolean) {
    this.setState({ isOpen: false });
  }

  public static async show(config: IConfig) {
    AlertDialog.singleton.setState({
      isOpen: true,
      config
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
          className="alertDialog"
          isOpen={this.state.isOpen}
          shouldCloseOnOverlayClick={true}
          onRequestClose={() => this.handleCloseModal(false)}
        >
          <div className="dialogContent">
            <div className="row">
              <img src={locate("assets/warning.png")} />
              <h1>{this.state.config.title}</h1>
            </div>
            <div className="row">
              <div>{this.state.config.text}</div>
            </div>{" "}
          </div>
          <div className={"bottomButtonRow"}>
            <div className={"okCancelGroup"}>
              <button id="confirm" onClick={() => this.handleCloseModal(true)}>
                {this.state.config.buttonText || <Trans>OK</Trans>}
              </button>
            </div>
          </div>
        </ReactModal>
      </CloseOnEscape>
    );
  }
}
