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
import { Trans } from "@lingui/macro";
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
  const [archiveConfigurationName, setArchiveConfigurationName] =
    React.useState<string>(props.archiveConfigurationField.text);
  return (
    <div
      css={css`
        padding-left: 20px;
      `}
    >
      <Collapse in={archiveConfigurationName == "OTHER"}>
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
          single archiving institution. Choose the name of your archive or
          "Other" if you don't see it listed.
        </Alert>
      </Collapse>
      <h1
        css={css`
          margin-bottom: 5px;
        `}
      >
        Archive Configuration
      </h1>
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
          name={archiveConfigurationName} //what does this do? Maybe accessibility?
          value={{
            value: archiveConfigurationName,
            label: archiveConfigurationName
          }}
          onChange={(event) => {
            setArchiveConfigurationName(event.value);
          }}
          options={props.authorityLists.archiveConfigurationChoices
            .map((s) => {
              return { value: s.id, label: s.label };
            })
            .concat({ value: "OTHER", label: "Other" })}
        />
        <Button
          variant="contained"
          css={css`
            font-weight: bold;
            visibility: ${archiveConfigurationName ===
            props.archiveConfigurationField.text
              ? "hidden"
              : "visible"};
          `}
          onClick={() =>
            runInAction(() => {
              props.archiveConfigurationField.text = archiveConfigurationName;
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
        {archiveConfigurationName === "OTHER" ? (
          <CustomArchiveConfiguration
            customChoicesField={props.customChoicesField}
          />
        ) : (
          <ArchiveConfigurationSummary
            configurationName={archiveConfigurationName}
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
