import fs from "fs";
import path from "path";

import {
  EXPORT_STRING_DEFINITIONS,
  ExportStrings
} from "../src/export/ExportStringDefinitions";

type ExportStringLeaf = {
  keyParts: string[];
  english: string;
};

const poQuote = (value: string): string => JSON.stringify(value);

const walkExportStrings = (
  node: unknown,
  keyParts: string[],
  out: ExportStringLeaf[]
): void => {
  if (typeof node === "string") {
    out.push({ keyParts, english: node });
    return;
  }

  if (!node || typeof node !== "object") {
    return;
  }

  for (const key of Object.keys(node as Record<string, unknown>)) {
    const child = (node as Record<string, unknown>)[key];
    walkExportStrings(child, [...keyParts, key], out);
  }
};

const createPoContent = (leaves: ExportStringLeaf[]): string => {
  const contextByEnglish = new Map(
    EXPORT_STRING_DEFINITIONS.map((d) => [d.english, d.context] as const)
  );

  const blocks = leaves.map((leaf) => {
    const msgctxt = `lameta/exportStrings/${leaf.keyParts.join("/")}`;
    const translatorComment = contextByEnglish.get(leaf.english);

    const lines: string[] = [];
    if (translatorComment && translatorComment.trim().length > 0) {
      lines.push(`#. ${translatorComment}`);
    }
    lines.push(`msgctxt ${poQuote(msgctxt)}`);
    lines.push(`msgid ${poQuote(leaf.english)}`);
    lines.push(`msgstr ""`);
    return lines.join("\n");
  });

  return blocks.join("\n\n") + "\n";
};

const extractFromExportStrings = (): void => {
  const leaves: ExportStringLeaf[] = [];
  walkExportStrings(ExportStrings, [], leaves);

  // Sort by context to reduce churn while still being deterministic.
  leaves.sort((a, b) => a.keyParts.join("/").localeCompare(b.keyParts.join("/")));

  console.log(`extractFromExportStrings: Gathered ${leaves.length} strings.`);

  const content = createPoContent(leaves);

  const poBasename = "exportStrings.po";
  const englishFilePath = path.join("./", "locale", "en", poBasename);
  fs.mkdirSync(path.dirname(englishFilePath), { recursive: true });
  fs.writeFileSync(englishFilePath, content);
};

extractFromExportStrings();
