import * as React from "react";
import ReactTable from "react-table";
import { observable } from "mobx";
import { observer } from "mobx-react";
import { File } from "../model/file/File";
import ffmpeg = require("fluent-ffmpeg");
import { Dictionary } from "typescript-collections";
const imagesize = require("image-size");
const humanizeDuration = require("humanize-duration");

// require("ffprobe-static").path from here in the renderer only gives a partial path (starting inside the ffprobe folder),
// so we retrieved it in the main process and adjusted for dev vs. installed location
const ffprobePath = require("electron").remote.getGlobal("ffprobepath");
ffmpeg().setFfprobePath(ffprobePath);

export interface IProps {
  file: File;
}

export default class MediaStats extends React.Component<IProps> {
  private stats: Dictionary<string, string>;
  public constructor(props: IProps) {
    super(props);
    this.stats = new Dictionary<string, string>();
    //this.state = { stats: [] };
  }

  public componentWillMount() {
    this.updateStats(this.props.file).then(() => this.setState({}));
  }
  public componentWillReceiveProps(nextProps: IProps) {
    // for the bug that prompted using this, see https://trello.com/c/9keiiGFA
    this.updateStats(nextProps.file).then(() => this.setState({}));
  }

  public static isMedia(file: File): boolean {
    return ["Image", "Audio", "Video"].indexOf(file.type) > -1;
  }
  private async updateStats(file: File) {
    this.stats.clear();
    return new Promise((resolve: any, reject) => {
      switch (file.type) {
        case "Image":
          const dimensions = imagesize(file.describedFilePath);
          this.stats.setValue("width", dimensions.width.toString());
          this.stats.setValue("height", dimensions.height.toString());
          resolve();
          break;
        case "Audio":
        case "Video":
          ffmpeg.ffprobe(file.describedFilePath, (err, result) => {
            if (err) {
              console.error(
                `error testing ffprobe on '${file.describedFilePath}'`
              );
              reject(err);
            } else {
              this.addStat(
                "Duration",
                humanizeDuration(1000 * result.format.duration, {
                  round: true
                })
              );
              this.addStat("Format", result.format.format_long_name);
              resolve(result);
            }
          });
          break;
      }
    });
  }
  private addStat(key: string, value: string) {
    if (value && value.length > 0) {
      this.stats.setValue(key, value);
    }
  }

  public render() {
    const columns = [
      {
        id: "key",
        Header: "Stat",
        width: 80,
        accessor: key => key
      },
      {
        id: "value",
        Header: "Value",
        //width: 200,
        accessor: key => this.stats.getValue(key)
      }
    ];

    return (
      <ReactTable
        className={"mediaStatsTable"}
        showPagination={false}
        data={this.stats.keys()}
        columns={columns}
        minRows={0}
      />
    );
  }
}
