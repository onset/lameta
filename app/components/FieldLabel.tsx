import React from "react";
import Tooltip from "react-tooltip-lite";
import { Field } from "../model/field/Field";
import { FieldDefinition } from "../model/field/FieldDefinition";
import { InfoAffordance } from "./InfoAffordance";
import userSettingsSingleton from "../UserSettings";
import {
  translateFieldLabel,
  translateSpecialInfo,
  i18n,
  translateTooltip,
} from "../localization";
import { Trans } from "@lingui/react";

export const FieldLabel: React.FunctionComponent<{
  fieldDef: FieldDefinition;
}> = (props) => {
  let tooltip = translateTooltip(props.fieldDef);
  if (userSettingsSingleton.IMDIMode && props.fieldDef.markAsNotImdi) {
    tooltip = ("" && tooltip) + " Not important for IMDI.";
  }
  const specialInfo = translateSpecialInfo(props.fieldDef);

  const labelElement = (
    <label
      style={{ display: "inline-block" }}
      className={
        userSettingsSingleton.IMDIMode && props.fieldDef.markAsNotImdi
          ? "markAsNotImdi"
          : ""
      }
    >
      {translateFieldLabel(props.fieldDef)}
    </label>
  );
  const labelMaybeWithTooltip =
    tooltip && tooltip.length > 0 ? (
      <Tooltip
        tagName={"span"}
        className={"tooltipWrapper"} // would have no wrapper, but at least reminds us why it is there
        styles={{ display: "inline" }}
        background={"#FDFFB1"}
        content={tooltip}
      >
        <span style={{ maxWidth: "100px" }}>{labelElement}</span>
      </Tooltip>
    ) : (
      labelElement
    );

  return (
    <>
      {labelMaybeWithTooltip}
      {props.fieldDef.personallyIdentifiableInformation ? (
        <InfoAffordance>
          <Trans>
            As Personally Identifiable Information, this will not be exported to
            other formats.
          </Trans>
        </InfoAffordance>
      ) : null}
      {specialInfo ? <InfoAffordance>{specialInfo}</InfoAffordance> : null}
    </>
  );
};
