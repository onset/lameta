import { css } from "@emotion/react";
import { Trans } from "@lingui/macro";
/* removed emotion jsx declaration */

import * as React from "react";
import ReactModal from "react-modal";
import "./MessageDialog.css";
import CloseOnEscape from "react-close-on-escape";

import {
  DialogBottomButtons,
  DialogButton,
  LametaDialog
} from "../LametaDialog";

interface IConfig {
  title?: string;
  text?: string;
  buttonText?: string;
  iconPath?: string | undefined | /* alert */ null /* none */;
  content?: React.ReactNode;
  width?: string;
  testId?: string;
}

let staticShowMessageDialog: (config: IConfig) => void = () => {};
export { staticShowMessageDialog as ShowMessageDialog };

export const MessageDialog: React.FunctionComponent<{}> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<IConfig>({
    title: "",
    text: "",
    buttonText: "",
    width: ""
  });
  staticShowMessageDialog = (c) => {
    setConfig(c);
    setIsOpen(true);
  };
  return (
    <LametaDialog
      open={isOpen}
      requestClose={() => setIsOpen(false)}
      data-testid={config.testId}
    >
      <div className={"dialogTitle "}>
        <div
          css={css`
            display: flex;
          `}
        >
          {config.iconPath !== null && (
            <img
              css={css`
                height: 32px;
                margin-top: auto;
                margin-bottom: auto;
                margin-right: 10px;
              `}
              src={config.iconPath || "assets/warning.png"}
            />
          )}
          <div>{config.title}</div>
        </div>
      </div>
      <div
        className="dialogContent"
        css={css`
          width: ${config.width || "400px"};
        `}
      >
        {config.text && <div>{config.text}</div>}

        {config.content}
      </div>
      <DialogBottomButtons>
        <DialogButton onClick={() => setIsOpen(false)} default={true}>
          {config.buttonText || <Trans>OK</Trans>}
        </DialogButton>
      </DialogBottomButtons>
    </LametaDialog>
  );
};
