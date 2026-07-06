// Host-side manager for plugin TAB PROVIDERS (the "host asks the plugin which tabs to show"
// model — see docs/plugin-authoring.md "Tab provider" and PluginHostBridge.getTabs).
//
// For each enabled plugin that declares a `tabProvider`, this keeps ONE persistent hidden iframe
// (the plugin's entry, loaded in provider mode) plus a PluginHostBridge, and exposes
// getTabsForFile() which asks every relevant provider — on EVERY selection change, never cached —
// which tabs it wants for the selected file. The provider's companions.* calls are scoped (by the
// bridge) to the file being queried, so it decides live (e.g. `companions.exists(<media>.eaf)`).

import { PluginHostBridge } from "./PluginHostBridge";
import { pluginAssetUrl } from "./pluginScheme";
import pluginManager, { PluginRecord } from "./PluginManager";
import { PluginTabMatch } from "./PluginManifest";
import { tabMatchesFile } from "./pluginMatching";
import { PluginTabProviderContext, TabDescriptor } from "./PluginApiTypes";
import { currentUILanguage } from "../other/localization";
import pkg from "package.json";

/** The file the host asks a provider about. */
export interface TabProviderFile {
  name: string;
  extension: string;
  mimeType: string;
  lametaType: string;
  path: string;
  uri: string;
}
export interface TabProviderFolder {
  type: string;
  directory: string;
}

/** A tab a provider claimed for the selected file, plus the info the panel needs to load it. */
export interface MatchedProviderTab {
  pluginId: string;
  pluginVersion: string;
  permissions: string[];
  /** the plugin's tabProvider.entry — the content iframe loads this and self-renders by tab id. */
  entry: string;
  tab: TabDescriptor;
}

interface ProviderInstance {
  iframe: HTMLIFrameElement;
  bridge: PluginHostBridge;
  record: PluginRecord;
  reloadCounter: number;
}

/** True if a provider whose `handles` filter is `handles` should be queried for `file`. An absent
 * or empty `handles` means "query for every file"; otherwise it matches like a tab `match`. */
export function providerHandlesFile(
  handles: PluginTabMatch | undefined,
  file: { extension: string; mimeType: string; lametaType: string }
): boolean {
  if (!handles) return true;
  const hasCriteria =
    (handles.lametaTypes && handles.lametaTypes.length > 0) ||
    (handles.extensions && handles.extensions.length > 0) ||
    (handles.mimePatterns && handles.mimePatterns.length > 0);
  if (!hasCriteria) return true;
  return tabMatchesFile({ id: "", label: "", entry: "", match: handles }, file);
}

const READY_TIMEOUT_MS = 4000;
function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class TabProviderHost {
  private providers = new Map<string, ProviderInstance>();

  /** Bring the set of live provider iframes in line with the enabled tabProvider plugins.
   * Recreates a provider whose dev reloadCounter changed (hot-reload). Safe to call often. */
  public ensureSynced(): void {
    if (typeof document === "undefined") return; // not in a DOM (e.g. unit tests)
    const wanted = pluginManager.getEnabledTabProviders();
    const wantedIds = new Set(wanted.map((r) => r.id));

    for (const id of [...this.providers.keys()])
      if (!wantedIds.has(id)) this.destroyProvider(id);

    for (const record of wanted) {
      const existing = this.providers.get(record.id);
      if (!existing || existing.reloadCounter !== record.reloadCounter) {
        if (existing) this.destroyProvider(record.id);
        this.createProvider(record);
      }
    }
  }

  /** Prime provider iframes early (e.g. at app start) so the first selection has them connected. */
  public warmUp(): void {
    try {
      this.ensureSynced();
    } catch (e) {
      console.warn("TabProviderHost.warmUp failed", e);
    }
  }

  private createProvider(record: PluginRecord): void {
    try {
      const entry = record.manifest!.tabProvider!.entry;
      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      iframe.setAttribute("aria-hidden", "true");
      iframe.setAttribute("data-lameta-tab-provider", record.id);
      // Same custom secure scheme as the visible content iframe (origin consistency).
      iframe.src = pluginAssetUrl(record.id, entry);

      const context: PluginTabProviderContext = {
        apiVersion: record.manifest!.apiVersion,
        plugin: {
          id: record.id,
          version: record.manifest!.version,
          grantedPermissions: [...(record.manifest!.permissions || [])]
        },
        ui: { languageCode: currentUILanguage, appVersion: pkg.version },
        role: "tabProvider"
      };

      const bridge = new PluginHostBridge({
        iframe,
        role: "tabProvider",
        context,
        filePath: "",
        fileName: "",
        folderDirectory: "",
        pluginId: record.id,
        permissions: record.manifest!.permissions || []
      });

      document.body.appendChild(iframe);
      bridge.attach();
      this.providers.set(record.id, {
        iframe,
        bridge,
        record,
        reloadCounter: record.reloadCounter
      });
    } catch (e) {
      console.warn(
        `TabProviderHost: could not create provider for ${record.id}`,
        e
      );
    }
  }

  private destroyProvider(id: string): void {
    const p = this.providers.get(id);
    if (!p) return;
    try {
      p.bridge.detach();
    } catch {
      /* ignore */
    }
    try {
      p.iframe.remove();
    } catch {
      /* ignore */
    }
    this.providers.delete(id);
  }

  /**
   * Ask every relevant provider which tabs it wants for `file`. Uncached: call it fresh on every
   * selection change. Providers are queried concurrently; a provider that isn't ready in time or
   * errors simply contributes no tabs. Results are ordered by plugin id, then provider order.
   */
  public async getTabsForFile(
    file: TabProviderFile,
    folder: TabProviderFolder
  ): Promise<MatchedProviderTab[]> {
    this.ensureSynced();
    const providers = [...this.providers.values()].sort((a, b) =>
      a.record.id < b.record.id ? -1 : a.record.id > b.record.id ? 1 : 0
    );

    const perProvider = await Promise.all(
      providers.map(async (p): Promise<MatchedProviderTab[]> => {
        const handles = p.record.manifest?.tabProvider?.handles;
        if (!providerHandlesFile(handles, file)) return [];
        try {
          // Don't block the tab strip forever on a provider that never connects.
          await Promise.race([p.bridge.ready, timeout(READY_TIMEOUT_MS)]);
          const tabs = await p.bridge.getTabs({ file, folder });
          return tabs.map((tab) => ({
            pluginId: p.record.id,
            pluginVersion: p.record.manifest!.version,
            permissions: p.record.manifest!.permissions || [],
            entry: p.record.manifest!.tabProvider!.entry,
            tab
          }));
        } catch {
          return [];
        }
      })
    );
    return perProvider.flat();
  }
}

const tabProviderHost = new TabProviderHost();
export default tabProviderHost;
