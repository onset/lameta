// The bulk of the project: hundreds of ordinary-looking interviews and artists, so that
// load time, the problems sidebar, search and export run at the size of a real project.
// The hard cases live in cases.ts; this part is meant to look like everyday data.

import { Context } from "./cases";
import * as m from "./media";
import * as theme from "./theme";
import { genres } from "./vocabularies";
import { Contribution, lametaPerson, lametaSession, metaFile } from "./xml";

const roles = [
  "speaker",
  "interviewer",
  "recorder",
  "translator",
  "transcriber",
  "consultant",
  "performer",
  "photographer",
];
const languagePool = [
  "qaa-x-kurbin",
  "qaa-x-kurbin;etr",
  "etr;tpi",
  "tpi",
  "etr",
  "qaa-x-kurbin;tpi;eng",
  "fr",
  "es;qaa-x-kurbin",
];
const accessPool = ["O", "O", "O", "U", "S"];
const statusPool = ["Finished", "Finished", "In_Progress", "Incoming", "Skipped"];

export interface BulkPerson {
  folder: string;
  code: string;
}

function bulkPeople(count: number): BulkPerson[] {
  const max = theme.kFirstNames.length * theme.kLastNames.length;
  if (count > max) throw new Error(`--bulk-people can be at most ${max}`);
  const people: BulkPerson[] = [];
  for (let i = 0; i < count; i++) {
    // step through the grid of names in an order that mixes first and last names
    const k = (i * 7919) % max;
    const first = theme.kFirstNames[k % theme.kFirstNames.length];
    const last = theme.kLastNames[Math.floor(k / theme.kFirstNames.length)];
    const folder = `${first} ${last}`;
    // every fifth artist goes by a code, which sessions then use
    const code =
      i % 5 === 0 ? `${first[0]}${last[0]}${String(i).padStart(3, "0")}`.normalize("NFC") : "";
    people.push({ folder, code });
  }
  return people;
}

export function writeBulk(ctx: Context, sessionCount: number, peopleCount: number) {
  const { w } = ctx;
  const people = bulkPeople(peopleCount);
  const rand = m.seededRandom(20241022);
  const r = (n: number) => Math.floor(rand() * n);

  people.forEach((p, i) => {
    const languages = languagePool[r(languagePool.length)]
      .split(";")
      .map((tag, j) => ({ tag, primary: j === 0, mother: j === 0, father: r(2) === 0 }));
    w.file(
      `People/${p.folder}/${p.folder}.person`,
      lametaPerson({
        notes: theme.themedNotes(p.folder),
        name: p.folder,
        code: p.code || undefined,
        birthYear: String(1938 + r(65)),
        gender: ["Female", "Male", "Other", "Female", "Male"][i % 5],
        primaryOccupation: theme.themedOccupation(p.folder),
        description: theme.themedBiography(p.folder, p.folder),
        ethnicGroup: theme.pick(theme.kMovements, p.folder, "e"),
        languages,
        custom:
          i % 3 === 0
            ? {
                Movement: theme.pick(theme.kMovements, p.folder),
                Studio: theme.pick(theme.kStudios, p.folder),
              }
            : undefined,
      }),
    );
    // most artists have signed consent; some forms are scans, some photos
    if (i % 7 !== 3)
      w.file(
        `People/${p.folder}/${p.folder}_Consent.${i % 2 ? "png" : "pdf"}`,
        i % 2 ? m.png(8, 8) : m.minimalPdf(`Consent ${p.folder}`),
      );
    if (i % 6 === 0) w.file(`People/${p.folder}/${p.folder}_Photo.png`, m.png(12, 12));
  });
  w.note(
    "People (bulk)",
    `${people.length} artists with themed biographies, languages, codes on every fifth one (sessions use the code), consent files on six in seven.`,
    "load time, People list, consent checks, export size",
  );

  const g = genres();
  for (let i = 1; i <= sessionCount; i++) {
    const year = 2015 + (i % 10);
    const month = 1 + (i % 12);
    const day = 1 + (i % 28);
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const stamp = date.replace(/-/g, "");
    const id = `INT_${year}_${String(i).padStart(4, "0")}`;
    const contributorCount = 1 + r(4);
    const contributions: Contribution[] = [];
    let artist = "";
    for (let c = 0; c < contributorCount; c++) {
      const p = people[r(people.length)];
      if (c === 0) artist = p.folder;
      contributions.push({
        name: p.code || p.folder,
        role: c === 0 ? "speaker" : roles[r(roles.length)],
      });
    }
    // about one interview in a hundred credits someone who has no People record
    if (r(100) === 0)
      contributions.push({
        name: `${theme.pick(theme.kFirstNames, id)} (no record)`,
        role: "participant",
      });
    w.file(
      `Sessions/${id}/${id}.session`,
      lametaSession({
        notes: theme.themedNotes(id),
        id,
        title: theme.themedTitle(id),
        description: theme.themedDescription(id, artist),
        date,
        genre:
          i % 9 === 0
            ? g[r(g.length)].id
            : ["dialog", "interview", "personal_narrative", "oral_history"][r(4)],
        access: accessPool[r(accessPool.length)],
        accessDescription:
          i % 11 === 0
            ? "The artist asks that this stay closed until the paint is dry."
            : undefined,
        status: statusPool[r(statusPool.length)],
        languages: languagePool[r(languagePool.length)],
        workingLanguages: "eng",
        location: theme.pick(theme.kStudios, id),
        keyword: `${theme.pick(theme.kMovements, id)}, studio visit`,
        topic: theme.pick(["colour", "line", "space", "silence", "frames"], id),
        contributions,
      }),
    );
    w.file(`Sessions/${id}/${id}_${stamp}.wav`, m.wav(0.1, 8000, 1, 220 + (i % 40) * 10));
    w.file(
      `Sessions/${id}/${id}_${stamp}.wav.meta`,
      metaFile({
        notes: theme.pick(
          [
            "Clean recording.",
            "Gallery fan audible.",
            "Rain on the skylight.",
            "The artist hums throughout.",
          ],
          id,
          "a",
        ),
        equipment: "Zoom H5",
        recordingQuality: theme.pick(["Excellent", "Good", "Fair", "Poor"], id, "rq"),
      }),
    );
    if (i % 4 === 0)
      w.file(`Sessions/${id}/${id}_${stamp}.eaf`, ctx.content.make("eaf", theme.themedTitle(id)));
    if (i % 10 === 0) w.file(`Sessions/${id}/${id}_Artwork.png`, m.png(16, 16));
    if (i % 25 === 0)
      w.file(`Sessions/${id}/${id}_${stamp}_notes.txt`, `${theme.themedDescription(id, artist)}\n`);
  }
  w.note(
    "Sessions/INT_* (bulk)",
    `${sessionCount} interviews, 2015-2024, each with a short WAV and its .meta; every fourth has an EAF, every tenth an artwork photo. About one in a hundred credits a person with no People record.`,
    "load time, Sessions list, search index, problems sidebar, export size and time",
  );
}
