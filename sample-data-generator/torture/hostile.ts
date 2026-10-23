// Cases that are never committed:
// - hostile names: names git can't check out everywhere, or that Explorer, OneDrive and
//   other Win32 programs can't handle. Node creates them because it opens files through
//   \\?\ paths on Windows.
// - blocking cases: files that may stop the whole project from loading, or block a whole
//   export, and so would hide every other case.

import { Context } from "./cases";
import * as m from "./media";
import { lametaPerson, lametaSession, SessionSpec } from "./xml";

const S = "Sessions";
const P = "People";

const basic = (title: string): SessionSpec => ({
  title,
  date: "2024-11-01",
  genre: "narrative",
  access: "O",
  contributions: [{ name: "Nɔkɔ Ɛsi", role: "speaker" }],
});

function session(
  ctx: Context,
  folder: string,
  why: string,
  targets: string,
  spec: SessionSpec = basic(folder),
  metadataFileName = `${folder}.session`,
) {
  ctx.w.file(`${S}/${folder}/${metadataFileName}`, lametaSession({ id: folder, ...spec }));
  ctx.w.note(`${S}/${folder}`, why, targets);
}

export function writeHostileNames(ctx: Context) {
  const { w } = ctx;
  const nfc = "Café Zoë".normalize("NFC");
  const nfd = "Café Zoë".normalize("NFD");
  session(
    ctx,
    nfc,
    'NFC spelling of "Café Zoë"; the next folder is the NFD spelling of the same name. NTFS keeps both; macOS and git on macOS treat them as one.',
    "Folder rename collision checks, IMDI/RO-Crate ids, macOS",
  );
  w.file(`${S}/${nfc}/${nfc}.wav`, m.wav(0.1));
  session(ctx, nfd, 'NFD spelling of "Café Zoë".', "same as the NFC folder");
  w.file(`${S}/${nfd}/${nfd}.wav`, m.wav(0.1));

  const zoe = "Zoë Ångström".normalize("NFD");
  w.file(`${P}/${zoe}/${zoe}.person`, lametaPerson({ name: "" }));
  w.note(
    `${P}/${zoe}`,
    "Person folder in NFD with an empty name field, as when a folder made on an old Mac reaches Windows: the name comes from the folder, in NFD, and NFC references from sessions don't match it.",
    "Person constructor, Project.findPerson",
  );

  session(
    ctx,
    "Trailing dot.",
    "Folder name ends in a dot; Explorer and most Windows programs strip it and then open a different path.",
    "everything that builds a path from the folder name",
  );
  w.file(`${S}/Trailing dot./Trailing dot._20241101.wav`, m.wav(0.1));
  session(ctx, "Trailing space ", "Folder name ends in a space.", "same as the trailing dot");
  w.file(`${S}/Trailing space /Trailing space _20241101.wav`, m.wav(0.1));
  session(
    ctx,
    "HOSTILE_file_names",
    "Files whose names end in a dot or a space, and Windows reserved device names.",
    "Folder.loadChildFiles, MediaStats ffprobe (a Win32 program), shell.openPath, IMDI copy",
  );
  for (const name of [
    "ends in dot.",
    "ends in space.wav ",
    "aux.txt",
    "CON.wav",
    "nul",
    "COM1.mp3",
    "LPT1",
  ]) {
    w.file(`${S}/HOSTILE_file_names/${name}`, name.endsWith(".wav") ? m.wav(0.1) : `${name}\n`);
  }
  session(
    ctx,
    "COM1",
    "A session whose id is a Windows reserved device name.",
    "Session folder, IMDI file name, ffprobe",
  );
  w.file(`${S}/COM1/COM1_20241101.wav`, m.wav(0.1));
  w.file(`${P}/Con/Con.person`, lametaPerson({ name: "Con" }));
  w.note(
    `${P}/Con`,
    "A person named Con: a reserved device name.",
    "Person folder, consent bundle",
  );

  // over MAX_PATH from any project location
  const longFolder = "LONGER_THAN_MAX_PATH_" + "a_very_long_session_name_".repeat(6);
  const longFile = `${longFolder.slice(0, 90)}_${"recording_".repeat(9)}20241101.wav`;
  session(
    ctx,
    longFolder,
    `A ${longFolder.length}-character folder holding a ${longFile.length}-character file name: the path is over 260 characters from any project location.`,
    "Windows MAX_PATH in Node, Explorer, ffprobe, the IMDI and zip exporters",
  );
  w.file(`${S}/${longFolder}/${longFile}`, m.wav(0.1));
  const maxComponent = `${"x".repeat(251)}.wav`;
  w.file(`${S}/${longFolder}/${maxComponent}`, m.wav(0.1));
  w.note(
    `${S}/${longFolder}/${maxComponent.slice(0, 20)}…`,
    "A 255-character file name, the most NTFS allows.",
    "rename that makes it longer, export",
  );
}

export function writeBlockingCases(ctx: Context) {
  const { w } = ctx;
  w.file(
    `${S}/BLOCK_corrupt_session/BLOCK_corrupt_session.session`,
    `<?xml version="1.0" encoding="utf-8"?>\n<Session minimum_lameta_version_to_read="0.0.0">\n  <title type="string">unterminated`,
  );
  w.note(
    `${S}/BLOCK_corrupt_session`,
    "Truncated XML in a .session.",
    "File.readMetadataFile, Project.fromDirectory catch",
  );
  w.file(`${S}/BLOCK_zero_byte_session/BLOCK_zero_byte_session.session`, "");
  w.note(
    `${S}/BLOCK_zero_byte_session`,
    "A zero-byte .session, as an interrupted cloud sync leaves it.",
    "File.readMetadataFile, metadataReadFailed",
  );
  w.file(
    `${S}/BLOCK_future_version/BLOCK_future_version.session`,
    lametaSession({ id: "BLOCK_future_version", title: "from lameta 99" }).replace(
      'minimum_lameta_version_to_read="0.0.0"',
      'minimum_lameta_version_to_read="99.0.0"',
    ),
  );
  w.note(
    `${S}/BLOCK_future_version`,
    "A .session that says it needs lameta 99.",
    "File.readMetadataFile version check",
  );
  const utf16 = Buffer.concat([
    Buffer.from([0xff, 0xfe]),
    Buffer.from(
      lametaSession({ id: "BLOCK_utf16", title: "UTF-16" }).replace("utf-8", "utf-16"),
      "utf16le",
    ),
  ]);
  w.file(`${S}/BLOCK_utf16/BLOCK_utf16.session`, utf16);
  w.note(
    `${S}/BLOCK_utf16`,
    "A .session in UTF-16 with a BOM; PatientFS reads every file as UTF-8.",
    "PatientFS.readFileSyncNoNotify",
  );
  w.file(
    `${S}/BLOCK_corrupt_meta/BLOCK_corrupt_meta.session`,
    lametaSession({ id: "BLOCK_corrupt_meta", ...basic("corrupt sidecar") }),
  );
  w.file(`${S}/BLOCK_corrupt_meta/corrupt meta.wav`, m.wav(0.1));
  w.file(
    `${S}/BLOCK_corrupt_meta/corrupt meta.wav.meta`,
    `<?xml version="1.0"?>\n<MetaData><notes>unterminated`,
  );
  w.file(`${S}/BLOCK_corrupt_meta/empty meta.wav`, m.wav(0.1));
  w.file(`${S}/BLOCK_corrupt_meta/empty meta.wav.meta`, "");
  w.note(
    `${S}/BLOCK_corrupt_meta`,
    "A .meta with truncated XML and a zero-byte .meta, as an interrupted cloud sync leaves them. One of these stops the whole project from loading.",
    "File.readMetadataFile, Folder.loadChildFiles, Project.fromDirectory",
  );
  w.file(`${P}/BLOCK zero byte person/BLOCK zero byte person.person`, "");
  w.note(`${P}/BLOCK zero byte person`, "A zero-byte .person.", "File.readMetadataFile");
  w.file(
    `${S}/BLOCK_session_named_folder/BLOCK_session_named_folder.session/inside.txt`,
    "a folder whose name ends in .session\n",
  );
  w.note(
    `${S}/BLOCK_session_named_folder`,
    "The only thing named *.session is a folder.",
    "FolderMetadataFile possibleFiles filter",
  );
  session(
    ctx,
    "BLOCK_custom_names_with_date",
    'Custom fields named Validated_By, Candidate_Words, Update and Mandate: every tag that contains "date" is read as a date, so the values are lost and the notes are overwritten. lameta then adds these fields to every other session as text fields, and a text field whose key contains "date" fails an assert in getXml, so no session in the project can be saved.',
    "File.loadOnePersistentProperty, GetSayMoreXml.writeField assert, custom field registry",
    {
      ...basic("The catalogue of works, validated and updated"),
      notes: "Original notes, which must survive loading",
      custom: {
        Validated_By: "Wilema Dimo",
        Candidate_Words: "beige, hesitation, ladder",
        Update: "second visit, after the paint dried",
        Mandate: "the artists' collective",
      },
    },
  );
  session(
    ctx,
    "BLOCK_custom_date_field",
    'A custom text field transcription_date holding a real date: with it, no other session in the project can be saved (the assert in getXml on keys that contain "date").',
    "GetSayMoreXml.writeField assert, custom field registry",
    {
      ...basic("Transcribed, eventually"),
      custom: { transcription_date: "2023-04-05" },
    },
  );
  w.file(
    `${P}/BLOCK SayMore Updated/BLOCK SayMore Updated.person`,
    lametaPerson({
      name: "BLOCK SayMore Updated",
      notes: "Notes from SayMore",
      custom: { Update_Notes: "rechecked in 2019" },
    }),
  );
  w.note(
    `${P}/BLOCK SayMore Updated`,
    "A person with a custom field named Update_Notes.",
    "same as BLOCK_custom_names_with_date",
  );
  session(
    ctx,
    "BLOCK_slash_multilingual",
    "A multilingual field in the old slash form. lameta looks for this form only in the first four sessions it loads, so this one does not make it ask for a migration.",
    "Project.detectSlashSyntaxInSessions, Project.checkAndSetMultilingualConversionPending",
    { ...basic(""), title: "Fishing / Pesca / Pis", description: "Men fishing / Hombres pescando" },
  );
}
