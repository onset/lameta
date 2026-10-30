import { css } from "@emotion/react";
import { Trans } from "@lingui/react/macro";
/* removed emotion jsx declaration */

import * as React from "react";
import "./MessageDialog.css";

import { DialogBottomButtons, DialogButton, LametaDialog } from "../LametaDialog";

interface IConfig {
  title?: string;
  text?: string;
  buttonText?: string;
  iconPath?: string | undefined | /* alert */ null /* none */;
  content?: React.ReactNode;
  width?: string;
  testId?: string;
  // called once the user closes the dialog
  onClose?: () => void;
}

let staticShowMessageDialog: (config: IConfig) => void = () => {};
export { staticShowMessageDialog as ShowMessageDialog };

export const MessageDialog: React.FunctionComponent<{}> = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [config, setConfig] = React.useState<IConfig>({
    title: "",
    text: "",
    buttonText: "",
    width: "",
  });
  staticShowMessageDialog = (c) => {
    setConfig(c);
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    config.onClose?.();
  };
  return (
    <LametaDialog open={isOpen} requestClose={close} data-testid={config.testId}>
      <div className={"dialogTitle "}>
        <div
          css={css`
            display: flex;
            align-items: center;
            gap: 10px;
          `}
        >
          {config.iconPath !== null && (
            <img
              css={css`
                height: 24px;
                width: 24px;
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
          margin-top: 10px;
        `}
      >
        {config.text && <div>{config.text}</div>}

        {config.content}
      </div>
      <DialogBottomButtons>
        <DialogButton onClick={close} default={true}>
          {config.buttonText || <Trans>OK</Trans>}
        </DialogButton>
      </DialogBottomButtons>
    </LametaDialog>
  );
};
