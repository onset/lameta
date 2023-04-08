export function CapitalCase(s: string) {
  const allLower = s.toLowerCase();
  const words = allLower.split(" ");
  const capitalizedWords = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
  return capitalizedWords;
}
