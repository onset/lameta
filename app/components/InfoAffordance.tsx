import React from "react";
import Tooltip from "react-tooltip-lite";
import infoIcon from "info.png";
// just a little 🛈 with a tooltip of whatever children you give it
export const InfoAffordance: React.FunctionComponent<{}> = props => {
  return (
    <Tooltip
      styles={{ display: "inline" }}
      background={"darkblue"}
      color={"white"}
      content={props.children}
    >
      <img src={infoIcon} style={{ width: "12px", marginLeft: "5px" }} />
    </Tooltip>
  );
};
