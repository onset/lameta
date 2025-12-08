import React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { TextFieldEdit } from "./TextFieldEdit";
import { InfoIndicator } from "./FieldIndicators";
import { css } from "@emotion/react";
import { Trans, t } from "@lingui/macro";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";

export const Notes: React.FunctionComponent<{
  field: Field;
}> = (props) => {
  return (
    <div
      className="notesTab"
      css={css`
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        overflow: auto;
      `}
    >
      {GetOtherConfigurationSettings().archiveUsesImdi && (
        <InfoIndicator
          css={css`
            margin-left: auto;
          `}
        >
          <Trans comment="Shows in a tooltip on an info icon in the Notes tab">
            lameta will not export Notes to IMDI
          </Trans>
        </InfoIndicator>
      )}

      <form
        css={css`
          padding-right: 0; // i don't know why the default as a right padding but I want the info icon to align with the right edge of the text field
        `}
      >
        <TextFieldEdit
          hideLabel={true}
          field={props.field}
          className={"fill-form"}
        />
      </form>
    </div>
  );
};

export default observer(Notes);
