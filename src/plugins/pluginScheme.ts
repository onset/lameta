// The registered custom scheme that plugin iframes are served from (see main.ts:
// registerSchemesAsPrivileged / registerPluginProtocol). Serving over a registered
// privileged+secure scheme instead of file:// gives the iframe a real tuple origin
// (lameta-plugin://<pluginId>), which — unlike an opaque file:// origin — CAN receive a
// Permissions-Policy microphone delegation, so the plugin recorder's getUserMedia works.
export const PLUGIN_SCHEME = "lameta-plugin";

/** Build the iframe `src` for a plugin's entry asset served over the custom scheme.
 * The pluginId is the URL host (the parser lowercases it, and the main-process handler
 * looks it up case-insensitively); `assetPath` is the manifest entry (e.g. "index.html").
 * Relative asset loads inside the page (hashed chunks, the AudioWorklet) resolve against
 * this origin and are served by the same handler — no need to enumerate them here. */
export function pluginAssetUrl(pluginId: string, assetPath: string): string {
  const cleanPath = String(assetPath || "index.html").replace(/^\/+/, "");
  return `${PLUGIN_SCHEME}://${pluginId.toLowerCase()}/${cleanPath}`;
}
