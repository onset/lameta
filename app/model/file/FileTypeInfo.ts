import * as Path from "path";
import { Dictionary } from "typescript-collections";
import mime from "mime";

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
    imdiType: "Audio",
    extensions: "wav, mp3, wma,ogg"
  },
  {
    type: "Video",
    imdiType: "Video",
    isMediaType: true,
    extensions: "mts, avi, mov, mp4, mpeg, mpg, avchd, wmv, m4v"
  },
  {
    type: "Image",
    imdiType: "Image",
    isMediaType: true,
    extensions: "jpg, jpeg, png, tiff, gif, tif, svg, bmp"
  },
  {
    type: "CHAT",
    isMediaType: false,
    imdiType: "CHAT",
    extensions: "cha"
  },
  {
    type: "ELAN",
    isMediaType: false,
    imdiType: "ELAN",
    extensions: "eaf, pfsx"
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
    type: "Toolbox",
    isMediaType: false,
    imdiType: "Toolbox",
    extensions: "tbt"
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
    extensions: "fwdata, flextext, fwbackup,lift, fwdict, fwnotebook, fwthes"
  },
  { type: "unused", isMediaType: false, imdiType: "XML", extensions: "xml" },
  {
    type: "Geo",
    isMediaType: false,
    imdiType: "Geographic data",
    extensions: "kml,kmz"
  }
];

export function GetFileFormatInfoForPath(
  path: string
): IFileFormat | undefined {
  const ext = Path.extname(path).toLowerCase().replace(/\./g, "");

  return GetFileFormatInfoForExtension(ext);
}
export function GetFileFormatInfoForExtension(
  ext: string
): IFileFormat | undefined {
  return knownFileFormats.find(
    (group) => group.extensions.replace(/ /g, "").split(",").indexOf(ext) > -1
  );
}

/* May 2020 Note that this schema says
        <imdi:VocabularyDef xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI ./IMDI_3.0.xsd" Name="WrittenResource-Type" Date="2003-06-25" Link="http://www.mpi.nl/IMDI/Schema/WrittenResource-Type.xml">
          <imdi:Description LanguageId="ISO639-2:eng"/>
          <imdi:Entry Value="Unknown"/>
          <imdi:Entry Value="Unspecified"/>
          <imdi:Entry Value="Primary Text" FollowUp="./WrittenResource-SubType-PrimaryText.xml"/>
          <imdi:Entry Value="Annotation" FollowUp="./WrittenResource-SubType-Annotation.xml"/>
          <imdi:Entry Value="Lexical Analysis" FollowUp="./WrittenResource-SubType-LexicalAnalysis.xml"/>
          <imdi:Entry Value="Ethnography" FollowUp="./WrittenResource-SubType-Ethnography.xml"/>
          <imdi:Entry Value="Study" FollowUp="./WrittenResource-SubType-OLAC-LS.xml"/>
        </imdi:VocabularyDef>


        But ELAR seems to want either "Document" or "Unspecified"?
      */
export function getImdiResourceTypeForPath(path: string): string {
  const ext = Path.extname(path).toLowerCase().replace(/\./g, "");
  return getImdiResourceTypeForExtension(ext);
}
export function getImdiResourceTypeForExtension(ext: string): string {
  const y = GetFileFormatInfoForExtension(ext);
  let resourceType = y?.imdiType ?? "Unspecified";
  if (resourceType === "Unspecified") {
    const m = getMimeType(ext); //?
    if (m && ["application"].indexOf(m.split("/")[0]) > -1) {
      resourceType = "Document";
    }
  }
  return resourceType;
}

export const customMimeTypes = new Dictionary<string, string>();
// many of these come from https://trello.com/c/6XLzuBii/89-vera-mime-types
// Also see https://archive.mpi.nl/accepted-file-formats
customMimeTypes.setValue("pfsx", "text/x-pfsx+xml"); // ELAN Preferences File
customMimeTypes.setValue("typ", "text/x-toolbox-type");
customMimeTypes.setValue("lng", "text/x-toolbox-language");
customMimeTypes.setValue("tbt", "text/x-toolbox-text");
customMimeTypes.setValue("set", "Text/x-toolbox-sortorder");
customMimeTypes.setValue("srt", "text/x-subrip");
customMimeTypes.setValue("fwdata", "application/zip");
customMimeTypes.setValue("flextext", "application/xml");
customMimeTypes.setValue("fwbackup", "application/zip");
customMimeTypes.setValue("praat", "text/praat-pitch");
customMimeTypes.setValue("textgrid", "text/praat-textgrid");
customMimeTypes.setValue("eaf", "text/x-eaf+xml");
customMimeTypes.setValue("cha", "text/x-chat");
customMimeTypes.setValue("chat", "text/x-chat"); // I think this is wrong?
customMimeTypes.setValue("trs", "text/x-trs");

//customMimeTypes.setValue("", "");

export function getMimeType(extension: string): string {
  const noDot = extension.replace(/^\./, "").toLowerCase(); //?
  //console.log("getMimeType", extension, noDot);
  //console.log(JSON.stringify(customMimeTypes, null, 2));
  const r =
    customMimeTypes.getValue(noDot) ||
    customMimeTypes.getValue(extension) ||
    mime.getType(extension) ||
    extension;
  //console.log(`getMimeType(${extension}) => ${r}`);
  return r;
}
