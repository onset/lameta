// Pure logic for deciding which plugin tabs apply to a file, in what order, and which
// (if any) claims the default tab. No IO, no react, no electron — unit-tested directly.

import { PluginManifest, PluginTabManifest } from "./PluginManifest";

/** The minimal shape matching needs from a plugin record. */
export interface MatchablePlugin {
  manifest: PluginManifest;
}

/** A plugin tab that matched the current file, carrying enough to render & namespace it. */
export interface MatchedPluginTab {
  pluginId: string;
  pluginVersion: string;
  /** the plugin's granted manifest permissions, e.g. ["companionFiles"]. */
  permissions: string[];
  tab: PluginTabManifest;
}

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

/** True if a single tab's match criteria hit the file. A tab matches if ANY criterion
 * hits; a tab with no (or empty) match object never matches. */
export function tabMatchesFile(
  tab: PluginTabManifest,
  file: MatchableFile
): boolean {
  const match = tab.match;
  if (!match) return false;

  if (
    match.lametaTypes &&
    file.lametaType &&
    match.lametaTypes.includes(file.lametaType)
  )
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

/**
 * All plugin tabs that apply to a file, ordered: plugins alphabetical by id, and within a
 * plugin, tabs in manifest order. These insert AFTER the built-in viewer tab (index 0) and
 * BEFORE the standard metadata tabs.
 */
export function getPluginTabsForFile(
  file: MatchableFile,
  enabledPlugins: MatchablePlugin[]
): MatchedPluginTab[] {
  const sortedPlugins = [...enabledPlugins].sort((a, b) =>
    a.manifest.id < b.manifest.id ? -1 : a.manifest.id > b.manifest.id ? 1 : 0
  );

  const result: MatchedPluginTab[] = [];
  for (const plugin of sortedPlugins) {
    for (const tab of plugin.manifest.tabs) {
      if (tabMatchesFile(tab, file)) {
        result.push({
          pluginId: plugin.manifest.id,
          pluginVersion: plugin.manifest.version,
          permissions: plugin.manifest.permissions ?? [],
          tab
        });
      }
    }
  }
  return result;
}

/**
 * The index the <Tabs> element should default to. The built-in viewer tab is index 0 and
 * the matched plugin tabs occupy indices 1..N (in `matchedTabs` order). If any matched tab
 * claims the default, the winner (max defaultPriority; ties broken by plugin id then tab
 * id) gets selected; otherwise the viewer tab (0) stays selected.
 */
/** The minimal shape computeDefaultIndex needs — satisfied by both MatchedPluginTab (static) and
 * MatchedProviderTab (tab-provider), whose `tab`s differ but share these fields. */
export interface DefaultClaimant {
  pluginId: string;
  tab: { id: string; claimDefault?: boolean; defaultPriority?: number };
}

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
