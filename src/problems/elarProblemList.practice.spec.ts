import { describe, it } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { makeLametaSourceReader } from "../export/lametaSourceComment";
import { RulesFileProblems } from "./RulesFileProblems";
import { rulesSandboxMain } from "./rulesSandboxMain";
import { findBuiltInRulesFile } from "./rulesFile";
import { checkProjectFields } from "./fieldRules";
import { checkProjectFolders } from "./lametaChecks";
import { combineProblems } from "./problems";

mobx.configure({ enforceActions: "never" });
temp.track();

// Writes every problem that lameta's checks find in some ELAR projects to a JSON file,
// so that two versions of lameta's checks can be compared: run it on each version and
// compare the files. Each problem is listed by what the user sees and where a click
// takes them, not by which check found it, so a check may move without changing the
// list.
//
//   LAMETA_PROBLEM_LIST_OUT=<file.json> [LAMETA_PROBLEM_LIST_PROJECTS=<dir>;<dir>]
//     pnpm exec vitest run src/problems/elarProblemList.practice.spec.ts
//
// It always checks a copy of the Edolo sample under ELAR with files added to break
// ELAR's rules, plus each project folder in LAMETA_PROBLEM_LIST_PROJECTS, such as a
// torture project made with --archive-config ELAR.
const out = process.env.LAMETA_PROBLEM_LIST_OUT;

// vitest cannot import a data: URL, which is how the sandbox loads a rules file
async function loadWithoutImport(source: string) {
  const names = [
    ...source.matchAll(/export\s+(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/g),
  ].map((m) => m[1]);
  return new Function(
    source.replace(/export\s+(?=const|let|var|function|class)/g, "") +
      `\nreturn { ${names.join(", ")} };`,
  )();
}

function useElar(dir: string) {
  const sprj = fs.readdirSync(dir).find((f) => f.endsWith(".sprj"))!;
  const path = Path.join(dir, sprj);
  fs.writeFileSync(
    path,
    fs
      .readFileSync(path, "utf8")
      .replace(
        /<ArchiveConfigurationName>[^<]*<\/ArchiveConfigurationName>/,
        "<ArchiveConfigurationName>ELAR</ArchiveConfigurationName>",
      ),
  );
}

// The Edolo sample under ELAR, with files and fields that break ELAR's rules
function makeEdoloWithProblems(): { dir: string; afterLoad: (project: Project) => void } {
  const dir = Path.join(temp.mkdirSync("problem list"), "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  useElar(dir);
  const etr009 = Path.join(dir, "Sessions", "ETR009");
  for (const name of [
    "ETR009_Careful.wav",
    "ETR009_text_20100606.flextext",
    "ETR009_text_20100606.eaf",
    "ETR009_other_20100606.flextext",
    "someone else.wav",
    "ETR009_a_very_long_file_name_here.txt",
    "ETR009_notes_20100606.pdf",
    "ETR009_photo.bmp",
    "ETR009_sheet_20100606.xlsx",
    "ETR009 Ölçü_20100606.txt",
    "ETR009_big.wav",
    "ETR009_bigger_20100606.txt",
  ]) {
    fs.writeFileSync(Path.join(etr009, name), "x");
  }
  // a second session, with a genre that is not in ELAR's list
  const etr010 = Path.join(dir, "Sessions", "ETR010");
  fs.mkdirSync(etr010);
  fs.writeFileSync(
    Path.join(etr010, "ETR010.session"),
    fs
      .readFileSync(Path.join(etr009, "ETR009.session"), "utf8")
      .replace(/<genre[^>]*>[^<]*<\/genre>/, '<genre type="string">made up genre</genre>'),
  );
  fs.writeFileSync(Path.join(etr010, "ETR010_story.wav"), "x");
  fs.writeFileSync(Path.join(etr010, "notes.txt"), "x");
  return {
    dir,
    afterLoad: (project) => {
      const session = (project.sessions.items as Session[]).find((s) => s.id === "ETR009")!;
      const file = (name: string) =>
        session.files.find((f) => f.getTextProperty("filename", "") === name)!;
      file("ETR009_big.wav").properties.setText("size", "25 GB");
      file("ETR009_bigger_20100606.txt").properties.setText("size", "57 GB");
    },
  };
}

describe.skipIf(!out)("every problem in ELAR projects", () => {
  it("lists them", async () => {
    const projects: { dir: string; afterLoad?: (project: Project) => void }[] = [
      makeEdoloWithProblems(),
      ...(process.env.LAMETA_PROBLEM_LIST_PROJECTS ?? "")
        .split(";")
        .filter((d) => d)
        .map((d) => {
          const copy = Path.join(temp.mkdirSync("problem list"), Path.basename(d));
          fs.copySync(d, copy);
          useElar(copy);
          return { dir: copy };
        }),
    ];
    const lists: Record<string, unknown[]> = {};
    for (const { dir, afterLoad } of projects) {
      const project = Project.fromDirectory(dir);
      afterLoad?.(project);
      const runner = new RulesFileProblems(
        async (input) => ({
          value: await rulesSandboxMain(input, makeLametaSourceReader, loadWithoutImport),
        }),
        (name) => findBuiltInRulesFile(name, "archive-configurations"),
      );
      const rules = await runner.checkNow(project);
      const problems = combineProblems(
        [...checkProjectFields(project), ...checkProjectFolders(project)],
        rules.problems,
      );
      lists[Path.basename(dir)] = problems
        .map((p) =>
          JSON.stringify({
            severity: p.severity,
            message: p.message,
            reason: p.reason,
            target: p.target,
            sessionId: p.sessionId,
          }),
        )
        .sort()
        .map((s) => JSON.parse(s));
      // what the rules file could not check, which the comparison must also keep
      lists[Path.basename(dir) + " (rules file errors)"] = rules.errors;
    }
    fs.writeFileSync(out!, JSON.stringify(lists, null, 1));
  }, 600000);
});
