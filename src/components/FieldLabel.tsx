import React, { useMemo } from "react";
import Tooltip from "react-tooltip-lite";
import { FieldDefinition } from "../model/field/FieldDefinition";
import {
  InfoAffordance,
  NotConsumedByArchive,
  PiiAffordance
} from "./InfoAffordance";
import userSettingsSingleton from "../other/UserSettings";
import { translateFieldLabel, translateTip } from "../other/localization";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";

export const FieldLabel: React.FunctionComponent<{
  fieldDef: FieldDefinition;
  htmlFor?: string; // aria for accessibility (react requires 'htmlFor')
  omitInfoAffordances?: boolean;
}> = observer((props) => {
  const tooltip = useMemo(() => translateTip(props.fieldDef.tooltip), [
    props.fieldDef
  ]);

  const labelElement = (
    <label
      htmlFor={props.htmlFor}
      style={{ display: "inline-block" }}
      // at one poitn we greyed out these fields, but the icon with tooltip should be sufficient
      // className={
      //   userSettingsSingleton.IMDIMode && props.fieldDef.markAsNotImdi
      //     ? "markAsNotImdi"
      //     : ""
      // }
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
        // wrapping in a span prevents an error when the tooltip text has problematic characters
        content={<span>{tooltip}</span>}
      >
        <span style={{ maxWidth: "100px" }}>{labelElement}</span>
      </Tooltip>
    ) : (
      labelElement
    );

  return (
    <div className="field-label" style={{ display: "flex" }}>
      {labelMaybeWithTooltip}
      {!props.omitInfoAffordances && (
        <FieldInfoAffordances fieldDef={props.fieldDef} />
      )}
    </div>
  );
});
export const FieldInfoAffordances: React.FunctionComponent<{
  fieldDef: FieldDefinition;
}> = observer((props) => {
  const tipOnUsingThisField = useMemo(
    () => translateTip(props.fieldDef.tipOnUsingThisField),
    [props.fieldDef]
  );

  return (
    <div style={{ display: "flex" }}>
      {tipOnUsingThisField && (
        <InfoAffordance>{tipOnUsingThisField}</InfoAffordance>
      )}
      {props.fieldDef.personallyIdentifiableInformation && <PiiAffordance />}

      {userSettingsSingleton.IMDIMode && props.fieldDef.markAsNotImdi && (
        <NotConsumedByArchive />
      )}
    </div>
  );
});
