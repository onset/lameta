// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */
import DeleteIcon from "@material-ui/icons/Delete";
import * as React from "react";
import { Trans } from "@lingui/macro";
import { t } from "@lingui/macro";
import { lameta_orange } from "../../containers/theme";
import { runInAction } from "mobx";
import {
  DialogBottomButtons,
  DialogCancelButton,
  DialogMiddle,
  DialogTitle,
  LametaDialog
} from "../LametaDialog";
import { Button } from "@material-ui/core";

let staticShowDeleteDialog: (
  descriptionOfWhatWillBeDeleted: string,
  asyncDeletionFunction: () => void
) => void = () => {};
export { staticShowDeleteDialog as ShowDeleteDialog };

enum Mode {
  closed = 0,
  confirming = 1,
  deleting = 2
}
export const ConfirmDeleteDialog: React.FunctionComponent<{}> = () => {
  const [mode, setMode] = React.useState<Mode>(Mode.closed);
  const [deletionAction, setDeletionAction] = React.useState<() => void>(
    () => () => {}
  );
  const [descriptionOfWhatWillBeDeleted, setDescriptionOfWhatWillBeDeleted] =
    React.useState("__");
  staticShowDeleteDialog = (description: string, deleteAction: () => void) => {
    setDescriptionOfWhatWillBeDeleted(description);
    setMode(Mode.confirming);
    setDeletionAction(() => deleteAction);
  };
  React.useEffect(() => {
    switch (mode) {
      case Mode.deleting:
        document.body.style.cursor = "wait";
        break;
      default:
        document.body.style.cursor = "default";
    }
  }, [mode]);

  function close() {
    setDeletionAction(() => {});
    setMode(Mode.closed);
  }

  return (
    <LametaDialog
      open={mode !== Mode.closed}
      requestClose={() => {
        if (mode === Mode.deleting) {
          return;
        }
        close();
      }}
      // css={css`
      //   width: calc(100% - 100px);
      //   // Note that the Grid needs an absolute size, which is kept in kpixelsThatAreNotAvailableToGridHeight
      //   // So if you change this here, you may need to tweak that
      //   height: calc(100% - 100px);
      // `}
    >
      <DialogTitle
        title={mode === Mode.deleting ? t`Deleting...` : t`Confirm Delete`}
      />
      <DialogMiddle>
        <div
          css={css`
            display: flex;
          `}
        >
          {/* <DeleteIcon
            fontSize="large"
            // css={css`
            //   width: auto;
            //   height: 50px;
            // `}
          /> */}
          {/* <div> */}
          <Trans>
            {descriptionOfWhatWillBeDeleted} will be moved to the Trash
          </Trans>
          {/* </div> */}
        </div>
      </DialogMiddle>
      <DialogBottomButtons>
        {mode === Mode.deleting ? (
          <span
            css={css`
              color: ${lameta_orange};
            `}
          >
            {t`Deleting...`}
          </span>
        ) : (
          <React.Fragment>
            <Button
              startIcon={<DeleteIcon></DeleteIcon>}
              variant="contained"
              color="secondary"
              id="deleteButton"
              onClick={() => {
                //const action = deletionAction; //review
                setMode(Mode.deleting);
                window.setTimeout(() => {
                  try {
                    runInAction(async () => {
                      await deletionAction();
                      setDeletionAction(() => {});
                      setMode(Mode.closed);
                    });
                  } catch (error) {}
                }, 100);
              }}
            >
              <Trans>Delete</Trans>
            </Button>
            <DialogCancelButton
              onClick={() => {
                close();
              }}
            />
          </React.Fragment>
        )}
      </DialogBottomButtons>
    </LametaDialog>
  );
};
