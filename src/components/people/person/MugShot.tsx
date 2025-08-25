import { css } from "@emotion/react";
import * as React from "react";
import { observer } from "mobx-react";
import { Person } from "../../../model/Project/Person/Person";
import { ElectronDropZone } from "../../ElectronDropZone";
import ImageField from "../../ImageField";
import { MugshotPlaceholder } from "./MugshotPlaceholderIcon";
import * as fs from "fs-extra";
import "../../common.css";

export interface IMugShotProps {
  person: Person;
}

export const MugShot: React.FunctionComponent<IMugShotProps> = observer(
  (props) => {
    const [refreshKey, setRefreshKey] = React.useState(0);
    const [path, setPath] = React.useState(props.person.mugshotPath);

    const addFiles = (paths: string[]) => {
      if (paths.length > 0) {
        props.person
          .copyInMugshot(paths[0])
          .then(() => {
            // Keep both: re-render and update the displayed path to add nocache
            setPath(props.person.mugshotPath);
            setRefreshKey((prev) => prev + 1);
          })
          .catch((error) => {
            console.error("MugShot: copyInMugshot failed:", error);
          });
      }
    };

    const fileCanBeDropped = (path: string): boolean => {
      const imageExtensions = [
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".bmp",
        ".webp"
      ];
      const ext = path.toLowerCase().substring(path.lastIndexOf("."));
      return imageExtensions.includes(ext);
    };

    // Keep the container positioned to anchor the overlay mask from common.css
    const rootStyle = css`
      position: relative;
      cursor: pointer;
    `;

    return (
      <ElectronDropZone fileCanBeDropped={fileCanBeDropped} addFiles={addFiles}>
        <div className="mugshot" css={rootStyle}>
          <div className="mask onlyIfInDropZone">Drop here</div>
          {props.person.mugshotPath &&
          props.person.mugshotPath.length > 0 &&
          fs.existsSync(props.person.mugshotPath) ? (
            <ImageField
              path={
                (path || props.person.mugshotPath) + "?nocache=" + refreshKey
              }
            />
          ) : (
            <MugshotPlaceholder />
          )}
        </div>
      </ElectronDropZone>
    );
  }
);
