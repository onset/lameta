// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import { default as React, useState, useEffect } from "react";
import ReactTable from "react-table";
import { File } from "../model/file/File";
import ffmpeg from "fluent-ffmpeg";
import { i18n } from "../localization";
import { t } from "@lingui/macro";
import exifr from "exifr";

const imagesize = require("image-size");
const humanizeDuration = require("humanize-duration");

type Stats = object;

// require("ffprobe-static").path from here in the renderer only gives a partial path (starting inside the ffprobe folder),
// so we retrieved it in the main process and adjusted for dev vs. installed location
const ffprobePath = require("electron").remote.getGlobal("ffprobepath");
ffmpeg().setFfprobePath(ffprobePath);

export const MediaStats: React.FunctionComponent<{ file: File }> = (props) => {
  const [message, setMessage] = useState<string>("Processing...");
  const [stats, setStats] = useState<Stats>({});

  useEffect(() => {
    getStatsFromFileAsync(props.file).then((s) => {
      setStats(s);
      setMessage("");
    });
  }, [props.file]);

  const columns = [
    {
      id: "key",
      Header: "Stat",
      width: 120,
      accessor: (key) => key,
    },
    {
      id: "value",
      Header: "Value",
      //width: 200,
      accessor: (key) => (stats[key] ? stats[key].toString() : "---"),
    },
  ];

  return (
    <div>
      {message.toString()}
      <ReactTable
        css={css`
          height: 500px;
          border: solid red;
          overflow: auto;
        `}
        className={"mediaStatsTable"}
        showPagination={false}
        defaultPageSize={10000}
        data={Object.keys(stats)}
        sorted={[{ id: "key", asc: true }]}
        columns={columns}
        minRows={0}
      />
    </div>
  );
};

function roundToOneDecimalPlace(n: number): number {
  return Math.round(10 * n) / 10;
}
function getStatsFromFileAsync(file: File): Promise<Stats> {
  switch (file.type) {
    case "Image":
      return new Promise((resolve, reject) => {
        exifr.parse(file.describedFilePath).then((imageStats: Stats) => {
          const dimensions = imagesize(file.describedFilePath);
          imageStats["Height"] = dimensions.height;
          imageStats["Width"] = dimensions.width;
          resolve(imageStats);
        });
      });
      break;

    case "Audio":
    case "Video":
      return new Promise((resolve, reject) => {
        const stats: Stats = {};
        try {
          ffmpeg.ffprobe(file.describedFilePath, (err, result) => {
            if (err) {
              console.error(
                `error testing ffprobe on '${file.describedFilePath}'`
              );
              reject(err);
            } else {
              stats["Length"] = humanizeDuration(
                1000 * result.format.duration,
                {
                  round: true,
                }
              );
              stats["Format"] = result.format.format_long_name;
              result.streams.forEach((stream) => {
                processVideoStream(stream, stats);
              });
              resolve(stats);
            }
          });
        } catch (err) {
          reject(err);
        }
      });
      break;
    default:
      return new Promise((resolve, reject) => {
        reject();
      });
  }
}
function processVideoStream(stream: any, stats: Stats) {
  switch (stream.codec_type) {
    case "audio":
      stats["Audio Codec"] = stream.codec_name;
      stats["Audio Channels"] = stream.channels;
      if (stream.bit_rate) {
        stats["Audio Bit Rate"] =
          Math.round(stream.bit_rate / 1000).toString() + " Kbps";
      }
      if (stream.sample_rate) {
        stats["Audio Sample Rate"] =
          roundToOneDecimalPlace(stream.sample_rate / 1000).toString() + " KHz";
      }
      stats["Audio Bit Depth"] = stream.bits_per_sample
        ? stream.bits_per_sample.toString() + "-bit"
        : "N/A";

      break;
    case "video":
      stats["Video Codec"] = stream.codec_name;
      if (stream.width && stream.height) {
        stats["Resolution"] = `${stream.width} x ${stream.height}`;
      }

      if (stream.avg_frame_rate) {
        stats["Frame rate"] =
          // tslint:disable-next-line:no-eval
          Math.round(eval(stream.avg_frame_rate)) + " fps";
        //"avg_frame_rate":"26910000/896999",
      }
      break;
    default:
      break;
  }
  return stats;
}
