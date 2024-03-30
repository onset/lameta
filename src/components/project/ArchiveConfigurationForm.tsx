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

import { TextFieldEdit } from "../TextFieldEdit";

interface IProps {
  archiveConfigurationField: Field;
  customChoicesField: Field;
  authorityLists: AuthorityLists;
  onChange: () => void;
}

const ArchiveConfigurationForm: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const [choices, setChoices] = React.useState<
    { value: string; label: string }[]
  >([]);
  React.useEffect(() => {
    setChoices(
      props.authorityLists.archiveConfigurationChoices.map((choice) => ({
        value: choice.id,
        label: choice.label
      }))
    );
  }, []);
  const [archiveConfigurationKey, setArchiveConfigurationKey] =
    React.useState<string>(props.archiveConfigurationField.text);
  const archiveConfigurationLabel =
    props.authorityLists.archiveConfigurationChoices.find(
      (choice) => choice.id === archiveConfigurationKey
    )?.label;
  return (
    <div
      css={css`
        padding-left: 20px;
      `}
    >
      <h1
        css={css`
          margin-bottom: 5px;
        `}
      >
        Archive Configuration
      </h1>
      <Collapse in={archiveConfigurationKey == "default"}>
        <Alert
          severity="info"
          variant="outlined"
          css={css`
            color: black !important;
            border-color: transparent !important;
            background-color: #f6dbcb !important;
            margin-bottom: 10px;

            .MuiAlert-icon {
              color: black !important;
            }
          `}
        >
          Lameta projects are normally set up to work with the requirements of a
          single archiving institution. If yours is not listed, you can use
          "Other". This will give you the default fields and vocabularies, and
          you can enter your own session access choices.
        </Alert>
      </Collapse>
      <div
        css={css`
          display: flex;
          flex-direction: row;
          gap: 10px;
        `}
      >
        <ReactSelect
          css={css`
            width: 200px;
          `}
          name={archiveConfigurationKey} //what does this do? Maybe accessibility?
          value={{
            value: archiveConfigurationKey,
            label: archiveConfigurationLabel
          }}
          onChange={(event) => {
            setArchiveConfigurationKey(event.value);
          }}
          options={choices}
        />
        <Button
          variant="contained"
          css={css`
            font-weight: bold;
            // show when we have a new choice read to be made permanent
            visibility: ${archiveConfigurationKey ===
            props.archiveConfigurationField.text
              ? "hidden"
              : "visible"};
          `}
          onClick={() =>
            runInAction(() => {
              props.archiveConfigurationField.text = archiveConfigurationKey;
              props.onChange();
            })
          }
        >
          Change
        </Button>
      </div>
      <div
        css={css`
          h2,
          h3 {
            margin-block-end: 0;
          }
          h3 {
            padding-left: 20px;
            margin-block-start: 0;
          }
          ul {
            padding-left: 20px;
            margin-block-start: 0;
          }
        `}
      >
        {archiveConfigurationKey === "default" ? (
          <CustomArchiveConfiguration
            customChoicesField={props.customChoicesField}
          />
        ) : (
          <ArchiveConfigurationSummary
            authorityLists={props.authorityLists}
            configurationName={archiveConfigurationKey}
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
    <div
      css={css`
        margin-top: 1em;
      `}
    >
      <TextFieldEdit
        field={props.customChoicesField}
        visibleInstructions={"Enter each choice, separated by commas"}
      />
    </div>
  );
};
