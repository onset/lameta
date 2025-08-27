import { css } from "@emotion/react";
import "./commonDialog.css";
import * as React from "react";
import { useState } from "react";
import { t, Trans } from "@lingui/macro";
import { Button, Dialog, DialogContent } from "@mui/material";

const kDialogTopPadding = "24px";
const kDialogSidePadding = "24px";
const kDialogBottomPadding = "10px"; // per material, the bottom buttons are supposed to be closer to the edges
const kDialogPadding = "10px";

export const LametaDialog: React.FunctionComponent<{
  open: boolean;
  requestClose: () => void;
  "data-testid"?: string;
}> = (props) => {
  if (!props.open) {
    return <React.Fragment />;
  }
  const inner = (
    <DialogContent
      css={css`
        display: flex;
        flex-direction: column;
        padding-left: ${kDialogSidePadding};
        padding-right: ${kDialogSidePadding};
        padding-bottom: ${kDialogBottomPadding};
        height: 100%;
      `}
    >
      {props.children}
    </DialogContent>
  );

  const { requestClose, ...dialogProps } = props;
  return (
    <Dialog
      data-testid={props["data-testid"]}
      onClose={() => requestClose()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          const defaultButton = document.querySelector(
            ".defaultButton"
          ) as HTMLButtonElement;
          if (defaultButton) {
            defaultButton.click();
          }
        } else if (e.key === "Escape") {
          requestClose();
        }
      }}
      {...dialogProps}
    >
      {inner}
    </Dialog>
  );
};

export const DialogTitle: React.FunctionComponent<{
  backgroundColor?: string;
  color?: string;
  icon?: string;
  title: string; // note, this is prop instead of just a child so that we can ensure vertical alignment and bar height, which are easy to mess up.
}> = (props) => {
  const color = props.color || "black";
  const background = props.backgroundColor || "transparent";

  // This is lame, but it's really what looks right to me. When there is a color bar, it looks better to have less padding at the top.
  const titleTopPadding =
    background === "transparent" ? kDialogTopPadding : kDialogPadding;
  return (
    <div
      css={css`
        color: ${color};
        background-color: ${background};
        display: flex;
        /*
        padding-left: ${kDialogTopPadding};
        padding-right: ${kDialogTopPadding};
        //padding-top: ${titleTopPadding};
        padding-bottom: ${kDialogPadding};
        margin-left: -${kDialogTopPadding};
        margin-right: -${kDialogTopPadding}; */
        margin-bottom: ${kDialogPadding};
        * {
          font-size: 16px;
          font-weight: bold;
        }
      `}
    >
      {props.icon && (
        <img
          src={props.icon}
          alt="Decorative Icon"
          css={css`
            margin-right: ${kDialogPadding};
            color: ${color};
          `}
        />
      )}
      <h1
        css={css`
          margin-top: auto;
          margin-bottom: auto;
          font-size: 24px;
        `}
      >
        {props.title}
      </h1>
      {/* Example child would be a Spinner in a progress dialog*/}
      {props.children}
    </div>
  );
};

// The height of this is determined by what is inside of it. If the content might grow (e.g. a progress box), then it's up to the
// client to set maxes or fixed dimensions. See <ProgressDialog> for an example.
export const DialogMiddle: React.FunctionComponent = (props) => {
  return (
    <div
      css={css`
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        font-size: 14px;

        p {
          margin-block-start: 0;
          margin-block-end: 1em;
        }
      `}
      {...props}
    >
      {props.children}
    </div>
  );
};

// should be a child of DialogBottomButtons
export const DialogBottomLeftButtons: React.FunctionComponent = (props) => (
  <div
    css={css`
      margin-right: auto;
      display: flex;

      /* -- button separation -- */
      // this is better but Firefox doesn't support it until FF 63:  gap: ${kDialogPadding};
      button {
        margin-right: ${kDialogPadding};
      }
      //padding-left: 0;//  would be good, if we could only apply it to un-outlined material buttons to make them left-align
      // or margin-left:-8px, which left-aligns such buttons but keeps the padding, which is used in hover effects.

      button {
        margin-left: 0 !important;
      }
    `}
  >
    {props.children}
  </div>
);

// normally one or two buttons, with the last one being <DialogCancelButton></DialCancelButton>.
// The 1st child can also be <DialogBottomLeftButtons> if you have left-aligned buttons to show
// give the order as it would be in Windows, which is Cancel-last. At runtime, this component reverse the order for mac & ubuntu.
export const DialogBottomButtons: React.FunctionComponent = (props) => {
  return (
    <div
      className="reverseOrderOnMac"
      css={css`
        margin-left: auto;
        margin-top: auto; // push to bottom
        padding-top: 20px; // leave room between us and the content above us
        display: flex;

        /* -- button separation -- */
        gap: ${kDialogPadding};

        // As per material (https://i.imgur.com/REsXU1C.png), we actually should be closer to the right than
        // the content.
        // no it looks ugly! width: calc(100% + 10px);

        width: 100%;
      `}
      {...props}
    >
      {props.children}
    </div>
  );
};
export const DialogCancelButton: React.FunctionComponent<{
  onClick: () => void;
  default?: boolean;
  disabled?: boolean;
}> = (props) => (
  <Button
    disabled={props.disabled}
    className={props.default ? "defaultButton" : ""}
    variant={props.default ? "contained" : "outlined"}
    onClick={props.onClick}
  >
    <Trans>Cancel</Trans>
  </Button>
);
export const DialogOKButton: React.FunctionComponent<{
  onClick: () => void;
  disabled?: boolean;
  default?: boolean;
}> = (props) => (
  <DialogButton {...props}>
    <Trans>OK</Trans>
  </DialogButton>
);
export const DialogButton: React.FunctionComponent<{
  onClick: () => void;
  default?: boolean;
  disabled?: boolean;
}> = (props) => (
  <Button
    className={props.default ? "defaultButton" : ""}
    disabled={props.disabled}
    color="secondary"
    variant={props.default ? "contained" : "outlined"}
    onClick={props.onClick}
  >
    {props.children}
  </Button>
);
// Components that include <LametaDialog> to make a dialog should call this hook and use what it returns to manage the dialog.
// See the uses of it in the code for examples.
export function useSetupLametaDialog() {
  const [currentlyOpen, setOpen] = useState(false);
  function showDialog() {
    setOpen(true);
  }
  function closeDialog() {
    document.body.style.cursor = "default";
    setOpen(false);
  }
  return {
    currentlyOpen,
    showDialog,
    closeDialog
  };
}
