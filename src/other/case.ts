export function capitalCase(s: string) {
  const allLower = s.toLowerCase();
  const words = allLower.split(" ");
  const capitalizedWords = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return capitalizedWords;
}

// Leave words alone if they are all caps, or if they are
// in a list of words that we know should not be changed.
export function sentenceCaseUnlessAcronym(s: string): string {
  const doNotChangeWords = ["FLEx"];
  // Split the string into words
  const words = s.split(" ");

  // first word is special, we want to capitalize it if it is not all caps
  if (
    words[0] !== words[0].toUpperCase() &&
    doNotChangeWords.indexOf(words[0]) < 0
  ) {
    words[0] =
      words[0].charAt(0).toUpperCase() + words[0].slice(1).toLowerCase();
  }

  // Convert the subsequent words to lower case
  for (let i = 1; i < words.length; i++) {
    if (
      words[i] !== words[i].toUpperCase() &&
      doNotChangeWords.indexOf(words[i]) < 0
    ) {
      words[i] = words[i].toLowerCase();
    }
  }

  // Join the words back into a string
  return words.join(" ");
}

export function sentenceCase(s: string): string {
  if (!s) return "";
  const words = s.trim().toLowerCase().split(" ");
  const firstWord = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.length === 1
    ? firstWord
    : `${firstWord} ${words.slice(1).join(" ")}`;
}
