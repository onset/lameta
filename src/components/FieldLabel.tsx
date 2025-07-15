import React, { useMemo } from "react";
import Tooltip from "react-tooltip-lite";
import { FieldDefinition } from "../model/field/FieldDefinition";
import {
  CommaSeparatedIndicator,
  InfoIndicator,
  NotConsumedByArchiveIndicator,
  PiiIndicator
} from "./FieldIndicators";
import { translateFieldLabel, translateTip } from "../other/localization";
import { observer } from "mobx-react";
import { tooltipBackground } from "../containers/theme";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";

export const FieldLabel: React.FunctionComponent<{
  fieldDef: FieldDefinition;
  htmlFor?: string; // aria for accessibility (react requires 'htmlFor')
  omitInfoAffordances?: boolean;
}> = observer((props) => {
  const tooltip = useMemo(
    () => translateTip(props.fieldDef.description),
    [props.fieldDef]
  );

  const labelElement = (
    <label htmlFor={props.htmlFor} style={{ display: "inline-block" }}>
      {translateFieldLabel(props.fieldDef)}
    </label>
  );

  const labelMaybeWithTooltip =
    tooltip && tooltip.length > 0 ? (
      <Tooltip
        tagName={"span"}
        className={"tooltipWrapper"} // would have no wrapper, but at least reminds us why it is there
        styles={{ display: "inline" }}
        background={tooltipBackground}
        color={"white"}
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
  // const tipOnUsingThisField = useMemo(
  //   () => translateTip(props.fieldDef.tipOnUsingThisField),
  //   [props.fieldDef]
  // );

  return (
    <div style={{ display: "flex" }}>
      {/* I've gone back and forth on this... in some cases it seems optimal to show an info
         icon for each description. But in others, the screen gets too crowded. Currently
         I'm going with the description by hovering over the label.
         
         " className=""></label>{props.fieldDef.description && (
        <InfoAffordance>{props.fieldDef.description}</InfoAffordance>
      )} */}
      {props.fieldDef.personallyIdentifiableInformation && <PiiIndicator />}
      {props.fieldDef.tipOnUsingThisField && (
        <InfoIndicator>{props.fieldDef.tipOnUsingThisField}</InfoIndicator>
      )}
      {props.fieldDef.separatorWithCommaInstructions && (
        <CommaSeparatedIndicator>
          {props.fieldDef.separatorWithCommaInstructions}
        </CommaSeparatedIndicator>
      )}

      {GetOtherConfigurationSettings().archiveUsesImdi &&
        props.fieldDef.omitFromImdi && <NotConsumedByArchiveIndicator />}
    </div>
  );
});
