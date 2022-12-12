// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
import { Trans } from "@lingui/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import * as React from "react";
import ReactModal from "react-modal";
import "./MessageDialog.scss";
import CloseOnEscape from "react-close-on-escape";
import { locate } from "../../other/crossPlatformUtilities";
import {
  DialogBottomButtons,
  DialogButton,
  LametaDialog,
} from "../LametaDialog";

interface IConfig {
  title: string;
  text?: string;
  buttonText?: string;
  iconPath?: string | undefined | /* alert */ null /* none */;
  content?: React.ReactNode;
  width?: string;
}

let staticShowMessageDialog: (config: IConfig) => void = () => {};
export { staticShowMessageDialog as ShowMessageDialog };

export const MessageDialog: React.FunctionComponent<{}> = (props) => {
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
  return (
    <LametaDialog open={isOpen} requestClose={() => setIsOpen(false)}>
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
              src={locate(config.iconPath || "assets/warning.png")}
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
