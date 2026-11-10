// The project's metadata in English, Spanish and Arabic. Arabic puts right-to-left text
// and script shaping next to Latin, and the Latin names of artists and places inside it.
// Each list here is in the same order as its English list in theme.ts, so that a hash of
// the case id picks the same item in every language.

import * as theme from "./theme";

// as lameta's language chooser writes them; lameta reads them as the slots en, es and ar
export const kMetadataLanguages = "eng;spa;ara";

const kLanguages = ["en", "es", "ar"] as const;
type Language = (typeof kLanguages)[number];
export type Translations = Partial<Record<Language, string>>;

// The way TextHolder serializes: only the languages that have text, and English alone
// as plain text.
export function multilingualText(t: Translations): string {
  const present = kLanguages.filter((l) => t[l]);
  if (present.length === 1 && present[0] === "en") return t.en!;
  return present.map((l) => `[[${l}]]${t[l]}`).join("");
}

// Most fields are in all three languages; the rest are partly translated, as they are
// in a real project that is still being worked on.
const kCoverage: Array<[number, Language[]]> = [
  [12, ["en", "es", "ar"]],
  [2, ["en", "es"]],
  [2, ["en", "ar"]],
  [2, ["en"]],
  [2, ["es"]],
];
const kCoverageTotal = kCoverage.reduce((sum, [weight]) => sum + weight, 0);

export function partlyTranslated(t: Translations, key: string): Translations {
  let n = theme.hash(`${key}|languages`) % kCoverageTotal;
  for (const [weight, languages] of kCoverage) {
    if (n < weight) return Object.fromEntries(languages.map((l) => [l, t[l]]));
    n -= weight;
  }
  throw new Error("unreachable");
}

// text for a multilingual field, with a share of fields partly translated
export function partlyTranslatedText(t: Translations, key: string): string {
  return multilingualText(partlyTranslated(t, key));
}

const subjects: Record<"es" | "ar", string[]> = {
  es: [
    "el peso emocional del beige",
    "por qué el lienzo debe quedar en blanco",
    "pintar el color de un martes",
    "un cuadrado que se niega a ser cuadrado",
    "el tercer lado de una línea",
    "escuchar el gris",
    "el espacio negativo y su casero",
    "una escultura hecha solo de vacilación",
    "la pincelada que se escapó",
    "la política del color naranja",
    "dibujar con una escalera",
    "por qué el marco es la verdadera obra",
    "un punto, considerado a fondo",
    "lo que tiró el limpiador de la galería",
    "los triángulos como forma de disculpa",
    "la sombra de un lienzo que nunca se pintó",
    "un retrato del viento, visto por detrás",
    "la larga discusión con el color azul",
    "el silencio, en tres capas de barniz",
    "la instalación que confundieron con un andamio",
    "cómo colgar un cuadro al revés a propósito",
    "una exposición en total oscuridad",
    "el momento antes del primer trazo",
    "once tonos de blanco y un impostor",
  ],
  ar: [
    "الثقل العاطفي للون البيج",
    "لماذا يجب أن تبقى اللوحة بيضاء",
    "رسم لون يوم الثلاثاء",
    "مربع يرفض أن يكون مربعًا",
    "الجانب الثالث من الخط",
    "الإصغاء إلى الرمادي",
    "الفراغ السلبي ومالكه",
    "منحوتة مصنوعة كلها من التردد",
    "ضربة الفرشاة التي أفلتت",
    "سياسة اللون البرتقالي",
    "الرسم بسلّم",
    "لماذا الإطار هو العمل الحقيقي",
    "نقطة، بتأمل طويل",
    "ما رماه عامل التنظيف في المعرض",
    "المثلثات بوصفها اعتذارًا",
    "ظل لوحة لم تُرسم قط",
    "صورة للريح من الخلف",
    "الجدال الطويل مع اللون الأزرق",
    "الصمت في ثلاث طبقات من الورنيش",
    "العمل التركيبي الذي ظُنّ أنه سقالة",
    "كيف تعلّق لوحة مقلوبة عمدًا",
    "معرض في ظلام دامس",
    "اللحظة التي تسبق العلامة الأولى",
    "إحدى عشرة درجة من الأبيض وواحدة دخيلة",
  ],
};

const quirks: Record<"es" | "ar", string[]> = {
  es: [
    "El artista pidió que el micrófono no mirara hacia el cuadro, para no influir en él.",
    "Grabado mientras el artista volvía a pintar la pared del estudio del mismo blanco, cuatro veces.",
    "A mitad de la entrevista, un visitante preguntó si la obra estaba terminada. No quedó claro que la pregunta tuviera respuesta.",
    "El artista respondió a cada pregunta con otra pregunta y luego con una larga pausa, que la transcripción marca como «…».",
    "Una comisaria se unió diez minutos y se fue convencida de que la silla formaba parte de la exposición.",
    "La entrevista se detuvo dos veces porque el artista quería mirar la esquina de la sala.",
    "Hay un largo pasaje sobre un solo pincel, al que el artista llama «el anciano».",
    "El artista trajo un lienzo, lo desenvolvió, lo miró y lo volvió a envolver.",
    "Ruido de fondo: un ventilador de la galería, lluvia y alguien clavando un clavo en una obra en curso.",
    "El artista insiste en que la grabación misma es la obra y en que ahora somos coautores.",
  ],
  ar: [
    "طلب الفنان أن يُدار الميكروفون بعيدًا عن اللوحة كي لا يؤثر فيها.",
    "سُجّلت بينما كان الفنان يعيد طلاء جدار الاستوديو بالأبيض نفسه أربع مرات.",
    "في منتصف المقابلة سأل زائر هل اكتمل العمل، ولم يتضح أن للسؤال جوابًا.",
    "أجاب الفنان عن كل سؤال بسؤال، ثم بصمت طويل تكتبه النسخة المكتوبة «…».",
    "انضمت أمينة المعرض لعشر دقائق ثم غادرت مقتنعة بأن الكرسي جزء من المعرض.",
    "توقفت المقابلة مرتين لأن الفنان أراد أن ينظر إلى زاوية الغرفة.",
    "فيها مقطع طويل عن فرشاة واحدة يسميها الفنان «الشيخ».",
    "أحضر الفنان لوحة، وفكّ غلافها، ونظر إليها، ثم لفّها من جديد.",
    "ضجيج في الخلفية: مروحة المعرض، ومطر، وشخص يدق مسمارًا في عمل لم يكتمل.",
    "يصرّ الفنان على أن التسجيل نفسه هو العمل الفني وأننا صرنا شركاء في تأليفه.",
  ],
};

const titleOpenings: Record<"es" | "ar", string[]> = {
  es: ["Sobre", "Acerca de", "Contra", "Hacia", "Más allá de", "Notas sobre"],
  ar: ["عن", "حول", "ضد", "نحو", "ما وراء", "ملاحظات حول"],
};

const movements: Record<"es" | "ar", string[]> = {
  es: [
    "Neobeigeísmo",
    "Poscuadradismo",
    "Vacilacionismo",
    "Minimalismo Lateral",
    "Escuela de la Pintura Fresca",
    "Constructivismo Accidental",
    "Romanticismo en Escala de Grises",
    "Escalerismo",
    "Expresionismo sin Marco",
  ],
  ar: [
    "البيجية الجديدة",
    "ما بعد التربيعية",
    "التردّدية",
    "التقليلية الجانبية",
    "مدرسة الطلاء الطري",
    "البنائية العرضية",
    "الرومانسية الرمادية",
    "السلّمية",
    "التعبيرية بلا إطار",
  ],
};

const studios: Record<"es" | "ar", string[]> = {
  es: [
    "el estudio 4 de la vieja fábrica de jabón",
    "la piscina abandonada",
    "la Galería Huya",
    "un ascensor entre los pisos 3 y 4",
    "la cocina del artista",
    "la azotea",
    "un invernadero prestado",
    "la trastienda de una tienda de marcos",
  ],
  ar: [
    "الاستوديو 4 في مصنع الصابون القديم",
    "المسبح المهجور",
    "غاليري هويا",
    "مصعد عالق بين الطابقين 3 و4",
    "مطبخ الفنان",
    "السطح",
    "دفيئة مستعارة",
    "الغرفة الخلفية لمحل إطارات",
  ],
};

export const kTopics = ["colour", "line", "space", "silence", "frames"];
const topics: Record<"es" | "ar", string[]> = {
  es: ["color", "línea", "espacio", "silencio", "marcos"],
  ar: ["اللون", "الخط", "الفراغ", "الصمت", "الإطارات"],
};

// every list above, with its English list, so that a test can check that they line up
export const kParallelLists: Array<[string[], Record<"es" | "ar", string[]>]> = [
  [theme.kSubjects, subjects],
  [theme.kQuirks, quirks],
  [theme.kTitleOpenings, titleOpenings],
  [theme.kMovements, movements],
  [theme.kStudios, studios],
  [kTopics, topics],
];

export const kProjectTitles: Translations = {
  en: theme.kProjectTitle,
  es: theme.kProjectTitleSpanish,
  ar: "مقابلات مع فنانين تجريديين: الخط غير المرئي",
};

export const kProjectDescriptions: Translations = {
  en: theme.kProjectDescription,
  es:
    "Un proyecto de documentación que graba a artistas abstractos hablando de una obra que, según insisten, no trata de nada. " +
    "Las entrevistas se hicieron en estudios, galerías, una piscina abandonada y un ascensor atascado entre dos pisos. " +
    "Los artistas hablan kürbiniano, edolo, tok pisin y varias lenguas que describen como «todavía en invención».",
  ar:
    "مشروع توثيق يسجّل فنانين تجريديين يتحدثون عن أعمال يصرّون على أنها لا تدور حول أي شيء. " +
    "أُجريت المقابلات في استوديوهات ومعارض ومسبح مهجور ومصعد علق بين طابقين. " +
    "يتحدث الفنانون الكوربينية والإيدولو والتوك بيسين وعدة لغات يصفونها بأنها «ما زالت قيد الاختراع».",
};

export const kClosedUntilDry: Translations = {
  en: "The artist asks that this stay closed until the paint is dry.",
  es: "El artista pide que esto siga cerrado hasta que se seque la pintura.",
  ar: "يطلب الفنان أن تبقى مغلقة حتى يجف الطلاء.",
};

export function themedTitles(id: string): Translations {
  return {
    en: theme.themedTitle(id),
    // "de el" and "a el" contract to "del" and "al"
    es: `${theme.pick(titleOpenings.es, id, "t")} ${theme.pick(subjects.es, id, "s")}`.replace(
      /\b(de|a) el\b/,
      (_, p) => (p === "de" ? "del" : "al"),
    ),
    ar: `${theme.pick(titleOpenings.ar, id, "t")} ${theme.pick(subjects.ar, id, "s")}`,
  };
}

// who is a name, or undefined for "the artist"
export function themedDescriptions(id: string, who?: string): Translations {
  const subject = (l: "es" | "ar") => theme.pick(subjects[l], id, "d");
  const quirk = (l: "es" | "ar") => theme.pick(quirks[l], id, "q");
  return {
    en: theme.themedDescription(id, who),
    es: `${who ?? "El artista"} habla sobre ${subject("es")}. ${quirk("es")}`,
    ar: `حديث مع ${who ?? "الفنان"} عن ${subject("ar")}. ${quirk("ar")}`,
  };
}

export function themedBiographies(id: string, name: string): Translations {
  const movement = (l: "es" | "ar") => theme.pick(movements[l], id, "m");
  const studio = (l: "es" | "ar") => theme.pick(studios[l], id, "w");
  const subject = (l: "es" | "ar") => theme.pick(subjects[l], id, "b");
  return {
    en: theme.themedBiography(id, name),
    es: `${name} pertenece al movimiento ${movement("es")} y trabaja en ${studio("es")}. Cuando se le preguntó por sus influencias, solo dijo: «${subject("es")}».`,
    ar: `${name}: من حركة ${movement("ar")}، ومكان العمل ${studio("ar")}. وعن مصادر الإلهام كان الجواب الوحيد: «${subject("ar")}».`,
  };
}

// Arabic separates the keywords with an Arabic comma, as an Arabic typist would
export function themedKeywords(id: string): Translations {
  return {
    en: `${theme.pick(theme.kMovements, id)}, studio visit`,
    es: `${theme.pick(movements.es, id)}, visita al estudio`,
    ar: `${theme.pick(movements.ar, id)}، زيارة الاستوديو`,
  };
}

export function themedTopics(id: string): Translations {
  return {
    en: theme.pick(kTopics, id),
    es: theme.pick(topics.es, id),
    ar: theme.pick(topics.ar, id),
  };
}

// the same suffix after the text in every language, such as " (ELAR access U)"
export function withSuffix(t: Translations, suffix: string): Translations {
  return Object.fromEntries(Object.entries(t).map(([l, text]) => [l, `${text}${suffix}`]));
}
