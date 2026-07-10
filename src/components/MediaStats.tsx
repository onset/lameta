import { css } from "@emotion/react";
import { default as React, useState, useEffect } from "react";
import { observer } from "mobx-react";
import ReactTable from "react-table-6";
import { t } from "@lingui/macro";
import { File } from "../model/file/File";
import ffmpeg from "fluent-ffmpeg";
import ExifReader from "exifreader";
import fs from "fs";
import * as Path from "path";

//const imagesize = require("image-size");
const humanizeDuration = require("humanize-duration");

type Stats = Record<string, string>;

let ffprobePath = require("ffmpeg-ffprobe-static").ffprobePath;
//console.log("raw ffprobePath: " + ffprobePath);
// for mac & windows when installed
ffprobePath = ffprobePath.replace("app.asar", "app.asar.unpacked");
//console.log(`final ffprobePath: ${ffprobePath}`);
ffmpeg.setFfprobePath(ffprobePath);

// The minimal shape decideMediaStatsFlow() needs from a File. Kept narrow
// (rather than importing the whole `File` type) so this stays trivially
// unit-testable with a plain object.
export interface IMediaStatsCacheHost {
  isCloudFileNotPresent: boolean;
  getCachedMediaStats(): Record<string, string> | undefined;
}

// Note: deliberately holds no user-facing text -- that's translated at
// render/use time (see MediaStats below) so this stays both unit-testable
// without an i18n context and fully localized for the user.
export type MediaStatsFlow =
  | { kind: "cached"; stats: Stats; recordedWhileCloudOnly: boolean }
  | { kind: "blocked" }
  | { kind: "probe" };

// Decide, without touching the file's content, whether to show cached stats,
// show a "not available on this device yet" message, or go probe the file.
// Pulled out of the component so it can be unit-tested without React/ffmpeg/ExifReader.
export function decideMediaStatsFlow(
  file: IMediaStatsCacheHost
): MediaStatsFlow {
  const cached = file.getCachedMediaStats();
  if (cached) {
    return {
      kind: "cached",
      stats: cached,
      recordedWhileCloudOnly: file.isCloudFileNotPresent
    };
  }
  if (file.isCloudFileNotPresent) {
    return { kind: "blocked" };
  }
  return { kind: "probe" };
}

export const MediaStats: React.FunctionComponent<{ file: File }> = observer(
  (props) => {
    const [message, setMessage] = useState<string>("");
    const [stats, setStats] = useState<Stats>({});

    useEffect(() => {
      const flow = decideMediaStatsFlow(props.file);
      switch (flow.kind) {
        case "cached":
          setMessage("");
          setStats(
            flow.recordedWhileCloudOnly
              ? {
                  ...flow.stats,
                  [t`Note`]: t`recorded when the file was last on this device`
                }
              : flow.stats
          );
          break;
        case "blocked":
          setMessage("");
          setStats({
            [t`Status`]: t`Available after this file is made available on this device`
          });
          break;
        case "probe":
          setMessage("Processing...");
          getStatsFromFileAsync(props.file)
            .then((s) => {
              setStats(s);
              setMessage("");
              if (!s.error) {
                props.file.setCachedMediaStats(s, {
                  sizeBytes: props.file.getSizeInBytes(),
                  mtimeMs: props.file.getMtimeMs()
                });
              }
            })
            .catch((err) => {
              // ffprobe can reject (corrupt file, unsupported codec, or a cloud
              // file that failed to hydrate). Without this, the panel stays stuck
              // on "Processing..." forever with no recovery. Surface the failure
              // instead of swallowing the rejection.
              console.warn(
                `getStatsFromFileAsync failed for ${props.file.getActualFilePath()}: ${err}`
              );
              setMessage("");
              setStats({
                [t`Status`]: t`Could not read media information for this file.`
              });
            });
          break;
      }
    }, [props.file, props.file.cloudStatus]);

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
  }
);

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
              stats["Format"] = result.format.format_long_name ?? "";
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
function processVideoStream(stream: ffmpeg.FfprobeStream, stats: Stats) {
  switch (stream.codec_type) {
    case "audio":
      stats["Audio Codec"] = stream.codec_name ?? "";
      if (stream.channels !== undefined) {
        stats["Audio Channels"] = stream.channels.toString();
      }
      if (stream.bit_rate) {
        const br = Number(stream.bit_rate);
        stats["Audio Bit Rate"] = Math.round(br / 1000).toString() + " Kbps";
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
      stats["Video Codec"] = stream.codec_name ?? "";
      if (stream.width && stream.height) {
        stats["Resolution"] = `${stream.width} x ${stream.height}`;
      }

      if (stream.avg_frame_rate) {
        const frmRate = Number(stream.avg_frame_rate);
        stats["Frame rate"] = Math.round(frmRate) + " fps";
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
