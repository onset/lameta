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
    const addFiles = (paths: string[]) => {
      if (paths.length > 0) {
        props.person.copyInMugshot(paths[0]);
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
              src={`file://${props.person.mugshotPath}`}
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
