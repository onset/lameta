// Pure logic for deciding whether a tab provider's `handles` filter covers a file, and which
// plugin tab (if any) claims the default tab. No IO, no react, no electron — unit-tested directly.

import { PluginTabMatch } from "./PluginManifest";

/** The file attributes matching cares about. */
export interface MatchableFile {
  /** lowercase extension without a dot, e.g. "mp3" */
  extension: string;
  mimeType: string;
  /** lameta file-type classification, e.g. "Audio" */
  lametaType: string;
}

function mimeMatches(pattern: string, mimeType: string): boolean {
  const p = pattern.toLowerCase();
  const m = mimeType.toLowerCase();
  if (p.endsWith("/*")) {
    return m.startsWith(p.slice(0, -1)); // "audio/*" -> prefix "audio/"
  }
  return p === m;
}

/** True if any criterion of `match` hits the file; an absent or empty `match` never matches. */
export function matchesFile(match: PluginTabMatch | undefined, file: MatchableFile): boolean {
  if (!match) return false;

  if (match.lametaTypes && file.lametaType && match.lametaTypes.includes(file.lametaType))
    return true;

  if (
    match.extensions &&
    file.extension &&
    match.extensions.includes(file.extension.toLowerCase().replace(/^\./, ""))
  )
    return true;

  if (
    match.mimePatterns &&
    file.mimeType &&
    match.mimePatterns.some((p) => mimeMatches(p, file.mimeType))
  )
    return true;

  return false;
}

/** The minimal shape computeDefaultIndex needs from a tab that a provider returned. */
export interface DefaultClaimant {
  pluginId: string;
  tab: { id: string; claimDefault?: boolean; defaultPriority?: number };
}

/**
 * The index the <Tabs> element should default to. The built-in viewer tab is index 0 and
 * the plugin tabs occupy indices 1..N (in `matchedTabs` order). If any of them claims the
 * default, the winner (max defaultPriority; ties broken by plugin id then tab id) gets
 * selected; otherwise the viewer tab (0) stays selected.
 */
export function computeDefaultIndex(matchedTabs: DefaultClaimant[]): number {
  let winnerIndex = -1;
  let winner: DefaultClaimant | undefined;

  matchedTabs.forEach((m, i) => {
    if (!m.tab.claimDefault) return;
    if (!winner) {
      winner = m;
      winnerIndex = i;
      return;
    }
    const a = m;
    const b = winner;
    const ap = a.tab.defaultPriority ?? 0;
    const bp = b.tab.defaultPriority ?? 0;
    let better = false;
    if (ap !== bp) better = ap > bp;
    else if (a.pluginId !== b.pluginId) better = a.pluginId < b.pluginId;
    else better = a.tab.id < b.tab.id;
    if (better) {
      winner = a;
      winnerIndex = i;
    }
  });

  return winnerIndex < 0 ? 0 : 1 + winnerIndex;
}
