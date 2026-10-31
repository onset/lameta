import { describe, it, expect, beforeAll } from "vitest";
import { makeLametaSourceReader } from "../export/lametaSourceComment";
import { IRulesSandboxOutput, rulesSandboxMain } from "./rulesSandboxMain";

// ELAR's rules.js on small made-up IMDI. Elements are never self-closing here,
// because the test DOM parses them the way an HTML parser would.

function session(id: string, body: string) {
  return `<?xml version="1.0"?>
<METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" Type="SESSION">
  <Session>
    <Name>${id}</Name>
    ${body}
  </Session>
</METATRANSCRIPT>`;
}
function mediaFile(link: string, type = "Audio", availability = "O") {
  return `<MediaFile><ResourceLink ArchiveHandle="">${link}</ResourceLink><Type>${type}</Type><Size>3 MB</Size>
    <Access><Availability>${availability}</Availability><Description LanguageId="ISO639-3:eng">Asked by the speakers</Description></Access></MediaFile>`;
}
function writtenResource(link: string) {
  return `<WrittenResource><ResourceLink ArchiveHandle="">${link}</ResourceLink><Type>Document</Type></WrittenResource>`;
}
function content(genre: string, topics: string[], language = "Edolo") {
  return `<MDGroup><Content>
    <Genre LanguageId="ISO639-3:eng">${genre}</Genre><Genre LanguageId="ISO639-3:tpi">Stori</Genre>
    <Languages><Language><Id>ISO639-3:etr</Id><Name>${language}</Name><Description>Subject Language</Description></Language></Languages>
    <Keys>${topics.map((t) => `<Key Name="Topic">${t}</Key>`).join("")}</Keys>
  </Content>
  <Actors><Actor><Role LanguageId="ISO639-3:eng">Speaker</Role><Name>Awi</Name><FullName>Awi Heole</FullName></Actor>
  <Actor><Role></Role><Name>Igali</Name><FullName>Igali Sagali</FullName></Actor></Actors></MDGroup>`;
}

// a Content with keys and, optionally, a subject language and a translated genre,
// but no actors
function keysOnly(keys: [string, string][], language?: string, genre?: string) {
  const languages = language
    ? `<Languages><Language><Id>ISO639-3:etr</Id><Name>${language}</Name><Description>Subject Language</Description></Language></Languages>`
    : "";
  const genres = genre
    ? `<Genre LanguageId="ISO639-3:eng">${genre}</Genre><Genre LanguageId="ISO639-3:tpi">Stori</Genre>`
    : "";
  return `<MDGroup><Content>${genres}${languages}<Keys>${keys
    .map(([name, value]) => `<Key Name="${name}">${value}</Key>`)
    .join("")}</Keys></Content></MDGroup>`;
}

let output: IRulesSandboxOutput;
// the same sessions, in a project whose only metadata language is English
let englishOnlyOutput: IRulesSandboxOutput;
// Which sessions a check reported a problem in, and how seriously. These tests do not
// check the messages' wording, which changes for reasons of its own.
const found = (id: string) =>
  output.problems.filter((p) => p.checkId === id).map((p) => [p.sessionId ?? "", p.severity]);

describe("ELAR rules.js", () => {
  beforeAll(async () => {
    const rules = await import("../../archive-configurations/ELAR/rules.js");
    const input = {
      rulesSource: "(the module is passed in directly)",
      sessions: [
        {
          sessionId: "ETR009",
          xml: session(
            "ETR009",
            "<Date>2010-06-06</Date>" +
              content("Story", ["Fishing", "poison"]) +
              `<Resources>${mediaFile("ETR009/ETR009_Careful.mp3")}${mediaFile(
                "ETR009/someone_else_with_a_long_name.wav",
                "Audio",
                "S",
              )}${writtenResource("ETR009/ETR009_notes.docx")}${writtenResource(
                "ETR009/ETR009_text.eaf.001",
              )}${writtenResource("ETR009/ETR009_notes_20100606.txt")}${writtenResource(
                "ETR009/ETR009_text_20100606.flextext",
              )}</Resources>`,
          ),
        },
        {
          sessionId: "ETR010",
          xml: session(
            "ETR010",
            content("Narrative", ["fishing"], "Etoro") +
              `<Resources>${mediaFile("ETR010/ETR010 (copy).wav", "Sound")}</Resources>`,
          ),
        },
        {
          sessionId: "ETR011",
          xml: session("ETR011", keysOnly([["Keyword", "canoe"]]) + "<Resources></Resources>"),
        },
        {
          sessionId: "ETR012",
          xml: session(
            "ETR012",
            keysOnly(
              [
                ["Topic", "fishing"],
                ["Keyword", "Canoe"],
              ],
              "Edolo",
              "Relato",
            ) +
              `<Resources>${mediaFile("ETR012/ETR012_a.mp3")}${mediaFile(
                "ETR012/ETR012_a.wav",
              )}${writtenResource("ETR012/ETR012_t_20110101.flextext")}${writtenResource(
                "ETR012/ETR012_t_20100606.eaf",
              )}${writtenResource("ETR012/ETR012_u_20100606.flextext")}</Resources>`,
          ),
        },
      ],
      corpusXml: `<METATRANSCRIPT><Corpus><Name>Edolo Sample</Name><MDGroup><Actors>
          <Actor><Role>Depositor</Role></Actor></Actors></MDGroup></Corpus></METATRANSCRIPT>`,
      metadataLanguages: ["en", "es"],
      maxProblems: 1000,
    };
    output = await rulesSandboxMain(input, makeLametaSourceReader, async () => rules);
    englishOnlyOutput = await rulesSandboxMain(
      { ...input, metadataLanguages: ["en"] },
      makeLametaSourceReader,
      async () => rules,
    );
  });

  it("expects no translation when English is the only metadata language", () => {
    const translationChecks = (o: IRulesSandboxOutput) =>
      o.problems.filter((p) => /translation|Translation/.test(p.checkId));
    expect(translationChecks(output).length).toBeGreaterThan(0);
    expect(translationChecks(englishOnlyOutput)).toEqual([]);
    // the other checks are the same
    expect(englishOnlyOutput.problems.length).toBe(
      output.problems.length - translationChecks(output).length,
    );
  });

  it("raises no errors", () => {
    expect(output.errors).toEqual([]);
  });

  it("checks media and written-resource file names", () => {
    // someone_else_with_a_long_name.wav
    expect(found("checkMediaFiles/sessionId")).toEqual([["ETR009", "error"]]);
    expect(found("checkMediaFiles/extension")).toEqual([]);
    // the .docx and the .001 file
    expect(found("checkWrittenResources/extension")).toEqual([
      ["ETR009", "error"],
      ["ETR009", "error"],
    ]);
    // a resource of type "Sound"
    expect(found("checkResourceTypes")).toEqual([["ETR010", "error"]]);
    expect(found("checkForResources")).toEqual([]);
  });

  it("reports an MP3 or FLExText file only when the session has the better version", () => {
    // ETR009's MP3 has no WAV with the same name, and whether there is one elsewhere
    // only the depositor knows, so it is not reported
    expect(found("checkMediaFiles/mp3")).toEqual([["ETR012", "error"]]);
    // ETR009's FLExText file has no EAF in its session, so it is accepted. In ETR012,
    // one FLExText file has an EAF of the same name, and the other may be the text of
    // some other EAF there, which only the depositor knows
    expect(found("checkWrittenResources/flextext")).toEqual([
      ["ETR012", "error"],
      ["ETR012", "warning"],
    ]);
  });

  it("checks actors and their roles", () => {
    // Igali Sagali has no role; Awi Heole's role is in English only
    expect(found("checkActorRole")).toEqual([
      ["ETR009", "error"],
      ["ETR010", "error"],
    ]);
    expect(found("checkActorRole/translation")).toEqual([
      ["ETR009", "warning"],
      ["ETR010", "warning"],
    ]);
    expect(found("checkForActors")).toEqual([]);
  });

  it("reports a session whose actors have no full name, but not a session with no actors", async () => {
    const rules = await import("../../archive-configurations/ELAR/rules.js");
    const withActors = (actors: string) =>
      session("ETR030", `<MDGroup><Actors>${actors}</Actors></MDGroup>`);
    const check = (xml: string) =>
      rulesSandboxMain(
        {
          rulesSource: "(the module is passed in directly)",
          sessions: [{ sessionId: "ETR030", xml }],
          metadataLanguages: ["en"],
          maxProblems: 1000,
        },
        makeLametaSourceReader,
        async () => rules,
      ).then((o) => o.problems.filter((p) => p.checkId === "checkForActors").length);
    expect(
      await check(
        withActors("<Actor><Role>Speaker</Role><Name>Awi</Name><FullName></FullName></Actor>"),
      ),
    ).toBe(1);
    // lameta's own checks report a session that has no contributors
    expect(await check(withActors(""))).toBe(0);
  });

  it("warns about a genre that is not in ELAR's list", () => {
    // "Story" and "Relato"
    expect(found("genreMapping")).toEqual([
      ["ETR009", "warning"],
      ["ETR012", "warning"],
    ]);
    expect(found("genreTranslation")).toEqual([]);
  });

  it("leaves English out of the genre and role checks when English is not a metadata language", async () => {
    const rules = await import("../../archive-configurations/ELAR/rules.js");
    // what lameta exports when Spanish is the only metadata language
    const spanishOnly = session(
      "ETR020",
      `<MDGroup><Content><Genre LanguageId="ISO639-3:spa">Mitología</Genre></Content>
      <Actors><Actor><Role LanguageId="ISO639-3:spa">Hablante</Role><Name>Awi</Name><FullName>Awi Heole</FullName></Actor></Actors></MDGroup>`,
    );
    const check = (metadataLanguages: string[]) =>
      rulesSandboxMain(
        {
          rulesSource: "(the module is passed in directly)",
          sessions: [{ sessionId: "ETR020", xml: spanishOnly }],
          metadataLanguages,
          maxProblems: 1000,
        },
        makeLametaSourceReader,
        async () => rules,
      ).then((o) => o.problems.map((p) => p.checkId).filter((id) => /genre|ActorRole/.test(id)));
    // the field rules report, on the project, that English is not a metadata language
    expect(await check(["es"])).toEqual([]);
    // "Mitología" is not compared with ELAR's English list
    expect(await check(["en", "es"])).toEqual(["checkActorRole/english"]);
  });

  it("wants a translated access description for S", () => {
    expect(found("accessDescriptionTranslation")).toEqual([["ETR009", "warning"]]);
  });

  it("checks the corpus", () => {
    // "Edolo Sample" has a space
    expect(found("checkCorpusFolderName")).toEqual([["", "error"]]);
    // the field rules report a missing steward or depositor
    expect(found("checkResponsibles")).toEqual([]);
  });

  it("reports a missing translation as a warning, and everything else that it is sure of as an error", () => {
    const warningChecks = /translation|format|Translation|genreMapping|\/flextext$/;
    const severities = (warnings: boolean) => [
      ...new Set(
        output.problems
          .filter((p) => warningChecks.test(p.checkId) === warnings)
          .map((p) => p.severity),
      ),
    ];
    expect(severities(false)).toEqual(["error"]);
  });

  it("checks file names", () => {
    expect(found("checkWrittenResources/dateStamp")).toEqual([
      ["ETR009", "error"],
      ["ETR009", "error"],
    ]);
    expect(found("checkMediaFiles/characters")).toEqual([["ETR010", "error"]]);
    // someone_else_with_a_long_name.wav, and a written resource
    expect(found("checkMediaFiles/length")).toEqual([["ETR009", "error"]]);
    expect(found("checkWrittenResources/length")).toEqual([["ETR009", "error"]]);
  });
});
