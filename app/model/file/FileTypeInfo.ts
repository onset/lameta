import * as Path from "path";

interface IFileFormat {
  type: string;
  isMediaType: boolean;
  imdiType: string;
  extensions: string;
}
export const knownFileFormats: IFileFormat[] = [
  {
    type: "Session",
    isMediaType: false,
    imdiType: "unused",
    extensions: "session"
  },
  {
    type: "Person",
    isMediaType: false,
    imdiType: "unused",
    extensions: "person"
  },
  {
    type: "Audio",
    isMediaType: true,
    imdiType: "audio",
    extensions: "wav, mp3, wma,ogg"
  },
  {
    type: "Video",
    imdiType: "video",
    isMediaType: true,
    extensions: "mts, avi, mov, mp4, mpeg, mpg, avchd, wmv, m4v"
  },
  {
    type: "Image",
    imdiType: "image",
    isMediaType: true,
    extensions: "jpg, jpeg, png, tiff, gif, tif, svg, bmp"
  },
  {
    type: "ELAN",
    isMediaType: false,
    imdiType: "ELAN",
    extensions: "eaf"
  },
  {
    type: "Transcriber",
    isMediaType: false,
    imdiType: "Transcriber",
    extensions: "trs"
  },
  {
    type: "Doc",
    isMediaType: false,
    imdiType: "Document",
    extensions: "pdf, html, htm, doc, docx, txt"
  },

  {
    type: "Settings",
    isMediaType: false,
    imdiType: "Settings",
    extensions: "psfx,typ,lng,etf"
  },
  {
    type: "Praat",
    isMediaType: false,
    imdiType: "Praat",
    extensions: "textgrid"
  },
  { type: "unused", isMediaType: false, imdiType: "XML", extensions: "xml" },
  {
    type: "FLEx",
    isMediaType: false,
    imdiType: "FLEx",
    extensions: "flextex,flextext, fwbackup"
  },
  { type: "unused", isMediaType: false, imdiType: "XML", extensions: "xml" },
  {
    type: "Geo",
    isMediaType: false,
    imdiType: "Geographic data",
    extensions: "kml,kmz"
  }
];

export function GetFileFormatInfo(path: string): IFileFormat | undefined {
  const ext = Path.extname(path)
    .toLowerCase()
    .replace(/\./g, "");

  return knownFileFormats.find(
    group =>
      group.extensions
        .replace(/ /g, "")
        .split(",")
        .indexOf(ext) > -1
  );
}
