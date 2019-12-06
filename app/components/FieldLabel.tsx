import React from "react";
import Tooltip from "react-tooltip-lite";
import { Field } from "../model/field/Field";
import { InfoAffordance } from "./InfoAffordance";

export const FieldLabel: React.FunctionComponent<{ field: Field }> = props => {
  const tooltip = props.field.definition.tooltip;
  const specialInfo = props.field.definition.specialInfo;

  const labelElement = (
    <label style={{ display: "inline-block" }}>
      {props.field.labelInUILanguage}
    </label>
  );
  const labelMaybeWithTooltip =
    tooltip && tooltip.length > 0 ? (
      <Tooltip
        tagName={"span"}
        styles={{ display: "inline" }}
        background={"#ffe980"}
        content={tooltip}
      >
        {labelElement}
      </Tooltip>
    ) : (
      labelElement
    );

  return (
    <>
      {labelMaybeWithTooltip}
      {specialInfo ? <InfoAffordance>{specialInfo}</InfoAffordance> : null}
    </>
  );
};
