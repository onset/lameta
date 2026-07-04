// The renderer-side registry of installed / dev plugins.
//
// Because the renderer runs with nodeIntegration, everything here (fs scan, manifest parse,
// dev-folder watching) lives in the renderer — no main-process changes. The manager is a
// MobX-observable singleton; components observe `plugins`, each record's `enabled`, and each
// record's `reloadCounter` (bumped by the dev watcher to hot-reload an open tab).

import { observable, runInAction, makeObservable } from "mobx";
import Path from "path";
import fs from "fs-extra";
import { app } from "@electron/remote";
import userSettings from "../other/UserSettings";
import { parsePluginManifest, PluginManifest } from "./PluginManifest";
import { MatchablePlugin } from "./pluginMatching";

export type PluginSource = "user" | "dev";

export interface PluginRecord {
  /** manifest id when valid; otherwise a folder-derived fallback so it can still be listed. */
  id: string;
  directory: string;
  source: PluginSource;
  /** absolute path to the manifest file we read (for messages). */
  manifestPath?: string;
  manifest?: PluginManifest;
  /** parse/validation errors; present iff the manifest could not be loaded. */
  errors?: string[];
  /** enabled unless the id is in the persisted disabledPlugins list. observable. */
  enabled: boolean;
  /** bumped by the dev watcher on file change; PluginTabPanel keys its iframe on it. observable. */
  reloadCounter: number;
}

const MANIFEST_FILENAMES = ["plugin.json5", "plugin.json"];
const DISABLED_SETTING = "disabledPlugins";
const DEV_PATH_SETTING = "developerPluginPath";

function findManifestFile(dir: string): string | undefined {
  for (const name of MANIFEST_FILENAMES) {
    const p = Path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

export class PluginManager {
  public plugins: PluginRecord[] = [];

  private watchers: fs.FSWatcher[] = [];
  private watchDebounce: any = null;
  private initialized = false;

  constructor() {
    makeObservable(this, { plugins: observable });
  }

  /** The directory where installed (zipped) plugins are unpacked. */
  public get userPluginsDir(): string {
    return Path.join(app.getPath("userData"), "plugins");
  }

  /** The optional single dev-plugin folder (contains plugin.json5 directly). */
  public get developerPluginPath(): string {
    return userSettings.Get(DEV_PATH_SETTING, "");
  }
  public setDeveloperPluginPath(path: string) {
    userSettings.Set(DEV_PATH_SETTING, path || "");
    this.reload();
  }

  public initialize() {
    if (this.initialized) return;
    this.initialized = true;
    this.reload();
  }

  private getDisabledIds(): string[] {
    try {
      const raw = userSettings.Get(DISABLED_SETTING, "[]");
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  private setDisabledIds(ids: string[]) {
    userSettings.Set(DISABLED_SETTING, JSON.stringify(ids));
  }

  public setEnabled(id: string, enabled: boolean) {
    const disabled = new Set(this.getDisabledIds());
    if (enabled) disabled.delete(id);
    else disabled.add(id);
    this.setDisabledIds([...disabled]);
    const record = this.plugins.find((p) => p.id === id);
    if (record) runInAction(() => (record.enabled = enabled));
  }

  private loadRecordFromFolder(
    dir: string,
    source: PluginSource,
    disabledIds: Set<string>
  ): PluginRecord | undefined {
    const manifestPath = findManifestFile(dir);
    if (!manifestPath) {
      // Not a plugin folder at all (e.g. a stray file); skip silently.
      return undefined;
    }
    let record: PluginRecord;
    try {
      const text = fs.readFileSync(manifestPath, "utf8");
      const result = parsePluginManifest(text);
      if (result.errors) {
        record = {
          id: Path.basename(dir),
          directory: dir,
          source,
          manifestPath,
          errors: result.errors,
          enabled: false,
          reloadCounter: 0
        };
      } else {
        record = {
          id: result.manifest!.id,
          directory: dir,
          source,
          manifestPath,
          manifest: result.manifest,
          enabled: !disabledIds.has(result.manifest!.id),
          reloadCounter: 0
        };
      }
    } catch (e: any) {
      record = {
        id: Path.basename(dir),
        directory: dir,
        source,
        manifestPath,
        errors: [`Could not read manifest: ${e.message || e}`],
        enabled: false,
        reloadCounter: 0
      };
    }
    return observable(record);
  }

  /** Rescan disk. Existing open panels remount on the next file selection (no app restart). */
  public reload() {
    this.disposeWatchers();
    const disabledIds = new Set(this.getDisabledIds());
    const records: PluginRecord[] = [];

    // 1. Installed (user) plugins: userData/plugins/*/
    try {
      const base = this.userPluginsDir;
      if (fs.existsSync(base)) {
        for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
          if (!entry.isDirectory()) continue;
          const rec = this.loadRecordFromFolder(
            Path.join(base, entry.name),
            "user",
            disabledIds
          );
          if (rec) records.push(rec);
        }
      }
    } catch (e) {
      console.error("PluginManager: error scanning user plugins", e);
    }

    // 2. Optional dev plugin folder. Dev overrides user on duplicate id.
    const devPath = this.developerPluginPath;
    if (devPath && fs.existsSync(devPath)) {
      const rec = this.loadRecordFromFolder(devPath, "dev", disabledIds);
      if (rec) {
        const dupeIndex = records.findIndex((r) => r.id === rec.id);
        if (dupeIndex >= 0) records.splice(dupeIndex, 1);
        records.push(rec);
      }
    }

    runInAction(() => {
      this.plugins = observable(records);
    });

    this.setupWatchers();
  }

  /** Re-parse just one dev plugin's manifest and bump its reloadCounter to hot-reload its tab. */
  private refreshDevPlugin(record: PluginRecord) {
    const manifestPath = findManifestFile(record.directory);
    runInAction(() => {
      if (manifestPath) {
        try {
          const text = fs.readFileSync(manifestPath, "utf8");
          const result = parsePluginManifest(text);
          if (result.errors) {
            record.manifest = undefined;
            record.errors = result.errors;
          } else {
            record.manifest = result.manifest;
            record.errors = undefined;
          }
        } catch (e: any) {
          record.manifest = undefined;
          record.errors = [`Could not read manifest: ${e.message || e}`];
        }
      }
      record.reloadCounter = record.reloadCounter + 1;
    });
  }

  // Watch dev-source plugin folders so edits appear instantly. Installed zips stay static.
  private setupWatchers() {
    for (const record of this.plugins) {
      if (record.source !== "dev") continue;
      try {
        const watcher = fs.watch(
          record.directory,
          { recursive: true },
          () => {
            if (this.watchDebounce) clearTimeout(this.watchDebounce);
            this.watchDebounce = setTimeout(() => {
              this.refreshDevPlugin(record);
            }, 300);
          }
        );
        this.watchers.push(watcher);
      } catch (e) {
        console.warn(
          `PluginManager: could not watch dev plugin at ${record.directory}`,
          e
        );
      }
    }
  }

  private disposeWatchers() {
    if (this.watchDebounce) {
      clearTimeout(this.watchDebounce);
      this.watchDebounce = null;
    }
    for (const w of this.watchers) {
      try {
        w.close();
      } catch {
        /* ignore */
      }
    }
    this.watchers = [];
  }

  /** Enabled plugins that have a valid manifest — the input to tab matching. */
  public getEnabledMatchablePlugins(): MatchablePlugin[] {
    return this.plugins
      .filter((p) => p.enabled && p.manifest)
      .map((p) => ({ manifest: p.manifest! }));
  }

  /** Enabled, valid plugins that declare a `tabProvider` — the input to the tab-provider host
   * (which keeps a hidden provider iframe per plugin and asks it which tabs to show). */
  public getEnabledTabProviders(): PluginRecord[] {
    return this.plugins.filter((p) => p.enabled && p.manifest?.tabProvider);
  }

  /** Look up a record by id (for the panel to read reloadCounter, directory, etc.). */
  public getById(id: string): PluginRecord | undefined {
    return this.plugins.find((p) => p.id === id);
  }
}

const pluginManager = new PluginManager();
export default pluginManager;
