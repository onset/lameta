import * as React from "react";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Field } from "../../model/field/Field";

import { runInAction } from "mobx";
import ReactSelect from "react-select";
import { css } from "@emotion/react";
import Alert from "@mui/material/Alert";
import { ArchiveConfigurationSummary } from "../../ArchiveConfigurationSummary";

interface IProps {
  archiveConfigurationField: Field;
  // customChoicesField: Field;
  authorityLists: AuthorityLists;
  onChange: () => void;
}

const ArchiveConfigurationForm: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  return (
    <div>
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
        single archiving institution. Choose the name of your archive or "Other"
        if you don't see it listed.
      </Alert>
      <h3
        css={css`
          margin-bottom: 5px;
        `}
      >
        Archive Configuration
      </h3>
      <ReactSelect
        css={css`
          width: 200px;
        `}
        name={props.archiveConfigurationField.labelInUILanguage} //what does this do? Maybe accessibility?
        value={{
          value: props.archiveConfigurationField.text,
          label: props.archiveConfigurationField.text
        }}
        onChange={(event) => {
          runInAction(() => {
            props.archiveConfigurationField.text = event.value;
            props.onChange();
          });
        }}
        options={props.authorityLists.archiveConfigurationChoices.map((s) => {
          return { value: s.id, label: s.label };
        })}
      />
      <ArchiveConfigurationSummary
        chosen={props.archiveConfigurationField.text}
      />
    </div>
  );
};
const x = observer(ArchiveConfigurationForm);
export { x as ArchiveConfigurationForm };
