import ffmpeg = require("fluent-ffmpeg");
// require("ffprobe-static").path from here in the renderer only gives a partial path (starting inside the ffprobe folder),
// so we retrieved it in the main process and adjusted for dev vs. installed location
const ffprobePath = require("electron").remote.getGlobal("ffprobepath");

//console.log("^^^^^ ffprobe path: " + ffprobePath);
ffmpeg().setFfprobePath(ffprobePath);

export function getInfoForFile(path: string, callback: (result: any) => void) {
  ffmpeg.ffprobe(path, (err, result) => {
    if (err) {
      console.error(`error testing ffprobe on '${path}'`);
      console.error(err);
      callback({});
    } else {
      callback(result);
    }
  });
}
