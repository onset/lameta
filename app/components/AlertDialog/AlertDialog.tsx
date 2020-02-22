import * as React from "react";
import ReactModal from "react-modal";
import "./AlertDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../crossPlatformUtilities";
import { Trans } from "@lingui/react";

interface IConfig {
  title: string;
  text: string;
  buttonText: string;
}

let staticShowAlertDialog: (config: IConfig) => void = () => {};
export { staticShowAlertDialog as ShowAlertDialog };

export const AlertDialog: React.FunctionComponent<{}> = props => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<IConfig>({
    title: "",
    text: "",
    buttonText: ""
  });
  staticShowAlertDialog = c => {
    setConfig(c);
    setIsOpen(true);
  };
  return (
    <CloseOnEscape onEscape={() => setIsOpen(false)}>
      <ReactModal
        ariaHideApp={false}
        className="alertDialog"
        isOpen={isOpen}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="dialogContent">
          <div className="row">
            <img src={locate("assets/warning.png")} />
            <h1>{config.title}</h1>
          </div>
          <div className="row">
            <div>{config.text}</div>
          </div>
        </div>
        <div className={"bottomButtonRow"}>
          <div className={"okCancelGroup"}>
            <button id="confirm" onClick={() => setIsOpen(false)}>
              {config.buttonText || <Trans>OK</Trans>}
            </button>
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};
