// Media for the generated project. Formats with a simple layout are written here byte
// by byte, so they are identical on every machine. Compressed formats come from ffmpeg,
// run with its bit-exact flags; their bytes can still differ between ffmpeg versions.

import { spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as zlib from "zlib";

// mulberry32: a seeded generator, so "random" content is the same on every run
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function garbage(bytes: number, seed: number): Buffer {
  const rand = seededRandom(seed);
  const b = Buffer.alloc(bytes);
  for (let i = 0; i < bytes; i++) b[i] = Math.floor(rand() * 256);
  return b;
}

function pcmSamples(seconds: number, rate: number, channels: number, frequency: number): Buffer {
  const frames = Math.round(seconds * rate);
  const b = Buffer.alloc(frames * channels * 2);
  for (let i = 0; i < frames; i++) {
    const v = Math.round(Math.sin((2 * Math.PI * frequency * i) / rate) * 8000);
    for (let c = 0; c < channels; c++) b.writeInt16LE(v, (i * channels + c) * 2);
  }
  return b;
}

export function wavHeader(
  dataBytes: number,
  rate: number,
  channels: number,
  riffSizeOverride?: number,
): Buffer {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0, "ascii");
  h.writeUInt32LE(riffSizeOverride ?? 36 + dataBytes, 4);
  h.write("WAVE", 8, "ascii");
  h.write("fmt ", 12, "ascii");
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * channels * 2, 28);
  h.writeUInt16LE(channels * 2, 32);
  h.writeUInt16LE(16, 34);
  h.write("data", 36, "ascii");
  h.writeUInt32LE(riffSizeOverride !== undefined ? riffSizeOverride - 36 : dataBytes, 40);
  return h;
}

export function wav(seconds = 1, rate = 8000, channels = 1, frequency = 440): Buffer {
  const data = pcmSamples(seconds, rate, channels, frequency);
  return Buffer.concat([wavHeader(data.length, rate, channels), data]);
}

// Sun .au: big-endian 16-bit PCM
export function au(seconds = 1, rate = 8000): Buffer {
  const le = pcmSamples(seconds, rate, 1, 330);
  const data = Buffer.alloc(le.length);
  for (let i = 0; i < le.length; i += 2) data.writeInt16BE(le.readInt16LE(i), i);
  const h = Buffer.alloc(24);
  h.write(".snd", 0, "ascii");
  h.writeUInt32BE(24, 4);
  h.writeUInt32BE(data.length, 8);
  h.writeUInt32BE(3, 12); // 16-bit linear PCM
  h.writeUInt32BE(rate, 16);
  h.writeUInt32BE(1, 20);
  return Buffer.concat([h, data]);
}

// 80-bit IEEE extended, which AIFF uses for the sample rate
function extended80(n: number): Buffer {
  const b = Buffer.alloc(10);
  let exp = Math.floor(Math.log2(n));
  const mant = n / Math.pow(2, exp);
  exp += 16383;
  b.writeUInt16BE(exp, 0);
  const hi = Math.floor(mant * 0x80000000);
  b.writeUInt32BE(hi >>> 0, 2);
  b.writeUInt32BE(0, 6);
  return b;
}

export function aiff(seconds = 1, rate = 8000): Buffer {
  const le = pcmSamples(seconds, rate, 1, 550);
  const data = Buffer.alloc(le.length);
  for (let i = 0; i < le.length; i += 2) data.writeInt16BE(le.readInt16LE(i), i);
  const comm = Buffer.alloc(26);
  comm.write("COMM", 0, "ascii");
  comm.writeUInt32BE(18, 4);
  comm.writeUInt16BE(1, 8);
  comm.writeUInt32BE(data.length / 2, 10);
  comm.writeUInt16BE(16, 14);
  extended80(rate).copy(comm, 16);
  const ssndHeader = Buffer.alloc(16);
  ssndHeader.write("SSND", 0, "ascii");
  ssndHeader.writeUInt32BE(8 + data.length, 4);
  const form = Buffer.alloc(12);
  form.write("FORM", 0, "ascii");
  form.writeUInt32BE(4 + comm.length + ssndHeader.length + data.length, 4);
  form.write("AIFF", 8, "ascii");
  return Buffer.concat([form, comm, ssndHeader, data]);
}

function pixel(x: number, y: number, w: number, h: number): [number, number, number] {
  return [Math.round((255 * x) / w), Math.round((255 * y) / h), 128];
}

export function bmp(w = 16, h = 16): Buffer {
  const rowBytes = Math.ceil((w * 3) / 4) * 4;
  const pixels = Buffer.alloc(rowBytes * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y, w, h);
      const o = (h - 1 - y) * rowBytes + x * 3;
      pixels[o] = b;
      pixels[o + 1] = g;
      pixels[o + 2] = r;
    }
  const hdr = Buffer.alloc(54);
  hdr.write("BM", 0, "ascii");
  hdr.writeUInt32LE(54 + pixels.length, 2);
  hdr.writeUInt32LE(54, 10);
  hdr.writeUInt32LE(40, 14);
  hdr.writeInt32LE(w, 18);
  hdr.writeInt32LE(h, 22);
  hdr.writeUInt16LE(1, 26);
  hdr.writeUInt16LE(24, 28);
  hdr.writeUInt32LE(pixels.length, 34);
  return Buffer.concat([hdr, pixels]);
}

const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function png(w = 16, h = 16): Buffer {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const [r, g, b] = pixel(x, y, w, h);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

// a 1x1 GIF89a
export function gif(): Buffer {
  return Buffer.from(
    "47494638396101000100800000ff000000000021f90401000000002c00000000010001000002024401003b",
    "hex",
  );
}

// uncompressed RGB TIFF, little-endian
export function tiff(w = 8, h = 8): Buffer {
  const pixels = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      pixel(x, y, w, h).forEach((v, i) => (pixels[(y * w + x) * 3 + i] = v));
  const entries: Array<[number, number, number, number]> = [
    [256, 3, 1, w],
    [257, 3, 1, h],
    [258, 3, 1, 8],
    [259, 3, 1, 1],
    [262, 3, 1, 2],
    [273, 4, 1, 8],
    [277, 3, 1, 3],
    [278, 3, 1, h],
    [279, 4, 1, pixels.length],
  ];
  const ifdOffset = 8 + pixels.length;
  const head = Buffer.alloc(8);
  head.write("II", 0, "ascii");
  head.writeUInt16LE(42, 2);
  head.writeUInt32LE(ifdOffset, 4);
  const ifd = Buffer.alloc(2 + entries.length * 12 + 4);
  ifd.writeUInt16LE(entries.length, 0);
  entries.forEach(([tag, type, count, value], i) => {
    const o = 2 + i * 12;
    ifd.writeUInt16LE(tag, o);
    ifd.writeUInt16LE(type, o + 2);
    ifd.writeUInt32LE(count, o + 4);
    if (type === 3) ifd.writeUInt16LE(value, o + 8);
    else ifd.writeUInt32LE(value, o + 8);
  });
  return Buffer.concat([head, pixels, ifd]);
}

export function svg(label: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#2a6"/><text x="4" y="36" font-size="10">${label}</text></svg>\n`,
  );
}

export function findFfmpeg(): string | undefined {
  const candidates = [process.env.FFMPEG, "ffmpeg"];
  for (const c of candidates) {
    if (!c) continue;
    const r = spawnSync(c, ["-hide_banner", "-version"], { encoding: "utf8" });
    if (r.status === 0) return c;
  }
  // lameta ships ffmpeg through its dependencies
  for (const rel of [
    "node_modules/ffmpeg-ffprobe-static/ffmpeg.exe",
    "node_modules/ffmpeg-ffprobe-static/ffmpeg",
  ]) {
    const p = path.resolve(__dirname, "../..", rel);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const bitexact = ["-fflags", "+bitexact", "-flags", "+bitexact", "-map_metadata", "-1"];

// ffmpeg input arguments for a short test signal
const audioIn = (seconds: number) => [
  "-f",
  "lavfi",
  "-i",
  `sine=frequency=440:sample_rate=16000:duration=${seconds}`,
];
const videoIn = (seconds: number, size = "160x120") => [
  "-f",
  "lavfi",
  "-i",
  `testsrc=size=${size}:rate=10:duration=${seconds}`,
];

export interface FfmpegRecipe {
  args: string[];
  // container format, when ffmpeg can't tell it from the extension
  format?: string;
}

// How to make a small, valid file for each extension that needs an encoder
export function ffmpegRecipe(ext: string): FfmpegRecipe | undefined {
  const a = audioIn(1);
  const v = [...videoIn(1), ...audioIn(1)];
  switch (ext) {
    case "mp3":
      return { args: [...a, "-c:a", "libmp3lame", "-b:a", "32k"] };
    case "wma":
      return { args: [...a, "-c:a", "wmav2", "-b:a", "32k"], format: "asf" };
    case "ogg":
      return { args: [...a, "-c:a", "libvorbis", "-q:a", "0"] };
    case "flac":
      return { args: [...a, "-c:a", "flac"] };
    case "aac":
      return { args: [...a, "-c:a", "aac", "-b:a", "32k"], format: "adts" };
    case "m4a":
      return { args: [...a, "-c:a", "aac", "-b:a", "32k"], format: "ipod" };
    case "caf":
      return { args: [...a, "-c:a", "pcm_s16le"], format: "caf" };
    case "ra":
      return { args: [...a, "-c:a", "ac3", "-b:a", "64k"], format: "rm" };
    case "mp4":
    case "m4v":
    case "mov":
      return {
        args: [
          ...v,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "32k",
        ],
        format: ext === "m4v" ? "ipod" : ext,
      };
    case "mts":
      return {
        args: [
          ...v,
          "-c:v",
          "libx264",
          "-preset",
          "ultrafast",
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "ac3",
        ],
        format: "mpegts",
      };
    case "avi":
      return { args: [...v, "-c:v", "mpeg4", "-c:a", "libmp3lame"], format: "avi" };
    case "mpeg":
    case "mpg":
      return { args: [...v, "-r", "25", "-c:v", "mpeg1video", "-c:a", "mp2"], format: "mpeg" };
    case "wmv":
      return { args: [...v, "-c:v", "wmv2", "-c:a", "wmav2"], format: "asf" };
    case "jpg":
    case "jpeg":
      return {
        args: [...videoIn(0.1, "64x48"), "-frames:v", "1", "-c:v", "mjpeg"],
        format: "image2",
      };
    default:
      return undefined;
  }
}

export function runFfmpeg(ffmpeg: string, recipe: FfmpegRecipe, ext: string): Buffer {
  const tmp = path.join(
    os.tmpdir(),
    `lameta-torture-${process.pid}-${Math.random().toString(36).slice(2)}.${ext}`,
  );
  const args = ["-hide_banner", "-loglevel", "error", "-y", ...recipe.args, ...bitexact];
  if (recipe.format) args.push("-f", recipe.format);
  args.push(tmp);
  const r = spawnSync(ffmpeg, args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`ffmpeg failed for .${ext}: ${r.stderr}`);
  const b = fs.readFileSync(tmp);
  fs.rmSync(tmp);
  return b;
}

// A zip with stored (uncompressed) entries, for .docx, .kmz and .fwbackup
export function storedZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // names are UTF-8
    local.writeUInt16LE(0, 8);
    local.writeUInt32LE(0x00210000, 10); // 1980-01-01 00:00
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(e.data.length, 18);
    local.writeUInt32LE(e.data.length, 22);
    local.writeUInt16LE(name.length, 26);
    locals.push(local, name, e.data);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8);
    central.writeUInt32LE(0x00210000, 12);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(e.data.length, 20);
    central.writeUInt32LE(e.data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt32LE(offset, 42);
    centrals.push(central, name);
    offset += 30 + name.length + e.data.length;
  }
  const cd = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, cd, end]);
}

export function minimalPdf(text: string): Buffer {
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 100] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const stream = `BT /F1 12 Tf 10 50 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
  objs[3] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  let out = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) out += `${String(o).padStart(10, "0")} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

// AMR-NB: the magic, then 12.2 kbit/s frames of silence
export function amr(frames = 50): Buffer {
  const frame = Buffer.alloc(32);
  frame[0] = 0x3c;
  return Buffer.concat([Buffer.from("#!AMR\n", "ascii"), ...Array(frames).fill(frame)]);
}
