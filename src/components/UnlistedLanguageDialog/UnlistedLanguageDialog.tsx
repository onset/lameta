import { css } from "@emotion/react";
import { t, Trans } from "@lingui/macro";
import * as React from "react";
import { useState } from "react";
import { Button } from "@mui/material";
import {
  DialogBottomButtons,
  DialogCancelButton,
  DialogMiddle,
  DialogTitle,
  LametaDialog
} from "../LametaDialog";
import { error_color } from "../../containers/theme";
import {
  getPrimarySubtag,
  isPrivateUseTag,
  slugifyForPrivateUseSubtag
} from "../../languageFinder/privateUseLanguages";

export interface IUnlistedLanguageRequest {
  // what the user typed into the language field
  typedName: string;
  // the code lameta picked, e.g. "qab". Undefined when all 520 are already in use.
  suggestedCode: string | undefined;
  // the primary subtags already used by other languages in this project
  codesInUse: string[];
  // called with the full tag and the name, e.g. ("qab-x-tolo", "Tolo")
  onAccept: (tag: string, name: string) => void;
}

let staticShowUnlistedLanguageDialog: (
  request: IUnlistedLanguageRequest
) => void = () => {};
export { staticShowUnlistedLanguageDialog as ShowUnlistedLanguageDialog };

export const UnlistedLanguageDialog: React.FunctionComponent<{}> = () => {
  const [request, setRequest] = useState<IUnlistedLanguageRequest>();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  staticShowUnlistedLanguageDialog = (r: IUnlistedLanguageRequest) => {
    setRequest(r);
    setName(r.typedName);
    setCode(r.suggestedCode ?? "");
  };

  const close = () => setRequest(undefined);

  if (!request) return null;

  const trimmedName = name.trim();
  const trimmedCode = code.trim().toLowerCase();
  // The codes the user may not take. The suggested code is ours to give, so it is not in here.
  const takenCodes = request.codesInUse.filter(
    (c) => c !== request.suggestedCode
  );

  let validationMessage = "";
  if (trimmedName.length === 0) {
    validationMessage = t`Please give the language a name.`;
  } else if (trimmedName.includes(";")) {
    // The field joins its languages with a semicolon, so a name that holds one would come
    // back as two languages, the second of them with a piece of the name as its code.
    validationMessage = t`The name cannot contain a semicolon.`;
  } else if (trimmedCode.length === 0) {
    validationMessage = t`Please give the language a code.`;
  } else if (!isPrivateUseTag(trimmedCode) || trimmedCode.length !== 3) {
    validationMessage = t`The code must be between qaa and qtz.`;
  } else if (takenCodes.includes(getPrimarySubtag(trimmedCode))) {
    validationMessage = t`Another language in this project already uses that code.`;
  }

  const isValid = validationMessage.length === 0;

  const accept = () => {
    if (!isValid) return;
    request.onAccept(
      `${trimmedCode}-x-${slugifyForPrivateUseSubtag(trimmedName)}`,
      trimmedName
    );
    close();
  };

  return (
    <LametaDialog open={true} requestClose={close}>
      <DialogTitle title={t`Add an Unlisted Language`} />
      <DialogMiddle>
        <p
          css={css`
            max-width: 44em;
          `}
        >
          <Trans>
            Use this for a language that has no ISO 639-3 code. Give the
            language a name, and a code between qaa and qtz.
          </Trans>
        </p>
        <div
          css={css`
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 8px 12px;
            align-items: center;
            margin-top: 1em;
            max-width: 30em;
          `}
        >
          <label htmlFor="unlistedLanguageName">
            <Trans>Name</Trans>
          </label>
          <input
            id="unlistedLanguageName"
            css={css`
              margin: unset; //app.global.scss interference
            `}
            // A language name is not a word of any language that the spell checker knows.
            spellCheck={false}
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") accept();
            }}
          />
          <label htmlFor="unlistedLanguageCode">
            <Trans>Language Code</Trans>
          </label>
          <input
            id="unlistedLanguageCode"
            css={css`
              margin: unset; //app.global.scss interference
              width: 6em;
            `}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") accept();
            }}
          />
        </div>
        <div
          css={css`
            color: ${error_color};
            min-width: 400px;
            min-height: 2em;
            margin-top: 1em;
          `}
        >
          {validationMessage}
        </div>
      </DialogMiddle>
      <DialogBottomButtons>
        <Button
          id="unlistedLanguageOkButton"
          variant="contained"
          color="secondary"
          disabled={!isValid}
          onClick={accept}
        >
          <Trans>OK</Trans>
        </Button>
        <DialogCancelButton onClick={close} />
      </DialogBottomButtons>
    </LametaDialog>
  );
};
