import { File } from "./File";
import ffmpeg = require("fluent-ffmpeg");
// require("ffprobe-static").path from here in the renderer only gives a partial path (starting inside the ffprobe folder),
// so we retrieved it in the main process and adjusted for dev vs. installed location
const ffprobePath = require("electron").remote.getGlobal("ffprobepath");

//console.log("^^^^^ ffprobe path: " + ffprobePath);
ffmpeg().setFfprobePath(ffprobePath);

async function getInfoForFile(path: string) {
  return new Promise((resolve: any, reject) => {
    ffmpeg.ffprobe(path, (err, result) => {
      if (err) {
        console.error(`error testing ffprobe on '${path}'`);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

export async function loadPropInfoIntoFile(saymoreFile: File) {
  const info = getInfoForFile(saymoreFile.describedFilePath).then(
    (result: any) => {
      console.log(JSON.stringify(result));
      saymoreFile.addTextProperty("Duration", result.format.duration);
      saymoreFile.addTextProperty("Format", result.format.format_long_name);
      /*<fps type="string">30</fps>
  <Duration type="string">00:00:10</Duration>
  <Channels type="string">stereo</Channels>
  <Sample_Rate type="string">48000 Hz</Sample_Rate>
  <Audio_Bit_Rate type="string">96 kbps</Audio_Bit_Rate>
  <Video_Bit_Rate type="string">218 kbps</Video_Bit_Rate>
  <Resolution type="string">176 x 144</Resolution>
  <Frame_Rate type="string">30 frames/second</Frame_Rate>*/
    }
  );
}
