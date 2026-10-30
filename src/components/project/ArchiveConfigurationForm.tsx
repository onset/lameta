import * as React from "react";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Field } from "../../model/field/Field";

import { runInAction } from "mobx";
import ReactSelect from "react-select";
import { css } from "@emotion/react";
import Alert from "@mui/material/Alert";
import { ArchiveConfigurationSummary } from "../../ArchiveConfigurationSummary";
import { Button, Collapse } from "@mui/material";
import { lameta_dark_blue, textPrimary } from "../../containers/theme";

import { TextFieldEdit } from "../TextFieldEdit";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";

// The archive configurations are named for their archives, except "default", whose label
// AuthorityLists gives in English.
function labelOf(choice: { id: string; label: string } | undefined) {
  return choice?.id === "default" ? t`Other` : choice?.label;
}

interface IProps {
  archiveConfigurationField: Field;
  customChoicesField: Field;
  authorityLists: AuthorityLists;
  onChange: () => void;
}

const ArchiveConfigurationForm: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  useLingui(); // render again when the UI language changes, for the label of "Other"
  const choices = props.authorityLists.archiveConfigurationChoices.map((choice) => ({
    value: choice.id,
    label: labelOf(choice)!,
    configurationFullName: choice.description,
  }));
  const [archiveConfigurationKey, setArchiveConfigurationKey] = React.useState<string>(
    props.archiveConfigurationField.text,
  );
  const archiveConfigurationChoice = props.authorityLists.archiveConfigurationChoices.find(
    (choice) => choice.id === archiveConfigurationKey,
  );
  return (
    <div
      css={css`
        padding-left: 20px;
        max-width: 680px;
      `}
    >
      <h1
        css={css`
          margin: 0;
          line-height: 1.2;
        `}
      >
        <Trans>Archive Configuration</Trans>
      </h1>
      <Collapse in={archiveConfigurationKey == "default"}>
        <Alert
          severity="info"
          variant="outlined"
          css={css`
            color: ${textPrimary} !important;
            border-color: transparent !important;
            background-color: #f6dbcb !important;
            // inside the Collapse, so that the space goes away with the message
            margin-top: 16px;

            .MuiAlert-icon {
              color: ${textPrimary} !important;
            }
          `}
        >
          <Trans>
            Lameta projects are normally set up to work with the requirements of a single archiving
            institution. If yours is not listed, you can use "Other". This will give you the default
            fields and vocabularies, and you can enter your own session access choices.
          </Trans>
        </Alert>
      </Collapse>
      <div
        data-field-key="archiveConfigurationName"
        css={css`
          display: flex;
          flex-direction: row;
          gap: 10px;
          margin-top: 16px;
        `}
      >
        <ReactSelect
          css={css`
            width: 200px;
          `}
          id="archiveConfigurationName-select"
          name={archiveConfigurationKey} //what does this do? Maybe accessibility?
          value={{
            value: archiveConfigurationKey,
            label: labelOf(archiveConfigurationChoice),
          }}
          onChange={(event) => {
            setArchiveConfigurationKey(event!.value);
          }}
          options={choices}
        />
        <Button
          variant="contained"
          css={css`
            font-weight: bold;
            // show when we have a new choice read to be made permanent
            visibility: ${
              archiveConfigurationKey === props.archiveConfigurationField.text
                ? "hidden"
                : "visible"
            };
            && {
              background-color: ${lameta_dark_blue};
              color: white;
            }
            &&:hover {
              cursor: pointer;
            }
            &&:focus-visible {
              outline: 2px solid ${lameta_dark_blue};
              outline-offset: 2px;
            }
            @keyframes wiggle {
              0%,
              10% {
                transform: rotate(-3deg);
              }
              20% {
                transform: rotate(3deg);
              }
              30% {
                transform: rotate(-3deg);
              }
              40% {
                transform: rotate(3deg);
              }
              50%,
              100% {
                transform: rotate(0deg);
              }
            }
            animation: wiggle 2s ease-in-out infinite;
          `}
          onClick={() =>
            runInAction(() => {
              props.archiveConfigurationField.text = archiveConfigurationKey;
              // nb: the dirty detection system will not notice this change until
              // the event loop has a chance to run
              props.onChange();
            })
          }
        >
          <Trans>Change</Trans>
        </Button>
      </div>
      {archiveConfigurationChoice?.description && (
        <h2
          css={css`
            margin: 16px 0 0;
          `}
        >
          {archiveConfigurationChoice.description}
        </h2>
      )}
      <div
        css={css`
          margin-top: 16px;
        `}
      >
        {archiveConfigurationKey === "default" ? (
          <CustomArchiveConfiguration customChoicesField={props.customChoicesField} />
        ) : (
          <ArchiveConfigurationSummary
            authorityLists={props.authorityLists}
            configurationName={archiveConfigurationKey}
            configurationChoice={archiveConfigurationChoice!}
          />
        )}
      </div>
    </div>
  );
};
const x = observer(ArchiveConfigurationForm);
export { x as ArchiveConfigurationForm };

const CustomArchiveConfiguration: React.FunctionComponent<{
  customChoicesField: Field;
}> = (props) => {
  return (
    <TextFieldEdit
      field={props.customChoicesField}
      visibleInstructions={t`Enter each choice, separated by commas`}
    />
  );
};
