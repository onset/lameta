import * as React from "react";
import { observer } from "mobx-react";
import { Person } from "../../../model/Project/Person/Person";
import Dropzone from "react-dropzone";
import * as fs from "fs-extra";
import { MugshotPlaceholder } from "./MugshotPlaceholder";
import ImageField from "../../ImageField";
import "../../common.scss";

export interface IProps {
  person: Person;
  unused: string;
}

@observer
export default class MugShot extends React.Component<IProps> {
  private onMugShotDrop(
    acceptedFiles: Dropzone.ImageFile[],
    rejectedFiles: Dropzone.ImageFile[]
  ) {
    if (acceptedFiles.length > 0) {
      this.props.person.mugshotPath = acceptedFiles[0].path;
    }
  }

  public render() {
    //console.log("render mugshot with path " + this.props.person.mugshotPath);
    return (
      <Dropzone
        className={"mugshot"}
        activeClassName={"drop-active"}
        onDrop={this.onMugShotDrop.bind(this)}
        accept="image/jpg,image/jpeg,image/png"
      >
        <div className={"mask onlyIfInDropZone"}>Drop here</div>
        {this.props.person.mugshotPath &&
        this.props.person.mugshotPath.length > 0 &&
        fs.existsSync(this.props.person.mugshotPath) ? (
          <ImageField
            path={
              this.props.person.mugshotPath + "?nocache=" + new Date().getTime()
            }
          />
        ) : (
          <MugshotPlaceholder />
        )}
      </Dropzone>
    );
  }
}
