// The project's theme: a documentation project of interviews with abstract artists.
// Everything here is invented. Text is picked deterministically from a hash of the case id,
// so the project is the same on every run.

export function hash(s: string): number {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0)!;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pick<T>(list: readonly T[], key: string, salt = ""): T {
  return list[hash(key + "|" + salt) % list.length];
}

export const kProjectTitle = "Interviews with Abstract Artists: The Unseen Line";
export const kProjectTitleSpanish = "Entrevistas con artistas abstractos: la línea invisible";
export const kProjectDescription =
  "A documentation project recording abstract artists talking about work that, they insist, is not about anything. " +
  "Interviews took place in studios, galleries, one disused swimming pool and a lift that was stuck between floors. " +
  'The artists speak Kürbinian, Edolo, Tok Pisin and several languages they describe as "still being invented".';

export const kSubjects = [
  "the emotional weight of beige",
  "why the canvas must stay blank",
  "painting the colour of a Tuesday",
  "a square that refuses to be a square",
  "the third side of a line",
  "listening to grey",
  "negative space and its landlord",
  "a sculpture made entirely of hesitation",
  "the brushstroke that got away",
  "the politics of the colour orange",
  "drawing with a ladder",
  "why the frame is the real work",
  "a dot, considered at length",
  "what the gallery cleaner threw away",
  "triangles as a form of apology",
  "the shadow of a canvas that was never painted",
  "a portrait of the wind, from behind",
  "the long argument with the colour blue",
  "silence, in three coats of varnish",
  "the installation that was mistaken for scaffolding",
  "how to hang a painting upside down on purpose",
  "an exhibition in total darkness",
  "the moment before the first mark",
  "eleven shades of white and one impostor",
];

export const kQuirks = [
  "The artist asked that the microphone face away from the painting, so as not to influence it.",
  "Recorded while the artist repainted the studio wall the same white, four times.",
  "Halfway through, a visitor asked whether the work was finished. It was not clear that the question had an answer.",
  'The artist answered every question with a question, and then with a long pause, which the transcript renders as "…".',
  "A curator joined for ten minutes and left convinced that the chair was part of the exhibition.",
  "The interview stopped twice because the artist wanted to look at the corner of the room.",
  'There is a long passage about a single brush, which the artist calls "the elder".',
  "The artist brought a canvas, unwrapped it, looked at it, and wrapped it again.",
  "Background noise: a gallery fan, rain, and someone hammering a nail into a work in progress.",
  "The artist insists the recording itself is the artwork and that we are now co-authors.",
];

const notes = [
  "Check the spelling of the movement; the artist spells it differently every year.",
  "Ask again about the yellow period, which may not have happened.",
  "Consent form signed in charcoal. Scan it before it smudges.",
  "The title is the artist's own and must not be translated literally.",
  "Transcribe the pauses; the artist says they are the content.",
  "Follow-up visit planned once the paint dries, which may take a decade.",
];

export const kGenreFlavor: Record<string, string> = {
  narrative: "tells the story of a painting that was never finished",
  dialog: "argues with a critic about whether a line can be sad",
  procedural_discourse: "explains, step by step, how to prime a canvas for nothing",
  singing: "sings to a sculpture to help it settle",
  drama: "re-enacts the opening night where nobody came",
  oratory: "addresses an empty gallery",
};

export const kTitleOpenings = ["On", "About", "Against", "Towards", "Beyond", "Notes on"];

export function themedTitle(id: string): string {
  return `${pick(kTitleOpenings, id, "t")} ${pick(kSubjects, id, "s")}`;
}

export function themedDescription(id: string, who = "The artist"): string {
  return `${who} talks about ${pick(kSubjects, id, "d")}. ${pick(kQuirks, id, "q")}`;
}

export function themedNotes(id: string): string {
  return pick(notes, id, "n");
}

// for the bulk part of the project
export const kFirstNames = [
  "Agnès",
  "Bartholomew",
  "Chiamaka",
  "Dmitri",
  "Ếlodie",
  "Farhad",
  "Greta",
  "Hiroshi",
  "Ingrid",
  "Jules",
  "Kalani",
  "Lucía",
  "Malak",
  "Nnamdi",
  "Oona",
  "Piotr",
  "Quilla",
  "Rangi",
  "Saoirse",
  "Tenzin",
  "Ulla",
  "Vũ",
  "Wanjiru",
  "Xochitl",
  "Yusuf",
  "Zofia",
  "Ásdís",
  "Ŋozi",
  "Þóra",
  "Ömer",
];
export const kLastNames = [
  "Achterberg",
  "Blanc",
  "Castellanos",
  "Dubois-Ngata",
  "Eriksdóttir",
  "Fontaine",
  "Gómez",
  "Haddad",
  "Ikeda",
  "Jovanović",
  "Kowalczyk",
  "Lindqvist",
  "Mbeki",
  "Nakamura",
  "O'Shaughnessy",
  "Pereira",
  "Quispe",
  "Rautenbach",
  "Søndergaard",
  "Tanaka",
  "Ulloa",
  "Vasquez",
  "Whitehorse",
  "Yılmaz",
  "Zielińska",
];
export const kMovements = [
  "Neo-Beigeism",
  "Post-Squarism",
  "Hesitationism",
  "Lateral Minimalism",
  "The Wet Paint School",
  "Accidental Constructivism",
  "Greyscale Romanticism",
  "Ladderism",
  "Frameless Expressionism",
];
export const kStudios = [
  "Studio 4, the old soap factory",
  "the disused swimming pool",
  "Gallery Huya",
  "a lift between floors 3 and 4",
  "the artist's kitchen",
  "the rooftop",
  "a borrowed greenhouse",
  "the back room of a frame shop",
];

const occupations = [
  "Painter of one grey square, repeatedly",
  "Sculptor of negative space",
  "Conceptual artist; the best work is the absence of work",
  "Paints with ladders",
  "Performance artist who performs mostly in the car park",
  "Installation artist, mainly scaffolding",
  "Curator of empty frames",
  "Colourist specialising in beige",
  "Former accountant, now draws only diagonals",
  "Gallery cleaner and, by accident, prize-winning artist",
];

export function themedOccupation(id: string): string {
  return pick(occupations, id, "o");
}

export function themedBiography(id: string, name: string): string {
  return `${name} belongs to ${pick(kMovements, id, "m")} and works in ${pick(kStudios, id, "w")}. Asked about influences, ${name} said only \"${pick(kSubjects, id, "b")}\".`;
}
