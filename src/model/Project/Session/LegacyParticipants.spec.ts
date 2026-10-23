import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { Session } from "./Session";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { EncounteredVocabularyRegistry } from "../EncounteredVocabularyRegistry";

let sessionDirectory: string;

describe("Session legacy participants", () => {
  beforeEach(() => {
    sessionDirectory = temp.mkdirSync("test");
  });
  afterEach(() => {
    temp.cleanupSync();
  });

  it("makes a participant without a role into a contribution with the participant role", () => {
    const session = loadSessionWithParticipants("Tolo;", "");
    expect(contributionsOf(session)).toEqual([{ name: "Tolo", role: "participant" }]);
  });

  // SayMore writes each participant as "name (role)"
  it("reads the role in parentheses after a SayMore participant's name", () => {
    const session = loadSessionWithParticipants("Nɔkɔ Ɛsi (consultant);Wilema Dimo (speaker);", "");
    expect(contributionsOf(session)).toEqual([
      { name: "Nɔkɔ Ɛsi", role: "consultant" },
      { name: "Wilema Dimo", role: "speaker" },
    ]);
  });

  it("keeps every role that SayMore lists for one participant", () => {
    const session = loadSessionWithParticipants(
      "Pat (speaker);Pat (consultant);",
      `<contributor><name>Pat</name><role>speaker</role></contributor>`,
    );
    expect(contributionsOf(session)).toEqual([
      { name: "Pat", role: "speaker" },
      { name: "Pat", role: "consultant" },
    ]);
  });

  it("adds no participant role for a person that SayMore also lists with a role", () => {
    for (const participants of ["Pat;Pat (speaker);", "Pat (speaker);Pat;"]) {
      const session = loadSessionWithParticipants(participants, "");
      expect(contributionsOf(session)).toEqual([{ name: "Pat", role: "speaker" }]);
    }
  });

  it("keeps parentheses that hold no role as part of the name", () => {
    const session = loadSessionWithParticipants("Ann (Jr);", "");
    expect(contributionsOf(session)).toEqual([{ name: "Ann (Jr)", role: "participant" }]);
  });

  it("adds no contribution for a SayMore participant who already has one", () => {
    const session = loadSessionWithParticipants(
      "Nɔkɔ Ɛsi (consultant);",
      `<contributor><name>Nɔkɔ Ɛsi</name><role>consultant</role></contributor>`,
    );
    expect(contributionsOf(session)).toEqual([{ name: "Nɔkɔ Ɛsi", role: "consultant" }]);
  });
});

function loadSessionWithParticipants(participants: string, contributors: string): Session {
  fs.writeFileSync(
    Path.join(sessionDirectory, Path.basename(sessionDirectory) + ".session"),
    `<?xml version="1.0" encoding="utf-8"?>
  <Session><participants>${participants}</participants><contributions>${contributors}</contributions></Session>`,
  );
  return Session.fromDirectory(sessionDirectory, new EncounteredVocabularyRegistry());
}

function contributionsOf(session: Session) {
  return session.metadataFile!.contributions.map((c) => ({
    name: c.personReference,
    role: c.role,
  }));
}
