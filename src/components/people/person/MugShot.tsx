import { observer } from "mobx-react";
import { Person } from "../../../model/Project/Person/Person";
import Dropzone from "react-dropzone";
import * as fs from "fs-extra";
import { MugshotPlaceholder } from "./MugshotPlaceholderIcon";
import ImageField from "../../ImageField";
import "../../common.scss";
import React, { useState } from "react";

export const MugShot: React.FunctionComponent<{
  person: Person;
  unused: string;
}> = observer((props) => {
  const [path, setPath] = useState(props.person.mugshotPath);

  return (
    <Dropzone
      className={"mugshot"}
      activeClassName={"drop-active"}
      onDrop={(accepted, rejected) => {
        if (accepted.length > 0) {
          props.person
            .copyInMugshot((accepted[0] as any).path)
            .then(() => setPath(props.person.mugshotPath));
        }
      }}
      accept="image/jpg,image/jpeg,image/png"
    >
      <div className={"mask onlyIfInDropZone"}>Drop here</div>
      {props.person.mugshotPath &&
      props.person.mugshotPath.length > 0 &&
      fs.existsSync(props.person.mugshotPath) ? (
        <ImageField path={path + "?nocache=" + new Date().getTime()} />
      ) : (
        <MugshotPlaceholder />
      )}
    </Dropzone>
  );
});
