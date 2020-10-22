import * as React from "react";
import ReactModal from "react-modal";
import "./MessageDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../other/crossPlatformUtilities";
import { Trans } from "@lingui/react";

interface IConfig {
  title: string;
  text: string;
  buttonText: string;
  iconPath?: string | undefined | /* alert */ null /* none */;
}

let staticShowMessageDialog: (config: IConfig) => void = () => {};
export { staticShowMessageDialog as ShowMessageDialog };

export const MessageDialog: React.FunctionComponent<{}> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<IConfig>({
    title: "",
    text: "",
    buttonText: "",
  });
  staticShowMessageDialog = (c) => {
    setConfig(c);
    setIsOpen(true);
  };
  return (
    <CloseOnEscape onEscape={() => setIsOpen(false)}>
      <ReactModal
        ariaHideApp={false}
        className="messageDialog"
        isOpen={isOpen}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <div className="dialogContent">
          <div className="row">
            {config.iconPath !== null && (
              <img src={locate(config.iconPath || "assets/warning.png")} />
            )}
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
