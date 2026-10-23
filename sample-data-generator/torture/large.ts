// Large and broken media, about 1.9 GB in all. A file that is already
// there with the expected size is kept, so running the generator again is quick.

import { spawnSync } from "child_process";
import * as fs from "fs";
import { Context } from "./cases";
import * as m from "./media";
import { lametaSession } from "./xml";

const folder = "BIG_media";

function writeStreamed(
  path: string,
  header: Buffer,
  totalDataBytes: number,
  chunk: (offset: number, length: number) => Buffer,
) {
  const fd = fs.openSync(path, "w");
  try {
    fs.writeSync(fd, header);
    const step = 8 * 1024 * 1024;
    for (let offset = 0; offset < totalDataBytes; offset += step) {
      fs.writeSync(fd, chunk(offset, Math.min(step, totalDataBytes - offset)));
    }
  } finally {
    fs.closeSync(fd);
  }
}

function have(path: string, minBytes: number) {
  return fs.existsSync(path) && fs.statSync(path).size >= minBytes;
}

export function writeLargeMedia(ctx: Context, ffmpeg: string | undefined): string[] {
  const { w } = ctx;
  const skipped: string[] = [];
  const dir = `Sessions/${folder}`;
  w.file(
    `${dir}/${folder}.session`,
    lametaSession({
      id: folder,
      title: "Large and broken media",
      date: "2024-12-01",
      genre: "narrative",
      access: "O",
      contributions: [{ name: "Nɔkɔ Ɛsi", role: "speaker" }],
    }),
  );
  w.note(
    dir,
    "Large and broken media for copy, export, cloud and player tests.",
    "CopyManager, MediaStats ffprobe, video player, IMDI/OPEX copy, cloud hydration",
  );

  // about 1 GB of playable 1080p H.264: noise defeats compression so the bit rate holds
  const video = w.abs(`${dir}/BIG_video_1GB_20241201.mp4`);
  if (!have(video, 900_000_000)) {
    if (ffmpeg) {
      console.log("Encoding the 1 GB video (a few minutes)...");
      const r = spawnSync(
        ffmpeg,
        [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "testsrc2=size=1920x1080:rate=30:duration=400,noise=alls=40:allf=t",
          "-f",
          "lavfi",
          "-i",
          "sine=frequency=330:sample_rate=48000:duration=400",
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-b:v",
          "20M",
          "-minrate",
          "20M",
          "-maxrate",
          "20M",
          "-bufsize",
          "20M",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
          "-fflags",
          "+bitexact",
          "-flags",
          "+bitexact",
          "-map_metadata",
          "-1",
          video,
        ],
        { stdio: "inherit" },
      );
      if (r.status !== 0) skipped.push("BIG_video_1GB (ffmpeg failed)");
    } else skipped.push("BIG_video_1GB (no ffmpeg)");
  }
  w.note(
    `${dir}/BIG_video_1GB_20241201.mp4`,
    "About 1 GB of playable 1080p video, moov atom at the front.",
    "copy-in progress, video player, ffprobe, IMDI/OPEX copy, cloud hydration",
  );

  // the first 300 MB of that video: ffprobe still reports the full duration
  const truncated = w.abs(`${dir}/BIG_video_truncated_20241201.mp4`);
  if (fs.existsSync(video) && !have(truncated, 300_000_000)) {
    const fdIn = fs.openSync(video, "r");
    const fdOut = fs.openSync(truncated, "w");
    const buf = Buffer.alloc(8 * 1024 * 1024);
    let copied = 0;
    while (copied < 300_000_000) {
      const n = fs.readSync(fdIn, buf, 0, Math.min(buf.length, 300_000_000 - copied), copied);
      if (n <= 0) break;
      fs.writeSync(fdOut, buf, 0, n);
      copied += n;
    }
    fs.closeSync(fdIn);
    fs.closeSync(fdOut);
  }
  w.note(
    `${dir}/BIG_video_truncated_20241201.mp4`,
    "The first 300 MB of the 1 GB video: the header promises 400 seconds and the data stops at about 120.",
    "video player, ffprobe duration, IMDI",
  );

  // about 500 MB of 48 kHz stereo WAV
  const wavPath = w.abs(`${dir}/BIG_audio_500MB_20241201.wav`);
  const rate = 48000;
  const frames = rate * 2700; // 45 minutes
  const dataBytes = frames * 4;
  if (!have(wavPath, dataBytes)) {
    console.log("Writing the 500 MB WAV...");
    writeStreamed(wavPath, m.wavHeader(dataBytes, rate, 2), dataBytes, (offset, length) => {
      const b = Buffer.alloc(length);
      for (let i = 0; i < length; i += 4) {
        const frame = (offset + i) / 4;
        const v = Math.round(Math.sin((2 * Math.PI * 220 * frame) / rate) * 6000);
        b.writeInt16LE(v, i);
        b.writeInt16LE(v, i + 2);
      }
      return b;
    });
  }
  w.note(
    `${dir}/BIG_audio_500MB_20241201.wav`,
    "About 500 MB of WAV (45 minutes, 48 kHz stereo).",
    "audio player, waveform, ffprobe, copy",
  );

  // 50 MB of random bytes with a video extension
  const garbagePath = w.abs(`${dir}/BIG_garbage_50MB_20241201.mp4`);
  if (!have(garbagePath, 50_000_000)) {
    const rand = m.seededRandom(99);
    writeStreamed(garbagePath, Buffer.alloc(0), 50_000_000, (_o, length) => {
      const b = Buffer.alloc(length);
      for (let i = 0; i < length; i += 4) b.writeUInt32LE(Math.floor(rand() * 4294967296), i);
      return b;
    });
  }
  w.note(
    `${dir}/BIG_garbage_50MB_20241201.mp4`,
    "50 MB of random bytes named .mp4.",
    "video player, ffprobe, MediaStats error handling",
  );

  w.file(`${dir}/BIG_zero_20241201.mp4`, "");
  w.file(`${dir}/BIG_zero_20241201.wav`, "");
  w.note(
    `${dir}/BIG_zero_20241201.mp4`,
    "Zero-byte .mp4 and .wav next to the large files.",
    "players, ffprobe",
  );
  return skipped;
}
