import React from "react";
import Tooltip from "react-tooltip-lite";
// @ts-ignore
import infoIcon from "@assets/info.png";
// just a little 🛈 with a tooltip of whatever children you give it
export const InfoAffordance: React.FunctionComponent<{
  children;
  className?; // enable emotion css from parent
}> = (props) => {
  return (
    // wrapping with a div helps the tooltip to be positioned correctly in some cases (e.g. Notes tab)
    <div className={props.className}>
      <Tooltip
        styles={{ display: "inline" }}
        background={"darkblue"}
        color={"white"}
        content={props.children}
      >
        <img src={infoIcon} style={{ width: "1em", marginLeft: "5px" }} />
      </Tooltip>
    </div>
  );
};
