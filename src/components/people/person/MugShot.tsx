import { css } from "@emotion/react";
import * as React from "react";
import { observer } from "mobx-react";
import { Person } from "../../../model/Project/Person/Person";
import { ElectronDropZone } from "../../ElectronDropZone";

export interface IMugShotProps {
  person: Person;
}

export const MugShot: React.FunctionComponent<IMugShotProps> = observer(
  (props) => {
    const [refreshKey, setRefreshKey] = React.useState(0);

    const addFiles = (paths: string[]) => {
      console.log("MugShot.addFiles called with paths:", paths);
      if (paths.length > 0) {
        console.log("MugShot: calling copyInMugshot with path:", paths[0]);
        console.log("MugShot: current mugshotPath before copy:", props.person.mugshotPath);
        console.log("MugShot: current files count before copy:", props.person.files.length);
        
        props.person.copyInMugshot(paths[0]).then(() => {
          console.log("MugShot: copyInMugshot completed successfully");
          console.log("MugShot: current mugshotPath after copy:", props.person.mugshotPath);
          console.log("MugShot: current files count after copy:", props.person.files.length);
          console.log("MugShot: all files after copy:", props.person.files.map(f => f.pathInFolderToLinkFileOrLocalCopy));
          
          // Force a re-render by updating the refresh key
          setRefreshKey(prev => prev + 1);
        }).catch((error) => {
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

    const getContainerStyle = (isDragActive: boolean = false) => css`
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      width: 100px;
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
      background-color: ${isDragActive ? "#e8f4fd" : "#f9f9f9"};
      border-color: ${isDragActive ? "#007ACC" : "#ccc"};
      transition: all 0.2s ease;

      &:hover {
        background-color: #f0f0f0;
        border-color: #007acc;
      }
    `;

    const imageStyle = css`
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
    `;

    const placeholderStyle = css`
      color: #666;
      font-size: 12px;
      text-align: center;
      padding: 4px;
    `;

    return (
      <ElectronDropZone fileCanBeDropped={fileCanBeDropped} addFiles={addFiles}>
        <div css={getContainerStyle()}>
          <input type="file" style={{ display: "none" }} />
          {props.person.mugshotPath ? (
            <img
              key={refreshKey} // Force re-render when refreshKey changes
              src={`file://${props.person.mugshotPath}?t=${refreshKey}`} // Add cache-busting parameter
              alt="Person mugshot"
              css={imageStyle}
            />
          ) : (
            <div css={placeholderStyle}>Drop image here or click to select</div>
          )}
        </div>
      </ElectronDropZone>
    );
  }
);
