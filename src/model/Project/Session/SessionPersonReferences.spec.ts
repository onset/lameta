import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Session } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { EncounteredVocabularyRegistry } from "../EncounteredVocabularyRegistry";

let sessionDirectory: string;

describe("Session references to a person", () => {
  beforeEach(() => {
    sessionDirectory = temp.mkdirSync("test");
  });
  afterEach(() => {
    temp.cleanupSync();
  });

  it("renames a contributor whose name differs only by spaces or accent composition", () => {
    const session = loadSessionWithContributors([
      " José Núñez ".normalize("NFD"),
      "José Núñez".normalize("NFC"),
    ]);
    session.updateSessionReferencesToPersonWhenIdChanges("José Núñez".normalize("NFC"), "Pepe");
    expect(session.metadataFile!.contributions.map((c) => c.personReference)).toEqual([
      "Pepe",
      "Pepe",
    ]);
  });

  it("lists one contribution for the same person and role written two ways", () => {
    const session = loadSessionWithContributors([
      " José Núñez ".normalize("NFD"),
      "José Núñez".normalize("NFC"),
    ]);
    expect(session.getAllContributionsToAllFiles()).toHaveLength(1);
  });
});

function loadSessionWithContributors(names: string[]): Session {
  const contributors = names
    .map((n) => `<contributor><name>${n}</name><role>speaker</role></contributor>`)
    .join("");
  fs.writeFileSync(
    Path.join(sessionDirectory, Path.basename(sessionDirectory) + ".session"),
    `<?xml version="1.0" encoding="utf-8"?><Session><contributions>${contributors}</contributions></Session>`,
  );
  return Session.fromDirectory(sessionDirectory, new EncounteredVocabularyRegistry());
}
