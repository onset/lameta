// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import { default as React, useState, useEffect } from "react";
import ReactTable from "react-table-6";
import { File } from "../model/file/File";
import ffmpeg from "fluent-ffmpeg";
// import { i18n } from "../localization";
// import { t } from "@lingui/macro";
import ExifReader from "exifreader";
import fs from "fs";
import * as Path from "path";

//const imagesize = require("image-size");
const humanizeDuration = require("humanize-duration");

type Stats = object;

// require("ffprobe-static").path from here in the renderer only gives a partial path (starting inside the ffprobe folder),
// so we retrieved it in the main process and adjusted for dev vs. installed location
// const ffprobePath = require("@electron/remote").getGlobal("ffprobepath");
// ffmpeg().setFfprobePath(ffprobePath);

// const ffmpegPath = require("ffmpeg-static").replace(
//   "app.asar",
//   "" //app.asar.unpacked"
// );

// ffmpeg.setFfmpegPath(ffmpegPath);
const x = require("ffprobe-static").path;
console.log(`ffprobe-static.path=${x}`);
const ffprobePath = require("ffprobe-static")
  .path // during run from release (win-unpacked or installed)
  .replace("app.asar", ""); // on windows, both installed and not installed, win-unpacked/resources/node_modules/ffprobe-static exists
console.log(`adjusted ffprobe-static.path=${ffprobePath}`);
ffmpeg.setFfprobePath(ffprobePath);

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
      accessor: (key) => key
    },
    {
      id: "value",
      Header: "Value",
      //width: 200,
      accessor: (key) => (stats[key] ? stats[key].toString() : "---")
    }
  ];

  return (
    <div>
      {message.toString()}
      <ReactTable
        css={css`
          border: solid red;
          overflow: auto;
        `}
        className={"mediaStatsTable"}
        showPagination={false}
        defaultPageSize={10000}
        data={Object.keys(stats)}
        sorted={[{ id: "key", desc: false }]}
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
        try {
          const ext = Path.extname(file.getActualFilePath())
            .toLowerCase()
            .replace(/\./g, "");
          if (ext === "bmp") {
            resolve({ error: "lameta cannot read metadata of bmp files." });
          }
          const buffer = readSyncEnoughForTags(file.getActualFilePath());
          const tags = ExifReader.load(buffer);
          const y = {};
          Object.keys(tags).forEach((k) => {
            if (tags[k].description) y[k] = tags[k].description;
          });
          //normally this comes in as "Image Height/Width" from ExifReader,
          //but not always (e.g. if it's from a paint program instead a camera).
          // We'll see if we get complaints, and then can figure out how to incorporate this second opinion from imagesize.
          resolve(y);
        } catch (err) {
          resolve({ error: err.message });
        }
      });
      break;

    case "Audio":
    case "Video":
      return new Promise((resolve, reject) => {
        const stats: Stats = {};
        try {
          ffmpeg.ffprobe(file.getActualFilePath(), (err, result) => {
            if (err) {
              console.error(
                `error testing ffprobe on '${file.getActualFilePath()}'`
              );
              reject(err);
            } else if (result && result.format && result.format.duration) {
              stats["Length"] = humanizeDuration(
                1000 * result.format.duration,
                {
                  round: true
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

// ExifReader docs say:
//In some cases it can make sense to only load the beginning of the image file.
// It's unfortunately not possible to know how big the meta data will be in an image,
// but if you limit yourself to regular Exif tags you can most probably get by with
// In some cases it can make sense to only load the beginning of the image file.
// It's unfortunately not possible to know how big the meta data will be in an image,
// but if you limit yourself to regular Exif tags you can most probably get by with only
// reading the first 128 kB. This may exclude IPTC and XMP metadata though (and possibly
// Exif too if they come in an irregular order) so please check if this optimization fits
// your use case. only reading the first 128 kB. This may exclude IPTC and XMP metadata
// though (and possibly Exif too if they come in an irregular order)
// so please check if this optimization fits your use case.
function readSyncEnoughForTags(path) {
  const kMaxBytes = 1024 * 1024; // (first meg... being conservative)
  const buf = Buffer.alloc(kMaxBytes);
  const fd = fs.openSync(path, "r");
  fs.readSync(fd, buf, 0, kMaxBytes, 0);
  fs.closeSync(fd);
  return buf;
}
