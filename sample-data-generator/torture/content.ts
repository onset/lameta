// A small, valid file for every extension lameta knows about, by extension.

import * as m from "./media";

const eaf = (label: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>
<ANNOTATION_DOCUMENT AUTHOR="" DATE="2024-06-01T12:00:00+00:00" FORMAT="3.0" VERSION="3.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://www.mpi.nl/tools/elan/EAFv3.0.xsd">
  <HEADER MEDIA_FILE="" TIME_UNITS="milliseconds"/>
  <TIME_ORDER><TIME_SLOT TIME_SLOT_ID="ts1" TIME_VALUE="0"/><TIME_SLOT TIME_SLOT_ID="ts2" TIME_VALUE="900"/></TIME_ORDER>
  <TIER LINGUISTIC_TYPE_REF="default-lt" TIER_ID="Transcription">
    <ANNOTATION><ALIGNABLE_ANNOTATION ANNOTATION_ID="a1" TIME_SLOT_REF1="ts1" TIME_SLOT_REF2="ts2"><ANNOTATION_VALUE>${label}</ANNOTATION_VALUE></ALIGNABLE_ANNOTATION></ANNOTATION>
  </TIER>
  <LINGUISTIC_TYPE GRAPHIC_REFERENCES="false" LINGUISTIC_TYPE_ID="default-lt" TIME_ALIGNABLE="true"/>
</ANNOTATION_DOCUMENT>
`;

const xmlDoc = (root: string, label: string) =>
  `<?xml version="1.0" encoding="utf-8"?>\n<${root}><note>${label}</note></${root}>\n`;

export class ContentMaker {
  private ffmpegCache = new Map<string, Buffer>();
  public readonly missingEncoders: string[] = [];
  constructor(private ffmpeg: string | undefined) {}

  private viaFfmpeg(ext: string): Buffer | undefined {
    const recipe = m.ffmpegRecipe(ext);
    if (!recipe) return undefined;
    if (!this.ffmpeg) {
      if (!this.missingEncoders.includes(ext)) this.missingEncoders.push(ext);
      return undefined;
    }
    if (!this.ffmpegCache.has(ext)) {
      try {
        this.ffmpegCache.set(ext, m.runFfmpeg(this.ffmpeg, recipe, ext));
      } catch (e) {
        if (!this.missingEncoders.includes(ext)) this.missingEncoders.push(ext);
        console.warn(String(e));
        return undefined;
      }
    }
    return this.ffmpegCache.get(ext);
  }

  // label goes into text formats so each file differs; media files of one type are identical
  public make(extension: string, label: string): Buffer {
    const ext = extension.toLowerCase();
    const viaFfmpeg = this.viaFfmpeg(ext);
    if (viaFfmpeg) return viaFfmpeg;
    switch (ext) {
      case "wav":
        return m.wav();
      case "au":
        return m.au();
      case "aif":
      case "aiff":
        return m.aiff();
      case "amr":
        return m.amr();
      case "ram":
        return Buffer.from("rtsp://media.example.org/recordings/story.rm\n");
      case "avchd":
        // AVCHD is MPEG transport stream; when ffmpeg is missing this stays unplayable
        return this.viaFfmpeg("mts") ?? m.garbage(4096, 7);
      case "bmp":
        return m.bmp();
      case "png":
        return m.png();
      case "gif":
        return m.gif();
      case "tif":
      case "tiff":
        return m.tiff();
      case "svg":
        return m.svg(label);
      case "jpg":
      case "jpeg":
        // ffmpeg missing: a PNG with the wrong extension is the best we can do
        return m.png();
      case "eaf":
        return Buffer.from(eaf(label));
      case "pfsx":
        return Buffer.from(
          `<?xml version="1.0" encoding="UTF-8"?>\n<preferences version="1.1"/>\n`,
        );
      case "cha":
        return Buffer.from(
          `@UTF8\n@Begin\n@Languages:\teng\n@Participants:\tCHI Target_Child\n*CHI:\t${label} .\n@End\n`,
        );
      case "trs":
        return Buffer.from(
          `<?xml version="1.0" encoding="UTF-8"?>\n<Trans><Episode><Section type="report" startTime="0" endTime="1"><Turn startTime="0" endTime="1"><Sync time="0"/>${label}</Turn></Section></Episode></Trans>\n`,
        );
      case "pdf":
        return m.minimalPdf(label);
      case "html":
      case "htm":
        return Buffer.from(
          `<!doctype html><html><head><meta charset="utf-8"><title>${label}</title></head><body><p>${label}</p></body></html>\n`,
        );
      case "doc":
        // the OLE compound-file signature, then nothing a word processor can open
        return Buffer.concat([Buffer.from("d0cf11e0a1b11ae1", "hex"), m.garbage(504, 11)]);
      case "docx":
        return m.storedZip([
          {
            name: "[Content_Types].xml",
            data: Buffer.from(
              `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
            ),
          },
          {
            name: "word/document.xml",
            data: Buffer.from(
              `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${label}</w:t></w:r></w:p></w:body></w:document>`,
            ),
          },
        ]);
      case "kmz":
        return m.storedZip([{ name: "doc.kml", data: Buffer.from(xmlDoc("kml", label)) }]);
      case "fwbackup":
        return m.storedZip([
          { name: "project.fwdata", data: Buffer.from(xmlDoc("languageproject", label)) },
        ]);
      case "kml":
        return Buffer.from(
          `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Placemark><name>${label}</name><Point><coordinates>142.7,-6.3,0</coordinates></Point></Placemark></kml>\n`,
        );
      case "textgrid":
        return Buffer.from(
          `File type = "ooTextFile"\nObject class = "TextGrid"\n\nxmin = 0\nxmax = 1\ntiers? <exists>\nsize = 1\nitem []:\n    item [1]:\n        class = "IntervalTier"\n        name = "words"\n        xmin = 0\n        xmax = 1\n        intervals: size = 1\n        intervals [1]:\n            xmin = 0\n            xmax = 1\n            text = "${label}"\n`,
        );
      case "srt":
        return Buffer.from(`1\n00:00:00,000 --> 00:00:00,900\n${label}\n\n`);
      case "tbt":
        return Buffer.from(`\\_sh v3.0  400  Text\n\n\\ref ${label}\n\\tx ${label}\n`);
      case "typ":
      case "lng":
      case "psfx":
      case "etf":
        return Buffer.from(`\\+${ext} ${label}\n\\-${ext}\n`);
      case "xml":
      case "fwdata":
      case "flextext":
      case "lift":
      case "fwdict":
      case "fwnotebook":
      case "fwthes":
        return Buffer.from(xmlDoc(ext, label));
      default:
        return Buffer.from(`${label}\n`);
    }
  }
}

// every extension in src/model/file/FileTypeInfo.ts, plus two it does not list
export const kEveryKnownExtension = [
  "wav",
  "mp3",
  "wma",
  "ogg",
  "flac",
  "aac",
  "m4a",
  "aiff",
  "aif",
  "au",
  "amr",
  "ra",
  "ram",
  "caf",
  "mts",
  "avi",
  "mov",
  "mp4",
  "mpeg",
  "mpg",
  "avchd",
  "wmv",
  "m4v",
  "jpg",
  "jpeg",
  "png",
  "tiff",
  "gif",
  "tif",
  "svg",
  "bmp",
  "cha",
  "eaf",
  "pfsx",
  "trs",
  "pdf",
  "html",
  "htm",
  "doc",
  "docx",
  "txt",
  "psfx",
  "typ",
  "lng",
  "etf",
  "tbt",
  "textgrid",
  "xml",
  "fwdata",
  "flextext",
  "fwbackup",
  "lift",
  "fwdict",
  "fwnotebook",
  "fwthes",
  "kml",
  "kmz",
  "srt",
  "xyz",
];
