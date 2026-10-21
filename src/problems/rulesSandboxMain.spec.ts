import { describe, it, expect } from "vitest";
import { makeLametaSourceReader, makeLametaSourceComment } from "../export/lametaSourceComment";
import { IRulesSandboxInput, rulesSandboxMain } from "./rulesSandboxMain";

// The sandbox imports the rules file as an ES module from a data: URL, which vitest
// cannot do. This loader turns the module's top-level exports into a function's
// return value instead; that is enough for these tests.
async function loadWithoutImport(source: string) {
  const names = [
    ...source.matchAll(
      /export\s+(?:const|let|var|function|async\s+function|class)\s+([A-Za-z_$][\w$]*)/g,
    ),
  ].map((m) => m[1]);
  const body =
    source.replace(/export\s+(?=const|let|var|function|async|class)/g, "") +
    `
return { ${names.join(", ")} };`;
  return new Function(body)();
}

function sessionXml(id: string, extra = "") {
  const comment = (json: object) => `<!--${makeLametaSourceComment(json as any)}-->`;
  return `<?xml version="1.0"?>
<METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" Type="SESSION">
  ${comment({ folderType: "session", folderId: id })}
  <Session>
    ${comment({ folderType: "session", folderId: id, fieldKey: "id" })}
    <Name>${id}</Name>
    <Resources>
      ${comment({
        folderType: "session",
        folderId: id,
        fileName: `${id}_a.wav`,
      })}
      <MediaFile>
        <ResourceLink>${id}/${id}_a.wav</ResourceLink>
        <Type>Audio</Type>
      </MediaFile>
    </Resources>
    ${extra}
  </Session>
</METATRANSCRIPT>`;
}

const header = `export const interfaceVersion = 1;\nexport const format = "imdi";\n`;

async function run(rulesSource: string, input: Partial<IRulesSandboxInput> = {}) {
  return rulesSandboxMain(
    {
      rulesSource,
      sessions: [
        { sessionId: "ETR009", xml: sessionXml("ETR009") },
        { sessionId: "ETR010", xml: sessionXml("ETR010") },
      ],
      metadataLanguages: ["en", "es"],
      maxProblems: 100,
      ...input,
    },
    makeLametaSourceReader,
    loadWithoutImport,
  );
}

describe("rulesSandboxMain", () => {
  it("maps each reported node to its place in lameta", async () => {
    const output = await run(
      header +
        `export function checkSession(doc, report) {
          for (const link of doc.querySelectorAll("MediaFile > ResourceLink"))
            report({ id: "checkMediaFiles", message: "Filename is wrong", node: link });
        }`,
    );
    expect(output.errors).toEqual([]);
    expect(output.problems).toHaveLength(2);
    const p = output.problems[0];
    expect(p).toMatchObject({
      checkId: "checkMediaFiles",
      severity: "warning",
      message: "Filename is wrong",
      from: "checkSession",
      sessionId: "ETR009",
      target: {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_a.wav",
      },
    });
  });

  it("knows which session a node from checkAcrossSessions is in", async () => {
    const output = await run(
      header +
        `export function checkAcrossSessions(docs, report) {
          report({ id: "x", severity: "error", message: "m", node: docs[1].querySelector("Name") });
        }`,
    );
    expect(output.problems[0]).toMatchObject({
      from: "checkAcrossSessions",
      sessionId: "ETR010",
      severity: "error",
      target: { folderType: "session", folderId: "ETR010", fieldKey: "id" },
    });
  });

  it("passes on a subject and a reason as text, and leaves out empty ones", async () => {
    const output = await run(
      header +
        `export function checkSession(doc, report) {
          if (doc.querySelector("Name").textContent !== "ETR009") return;
          report({ id: "a", subject: "MP3", message: "isn't accepted.", reason: "Use the WAV." });
          report({ id: "b", subject: "", message: "no subject", reason: null });
          report({ id: "c", subject: 42, message: "a number" });
        }`,
    );
    expect(output.problems.map((p) => [p.checkId, p.subject, p.message, p.reason])).toEqual([
      ["a", "MP3", "isn't accepted.", "Use the WAV."],
      ["b", undefined, "no subject", undefined],
      ["c", "42", "a number", undefined],
    ]);
  });

  it("lists a problem whose node maps to nothing, and one with no node", async () => {
    const output = await run(
      header +
        `export function checkCorpus(doc, report) {
          report({ id: "a", message: "no source", node: doc.documentElement });
          report({ id: "b", message: "no node" });
        }`,
      { corpusXml: "<METATRANSCRIPT><Corpus/></METATRANSCRIPT>" },
    );
    expect(output.problems.map((p) => [p.checkId, p.target])).toEqual([
      ["a", undefined],
      ["b", undefined],
    ]);
  });

  it("reports a syntax error", async () => {
    const output = await run(header + "export function checkSession( {");
    expect(output.errors).toHaveLength(1);
    expect(output.errors[0].kind).toBe("load");
  });

  it("reports a missing or wrong declaration, and runs nothing", async () => {
    const check = `export function checkSession(doc, report) { report({ id: "x", message: "m" }); }`;
    const missing = await run(check);
    expect(missing.errors.map((e) => e.kind)).toEqual(["declaration", "declaration"]);
    expect(missing.problems).toEqual([]);
    const wrong = await run(
      `export const interfaceVersion = 2;\nexport const format = "rocrate";\n` + check,
    );
    expect(wrong.errors.map((e) => e.message)).toEqual([
      "The rules file is for interfaceVersion 2; this lameta supports interfaceVersion 1.",
      'The rules file checks the format "rocrate"; lameta can only check "imdi" so far.',
    ]);
  });

  it("names a check that throws, and keeps going with the other sessions", async () => {
    const output = await run(
      header +
        `export function checkSession(doc, report) {
          if (doc.querySelector("Name").textContent === "ETR009") throw new Error("boom");
          report({ id: "ok", message: "fine" });
        }`,
    );
    expect(output.errors).toEqual([
      {
        kind: "check",
        check: "checkSession",
        sessionId: "ETR009",
        message: "boom",
      },
    ]);
    expect(output.problems.map((p) => p.sessionId)).toEqual(["ETR010"]);
  });

  it("stops collecting after maxProblems", async () => {
    const output = await run(
      header +
        `export function checkSession(doc, report) {
          for (let i = 0; i < 10; i++) report({ id: "many", message: "m" + i });
        }`,
      { maxProblems: 5 },
    );
    expect(output.problems).toHaveLength(5);
    expect(output.errors.map((e) => e.kind)).toEqual(["limit"]);
  });
});
