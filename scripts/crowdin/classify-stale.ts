// One-off diagnostic for Phase 6: classify stale locale/pt|zh translations
// that aren't yet covered by locale/pt-BR|zh-CN.
import * as path from "path";
import { loadPo, poEntries, entryKey } from "./lib";

const R = path.join(__dirname, "..", "..");
for (const [stale, fresh] of [
  ["pt", "pt-BR"],
  ["zh", "zh-CN"]
]) {
  console.log(`==== ${stale} -> ${fresh} ====`);
  for (const set of ["messages", "fields"]) {
    const staleE = poEntries(loadPo(path.join(R, "locale", stale, `${set}.po`))).filter((e) =>
      e.msgstr.trim()
    );
    const en = poEntries(loadPo(path.join(R, "locale", "en", `${set}.po`)));
    const enKeys = new Set(en.map((e) => entryKey(e.msgctxt, e.msgid)));
    const enTexts = new Map<string, string[]>();
    for (const e of en) {
      if (!enTexts.has(e.msgid)) enTexts.set(e.msgid, []);
      enTexts.get(e.msgid)!.push(e.msgctxt);
    }
    const freshMap = new Map(
      poEntries(loadPo(path.join(R, "locale", fresh, `${set}.po`))).map((e) => [
        entryKey(e.msgctxt, e.msgid),
        e.msgstr
      ])
    );
    for (const e of staleE) {
      const k = entryKey(e.msgctxt, e.msgid);
      if ((freshMap.get(k) ?? "").trim()) continue;
      if (!enKeys.has(k)) {
        const otherCtxs = enTexts.get(e.msgid) ?? [];
        if (otherCtxs.length === 0)
          console.log(`RETIRED [${set}]: ${JSON.stringify(e.msgid).slice(0, 70)}`);
        else {
          const untranslated = otherCtxs.filter(
            (c) => !(freshMap.get(entryKey(c, e.msgid)) ?? "").trim()
          );
          console.log(
            `CTX-MOVED [${set}]: ${JSON.stringify(e.msgid).slice(0, 60)} old-ctx=${e.msgctxt || "-"} new-ctx=[${otherCtxs.join(", ")}] untranslated-at=[${untranslated.join(", ")}]`
          );
        }
      } else {
        console.log(`STILL-EMPTY [${set}]: ${JSON.stringify(e.msgid).slice(0, 70)} ctx=${e.msgctxt || "-"}`);
      }
    }
  }
}
