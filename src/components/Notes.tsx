import React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { TextFieldEdit } from "./TextFieldEdit";
import { InfoIndicator } from "./FieldIndicators";
import userSettingsSingleton from "../other/UserSettings";
import { css } from "@emotion/react";
import { Trans, t } from "@lingui/macro";
import { Project } from "../model/Project/Project";
interface IProps {
  field: Field;
}

export const Notes: React.FunctionComponent<{
  field: Field;
  project: Project;
}> = (props) => {
  return (
    <div
      css={css`
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        overflow: auto;
      `}
    >
      {Project.OtherConfigurationSettings.showImdi && (
        <InfoIndicator
          css={css`
            margin-left: auto;
          `}
        >
          <Trans comment="Shows in a tooltip on an info icon in the Notes tab">
            lameta will not export Notes to MIDI
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
