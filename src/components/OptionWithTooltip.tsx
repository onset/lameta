import * as React from "react";
import Tooltip from "react-tooltip-lite";
import { lameta_orange } from "../containers/theme";
import { OptionProps, GroupBase } from "react-select";
import { CSSProperties } from "react";

/* This is a custom option for react-select that shows a tooltip on hover. */

interface OptionData {
  value: string;
  label: string;
  title: string;
  source?: string;
}

export const OptionWithTooltip = (
  props: OptionProps<OptionData, false, GroupBase<OptionData>>
) => {
  const {
    cx,
    data,
    className,
    isDisabled,
    isFocused,
    isSelected,
    innerRef,
    innerProps,
    getStyles
  } = props;
  return (
    <Tooltip
      direction="down"
      content={<div style={{ overflowWrap: "break-word" }}>{data.title}</div>}
      styles={{ display: "inline" }}
      background={"#486BAD"}
      color={"white"}
    >
      <div
        {...innerProps} // Add this line to handle clicks and other events
        style={{
          ...(getStyles("option", props) as CSSProperties),
          backgroundColor: props.isFocused ? lameta_orange : "white",
          fontWeight: props.isSelected ? "bold" : "normal",
          fontStyle: props.data.source === "custom" ? "italic" : "normal",
          color: "black"
        }}
        className={cx(
          {
            option: true,
            "option--is-disabled": isDisabled,
            "option--is-focused": isFocused,
            "option--is-selected": isSelected
          },
          className
        )}
        ref={innerRef}
      >
        {data.label}
      </div>
    </Tooltip>
  );
};
