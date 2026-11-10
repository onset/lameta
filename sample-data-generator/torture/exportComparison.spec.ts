import { describe, it, expect } from "vite-plus/test";
import * as fs from "fs";
import * as path from "path";
import * as temp from "temp";
import {
  compareCsv,
  compareFolders,
  compareLines,
  isCompared,
  normalizeExportFile,
  normalizeExportText,
  normalizeReport,
  parseCsv,
  withoutSourceComments,
  writeNormalizedCopy,
} from "./exportComparison";

temp.track();

describe("normalizeExportText", () => {
  it("makes two exports of the same data equal", () => {
    const run = (date: string, version: string, time: string, guid: string) =>
      "\uFEFF" +
      `<METATRANSCRIPT Date="${date}" Originator="lameta ${version}" Type="SESSION">\r\n` +
      `<notes>lameta could not parse "05/06/2020". Encountered on ${time}</notes>\r\n` +
      `<guid>${guid}</guid>\r\n` +
      `"datePublished": "${date}T15:55:19.247Z",\r\n`;
    expect(
      normalizeExportText(
        run(
          "2026-10-23",
          "3.0.21-beta",
          "Fri Oct 23 2026 09:45:52 GMT-0600",
          "86707b50388c388dd0ad0c8484c8bc21",
        ),
      ),
    ).toBe(
      normalizeExportText(
        run(
          "2027-01-02",
          "3.1.4-alpha",
          "Sat Jan 02 2027 10:00:00 GMT+0100 (CET)",
          "d8ae4cc9c1e0bddc6d0898a812bd925c",
        ),
      ),
    );
  });

  it("keeps what the user entered", () => {
    const text =
      '<Date>2010-01-01</Date>\n<Title>lameta 3 demo</Title>\n<Key Name="Keyword">abc</Key>\n' +
      '"dateCreated": "2015-11-11",\n';
    expect(normalizeExportText(text)).toBe(text);
  });

  it("removes the file system times that RO-Crate reports", () => {
    expect(
      normalizeExportText(
        '"dateCreated": "2026-10-23T16:09:16.636Z",\n"dateModified": "2024-06-01T12:00:00.000Z"',
      ),
    ).toBe('"dateCreated": "(file time)",\n"dateModified": "(file time)"');
  });
});

describe("normalizeExportFile", () => {
  const paths = { projectDir: "P", lametaDir: "L", outDir: "O" };
  it("removes the export date from the sessions that the bundle makes for documents", () => {
    for (const name of ["ConsentDocuments", "DescriptionDocuments", "OtherDocuments"])
      for (const ext of [".imdi", ".opex"])
        expect(
          normalizeExportFile(`imdi-bundle/P/${name}${ext}`, "<Date>2026-10-23</Date>", paths),
        ).toBe("<Date>(export date)</Date>");
  });

  it("keeps the date of a session that the user made", () => {
    expect(normalizeExportFile("imdi-bundle/P/ETR009.imdi", "<Date>2010-01-01</Date>", paths)).toBe(
      "<Date>2010-01-01</Date>",
    );
  });
});

describe("normalizeReport", () => {
  it("names the folders of the run the same way on every machine", () => {
    const paths = { projectDir: "D:\\runs\\P ŋ", lametaDir: "D:\\old", outDir: "D:\\out\\raw" };
    const report = {
      projectDir: paths.projectDir,
      out: paths.outDir,
      facts: { sessionsLoaded: 3 },
      failures: [
        { step: "s", target: "t", error: "ENOENT: stat 'D:\\old\\x.wav'", stack: "at line 3" },
      ],
      notifications: [{ kind: "warning", message: "D:\\runs\\P ŋ\\Sessions\\a.wav: bad" }],
    };
    const normalized = JSON.parse(normalizeReport(JSON.stringify(report), paths));
    expect(normalized).toEqual({
      facts: { sessionsLoaded: 3 },
      failures: [{ step: "s", target: "t", error: "ENOENT: stat '(lameta)\\x.wav'" }],
      notifications: [{ kind: "warning", message: "(project)\\Sessions\\a.wav: bad" }],
    });
  });

  it("names a folder inside the lameta worktree by the inner folder", () => {
    const paths = { projectDir: "D:\\P", lametaDir: "D:\\lameta", outDir: "D:\\lameta\\tmp\\raw" };
    const report = { facts: { where: "D:\\lameta\\tmp\\raw\\x.json" } };
    expect(JSON.parse(normalizeReport(JSON.stringify(report), paths)).facts.where).toBe(
      "(out)\\x.json",
    );
  });
});

describe("withoutSourceComments", () => {
  it("removes the comments that lead from IMDI back to lameta's fields, and nothing else", () => {
    const text =
      "<Session>\n" +
      '  <!-- lameta-source {"folderType":"session"} -->\n' +
      "  <Name>a</Name>\n" +
      '  <!--lameta-translations {"folderType":"project"}-->\n' +
      "  <!-- a comment of someone else's -->\n" +
      "</Session>\n";
    expect(withoutSourceComments(text)).toBe(
      "<Session>\n  <Name>a</Name>\n  <!-- a comment of someone else's -->\n</Session>\n",
    );
  });
});

describe("compareLines", () => {
  it("reports the lines that only one side has, ignoring order and indentation", () => {
    expect(compareLines("<a>1</a>\n<b>2</b>\n<c/>", "<b>2</b>\n  <a>1</a>\n<c>3</c>")).toEqual([
      "- <c/>",
      "+ <c>3</c>",
    ]);
  });

  it("reports a line that one side has more often", () => {
    expect(
      compareLines(
        "<Actor>\n<Name>a</Name>\n</Actor>",
        "<Actor>\n<Name>a</Name>\n</Actor>\n<Actor>\n<Name>a</Name>\n</Actor>",
      ),
    ).toEqual(["+ <Actor>", "+ <Name>a</Name>", "+ </Actor>"]);
  });
});

describe("parseCsv", () => {
  it("reads quoted cells holding commas, quotes and line breaks", () => {
    expect(parseCsv('a,b\r\n"x, ""y""","line 1\nline 2"\r\n')).toEqual([
      ["a", "b"],
      ['x, "y"', "line 1\nline 2"],
    ]);
  });
});

describe("compareCsv", () => {
  it("reports cells, columns and rows, matching rows by their first cell", () => {
    const before = "id,title,old\nS1,One,x\nS2,Two,x\nS3,Three,x\n";
    const after = "id,new,title\nS2,y,Two\nS1,y,One!\nS4,y,Four\n";
    expect(compareCsv(before, after)).toEqual([
      "column removed: old",
      "column added: new",
      'row removed: "S3"',
      'row added: "S4"',
      'title of "S1": "One" -> "One!"',
    ]);
  });

  it("keeps apart, and names apart, a row named like a repeat and that repeat", () => {
    const before = "name,job\nMaria,cleaner\nMaria,painter\nMaria (2),potter\n";
    const after = "name,job\nMaria,cleaner\nMaria,sculptor\nMaria (2),weaver\n";
    expect(compareCsv(before, after)).toEqual([
      'job of "Maria" #2: "painter" -> "sculptor"',
      'job of "Maria (2)": "potter" -> "weaver"',
    ]);
  });

  it("tells apart rows that share a first cell by their order", () => {
    const before = "name,job\nMaria,cleaner\nMaria,painter\n";
    const after = "name,job\nMaria,cleaner\nMaria,sculptor\n";
    expect(compareCsv(before, after)).toEqual(['job of "Maria" #2: "painter" -> "sculptor"']);
  });
});

describe("compareFolders", () => {
  const folder = (files: Record<string, string>) => {
    const dir = temp.mkdirSync("export-comparison");
    for (const [rel, text] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
      fs.writeFileSync(path.join(dir, rel), text);
    }
    return dir;
  };

  it("counts a change once, with every file it is in", () => {
    const comparison = compareFolders(
      folder({ "a.imdi": "<Id>es</Id>\n<N>a</N>", "b.imdi": "<Id>es</Id>", "gone.imdi": "" }),
      folder({ "a.imdi": "<Id>spa</Id>\n<N>a</N>", "b.imdi": "<Id>spa</Id>", "new.imdi": "" }),
    );
    expect(comparison).toEqual({
      onlyBefore: ["gone.imdi"],
      onlyAfter: ["new.imdi"],
      changes: [
        { description: "- <Id>es</Id>", files: ["a.imdi", "b.imdi"] },
        { description: "+ <Id>spa</Id>", files: ["a.imdi", "b.imdi"] },
      ],
    });
  });

  it("can leave out lameta-source comments", () => {
    const before = folder({ "a.imdi": "<N>a</N>\n" });
    const after = folder({ "a.imdi": '<!-- lameta-source {"fieldKey":"n"} -->\n<N>a</N>\n' });
    expect(compareFolders(before, after).changes).toHaveLength(1);
    expect(compareFolders(before, after, { ignoreSourceComments: true }).changes).toEqual([]);
  });

  it("reports a file that differs only in line order or whitespace", () => {
    const comparison = compareFolders(
      folder({ "a.imdi": "<a/>\n<b/>", "c.csv": "id\nS1\nS2\n" }),
      folder({ "a.imdi": "<b/>\n  <a/>", "c.csv": "id\nS2\nS1\n" }),
    );
    expect(comparison.changes).toEqual([
      {
        description: "differs only in the order of lines or in whitespace",
        files: ["a.imdi", "c.csv"],
      },
    ]);
  });
});

describe("isCompared", () => {
  it("compares only lameta's IMDI and OPEX in the bundles, not the files they copy", () => {
    expect(isCompared("imdi-bundle/P/S1/S1.imdi")).toBe(true);
    expect(isCompared("opex-bundle/P/S1/S1.opex")).toBe(true);
    expect(isCompared("imdi-bundle/P/S1/notes.json")).toBe(false);
    expect(isCompared("opex-bundle/P/S1/S1.session")).toBe(false);
    expect(isCompared("ro-crate-per-session/S1.json")).toBe(true);
    expect(isCompared("would-save/Sessions/S1/S1.session")).toBe(true);
  });
});

describe("writeNormalizedCopy", () => {
  it("copies the text outputs, normalized, and leaves out media and the zip", () => {
    const raw = temp.mkdirSync("export-comparison-raw");
    fs.mkdirSync(path.join(raw, "imdi-bundle"));
    fs.writeFileSync(path.join(raw, "imdi-bundle", "s.imdi"), '<M Date="2026-10-23"/>\r\n');
    fs.writeFileSync(path.join(raw, "imdi-bundle", "s.wav"), "RIFF");
    fs.writeFileSync(path.join(raw, "export.zip"), "PK");
    fs.writeFileSync(path.join(raw, "report.json"), JSON.stringify({ out: raw, facts: {} }));
    const normalized = path.join(temp.mkdirSync("export-comparison-normalized"), "n");
    writeNormalizedCopy(raw, normalized, { projectDir: "P", lametaDir: "L", outDir: raw });
    expect(fs.readdirSync(normalized, { recursive: true }).map(String).sort()).toEqual([
      "imdi-bundle",
      path.join("imdi-bundle", "s.imdi"),
      "report.json",
    ]);
    expect(fs.readFileSync(path.join(normalized, "imdi-bundle", "s.imdi"), "utf8")).toBe(
      '<M Date="(export date)"/>\n',
    );
  });
});
