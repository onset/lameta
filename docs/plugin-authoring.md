# Writing a lameta file-handler plugin

A **file-handler plugin** adds one or more tabs to lameta's lower-right file pane. When the
user selects a file, lameta shows the built-in viewer tab plus any plugin tabs that match the
file. A plugin tab's content is a plain `<iframe>` loading the plugin's own HTML; it talks to
lameta over a small, versioned `postMessage` API.

This is a **stability boundary, not a security sandbox.** lameta doesn't defend against
malicious plugins, but the API is intentionally small so the host can evolve without breaking
plugins, and so plugins don't reach into host internals. Plugins run with normal web
capabilities (network is unrestricted) but have **no** access to Node or lameta internals, and
**no** access to lameta's `.meta`/`.session` metadata — only the selected file, their own
namespaced sidecar files, and (with the `companionFiles` permission) a scoped set of
companion files beside the selected file.

## Anatomy of a plugin

A plugin is a folder containing a manifest and whatever assets it needs:

```
my-plugin/
  plugin.json5        (or plugin.json)
  index.html          the page loaded into the tab's iframe
  main.js             your code
  styles.css
  lametaPluginClient.js   the (vendored) client kit
  lameta-plugin.css       the (optional, vendored) CSS starter kit
  lib/…                   any libraries you vendor
```

Distributed as a **`.lmplug`** file — this is just a zip with a different extension. The
`plugin.json5` must be at the archive root **or** exactly one level deep.

## The manifest (`plugin.json5`)

```json5
{
  id: "org.example.my-plugin",  // /^[a-z0-9][a-z0-9.\-]*$/ ; namespaces sidecars + install folder
  name: "My Plugin",
  version: "1.0.0",             // semver, display only
  apiVersion: 1,                // plugin API major version (this doc describes v1)
  description: "…",
  author: "…",
  // OPTIONAL user-facing label: a plain string or a {languageCode: string} map ("en" is the
  // fallback). Falls back to `name` where it is shown in the UI.
  label: { en: "My Plugin", es: "Mi complemento" },
  // OPTIONAL web page about your plugin. When present, the corner of your plugin's tab pane
  // shows an "About <label>" link that opens this URL in the user's default browser.
  "info-url": "https://example.org/my-plugin",
  minLametaVersion: "3.6.0",    // optional, informational

  // Optional capabilities you ask the host for. Currently the only known permission is
  // "companionFiles" (see "Companion files" below); anything else is a validation error.
  permissions: ["companionFiles"],

  // A plugin contributes tabs by declaring a TAB PROVIDER: a hidden page lameta loads once and
  // asks, on every file selection, which tabs to show for that file (see "Tab provider" below).
  tabProvider: {
    entry: "index.html",        // the page lameta loads (hidden) to answer tab queries
    handles: {                  // OPTIONAL coarse filter — only query me for these files;
      lametaTypes: ["Audio"],   // omit `handles` entirely to be queried for every selection.
      extensions: ["eaf"],      // lowercase, no dot
      mimePatterns: ["audio/*"] // exact ("image/png") or trailing wildcard ("audio/*")
    }
  }
}
```

Plugin tabs are inserted **after** the built-in viewer tab and **before** the
Properties/Contributors/Notes tabs, ordered by plugin id (alphabetical) then the order the
provider returns them.

## Tab provider — lameta asks your plugin which tabs to show

Instead of a static tab list, lameta **asks your plugin, on every selection change, which tabs it
wants for the selected file** — and never caches the answer. This lets the *same* file yield
different tabs over time: an audio file with no annotations can show a "Start Annotating" tab, and
once your plugin creates the annotation companion (and `api.selectFile`s to it), the next query for
that audio file can return `[]` (no tab).

- lameta loads your `tabProvider.entry` in a **hidden, persistent iframe** (one per plugin). In it,
  call `connectAsTabProvider(handler)`:

  ```js
  import { connectAsTabProvider } from "./lametaPluginClient.js";
  await connectAsTabProvider(async ({ file, folder, api }) => {
    if (file.lametaType === "Audio") {
      const hasEaf = await api.companions.exists(file.name + ".annotations.eaf");
      return hasEaf ? [] : [{ id: "start", label: "SayMore: Start Annotating" }];
    }
    if (file.extension === "eaf")
      return [{ id: "segments", label: "Segments", claimDefault: true }];
    return [];  // no tab for this file
  });
  ```

- Your handler runs on **every** selection change and must **recompute live** — don't cache a
  flag; check the current state (e.g. `api.companions.exists(...)`). While a query is in flight the
  `api.companions.*` calls are **scoped to the file being queried**, so you can inspect its
  companions directly.
- Return an array of `{ id, label, claimDefault?, defaultPriority? }`. `label` is a plain string or
  a language-code→string map (`en` fallback). Return `[]` for "no tab". `claimDefault: true` opens
  that tab instead of the built-in viewer.
- When the user opens one of your tabs, lameta creates the **content** iframe from the same
  `entry` and passes the chosen tab's id as `context.tab.id` (see `connectToLameta` below) so your
  SPA renders the right view.
- If your provider fails to load, errors, or doesn't answer in time, lameta simply shows no tab for
  your plugin for that file — it never blocks the UI.

## The API (v1)

Inside your iframe, vendor `lametaPluginClient.js` and connect:

```js
import { connectToLameta } from "./lametaPluginClient.js";

const { context, api } = await connectToLameta();
```

### `context` — `PluginInitContext`

```ts
{
  apiVersion: 1,
  plugin: { id, version, grantedPermissions },  // grantedPermissions: e.g. ["companionFiles"]
  file: {
    path,        // absolute path on disk (link files already resolved)
    name,        // "ETR009_Careful.mp3"
    extension,   // "mp3" (lowercase, no dot)
    mimeType,    // "audio/mpeg"
    lametaType,  // "Audio"
    uri          // "file://…" — usable directly in <audio>/<img>/<video> src
  },
  folder: { type: "session"|"person"|"project"|"project documents", directory },
  ui: { languageCode, appVersion }
}
```

### `api` — `PluginHostApiV1`

```ts
api.getFileBytes(): Promise<ArrayBuffer>          // the whole file (transferred, zero-copy)
api.readFileRange(offset, length): Promise<ArrayBuffer>  // a slice of the file (transferred)
api.readSidecar(name?): Promise<string | null>    // name defaults to "annotations"
api.writeSidecar(contents, name?): Promise<void>
api.listSidecars(): Promise<string[]>
api.selectFile(relPath): Promise<boolean>         // select another file in the same folder
api.companions.…                                  // see "Companion files" below
```

- For large media, prefer using `context.file.uri` directly in a media element rather than
  reading all the bytes.
- `readFileRange(offset, length)` reads `length` bytes of the selected file starting at
  `offset` (non-negative integers; `length` is clamped to the file size). Use it to
  stream-compute things like waveform envelopes of hour-long media in chunks instead of one
  giant `getFileBytes()` buffer.
- Sidecar `name` must match `/^[a-z0-9_-]+$/i`.

## Companion files (`permissions: ["companionFiles"]`)

Some plugins (annotation tools, transcription editors, subtitle editors) must read and write
sibling files that belong to the selected file, at those files' own paths, **beside the actual
media file** — not in `plugin-data/`. Declare the `companionFiles` permission in your manifest to
unlock `api.companions`. The `api.companions` object is always present on the client; without the
permission every call rejects with an error.

All paths are **relative to the selected file's own directory** (for `.link` files that is where
the real media lives, which may be outside the project) and are validated by the host against one
generic **prefix rule** — lameta core knows nothing about any particular plugin's naming
conventions. Let `A` be the selected file's name **truncated at its first `.`** (the whole name if
it has no dot). A `relPath` is an allowed companion iff:

1. it is relative — no absolute paths, no `..`, no empty segments (`\` and `/` are equivalent;
   comparison is case-insensitive);
2. it is at most **two segments** (one directory level deep);
3. its **first segment** either equals the selected file's whole name, or starts with `A`
   immediately followed by `.` or `_`;
4. in the two-segment case the second segment is any non-empty file name.

So for a selected `foo.wav` (`A = "foo"`) the whole SayMore family is reachable with no special
knowledge in the host — `foo.wav.annotations.eaf`, `foo.wav.annotations.pfsx`/`.psfx`,
`foo.wav.oralAnnotations.wav`, `foo_StandardAudio.wav` and its family (starts with `foo_`),
`foo.wav_Annotations/1,5_to_2,5_Careful.wav`, etc. And because the anchor stops at the first dot,
selecting `foo.wav.annotations.eaf` still anchors on `foo`, so the media `foo.wav`, its
`_Annotations/` recordings, and the whole family remain reachable — no special case. (Accepted
looseness under this stability-boundary stance: a dotted stem like `session.1.wav` anchors at
`session`, and the selected file itself is reachable through `companions.*`.)

> The pfsx/psfx pair above is plugin lore, not a host rule: ELAN writes `.pfsx` while SayMore's
> `kEafPreferencesFileExtension` is the transposed `.psfx`; both replace the eaf's extension. The
> host allows both simply because both share the file's name-stem.

Everything else is rejected: absolute paths, `..` anywhere, nesting deeper than one level, and any
first segment that does not anchor on the selected file's stem (a shared prefix that is not
followed by `.` or `_`, like `foobar.wav` for `foo.wav`, does not match).

```ts
api.companions.list(subdir?): Promise<{name, size, mtimeMs}[]>
api.companions.exists(relPath): Promise<boolean>
api.companions.readText(relPath): Promise<string>
api.companions.readBytes(relPath): Promise<ArrayBuffer>   // transferred, like getFileBytes
api.companions.writeText(relPath, contents): Promise<void>
api.companions.writeBytes(relPath, data): Promise<void>   // the ArrayBuffer is transferred
api.companions.rename(fromRelPath, toRelPath): Promise<void>
api.companions.delete(relPath): Promise<void>             // files only, never a directory
api.companions.stat(relPath): Promise<{size, mtimeMs} | null>
```

- **`list()`** with no argument reads the selected file's directory and returns the files whose
  name passes the prefix rule (so it may include the selected file itself and any sibling in the
  stem family — filter for what you care about). With a `subdir` (a single directory segment that
  itself passes the rule, e.g. `foo.wav_Annotations`) it lists **all** files directly inside that
  folder — an empty array if the folder doesn't exist.
- **Writes are atomic**: the host writes to a temp file in the target's directory and then
  renames it over the target, so a crash never leaves a truncated companion. The parent
  folder is created as needed (your first segment write creates `F_Annotations/`).
- **`rename` is a real filesystem rename**, not copy+delete — fast even for large segment
  WAVs, and it never leaves duplicate files behind.
- **Detecting external edits** (e.g. the user saving the `.eaf` from ELAN while lameta is
  open): poll `companions.stat()` on the file — every ~2 s is plenty — and reload when
  `mtimeMs` changes. There is no watch/event API in this version.

### When the selected file is itself a companion (e.g. the `.eaf`)

Because the prefix rule anchors at the first dot, selecting `<media>.annotations.eaf` (for example
after `api.selectFile` switches to a freshly created `.eaf`) anchors on `<media>` just like
selecting the media would — so the media file, its `_Annotations/` recordings, and the rest of the
family are all reachable, with no host special case. Note that `context.file.uri` then points at
the `.eaf` (not the media), so derive the media name from `context.file.name` and read the audio
for your waveform/playback via `companions.readBytes("<media>")`.

## Selecting another file (`api.selectFile`)

`api.selectFile(relPath)` asks lameta to make another file in the **same folder** the selected
file. The host registers the file into the folder's file list if it isn't already there (so a
file your plugin *just wrote* is picked up without a manual refresh), sets it as the selected
file, and re-drives the file pane — which **tears down your current iframe and creates a fresh one
bound to the newly selected file**. `relPath` is relative to `context.folder.directory` and must
be a bare file name (no `..`, no absolute paths, no subdirectories) that already exists on disk in
that directory — so write the file first (e.g. via
`companions.writeText("<media>.annotations.eaf", …)`) and then call `selectFile` on it. It
resolves to `true` if a file was selected, `false` if none was found. This powers the
"create an annotation file and switch to it" flow: write `<media>.annotations.eaf`, then
`await api.selectFile("<media>.annotations.eaf")` to land on its (e.g. "Segments") tab.

> Because `selectFile` destroys the calling iframe, treat it as the last thing you do — resolve
> any pending writes first (the host still completes writes it has already received; see the
> write-completion guarantee above), and don't expect code after the `await` to run reliably.

## Sidecars

Your persisted data lives at:

```
<folder.directory>/plugin-data/<pluginId>/<fileName>.<name>.json
```

The `plugin-data/` subfolder is invisible to lameta's file list, so your files never show up as
phantom rows and are not swept into `.meta` metadata. Sidecars are keyed by the **file name**.

## Lifecycle & the eager-persistence rule

**Your iframe is bound to exactly one file for its lifetime.** lameta creates it when its tab
becomes visible and destroys it when the user switches files or tabs — there are no
"selection changed" events in v1. During development, lameta also recreates the iframe every
time you save a source file (hot reload).

Because of this, **persist eagerly** (debounce your writes, e.g. 750 ms) and **restore your
state from `readSidecar()` on connect**. Do that and hot-reload — and switching away and back —
is loss-free.

### The write-completion guarantee

Any `lameta:request` the host has **received** before your iframe is torn down is executed to
completion — a `writeSidecar` or `companions.writeText` that reached the host finishes its
disk write even though your iframe is already gone. What is *not* guaranteed: the
`lameta:response` may never be delivered (there is nowhere to deliver it), and a message you
post at the same instant as teardown can be lost before the host ever sees it. So don't wait
for a "safe moment" to save — persist eagerly (debounced) and treat unresolved write promises
at teardown as harmless.

## Microphone access

Plugin iframes carry `allow="microphone"`, and lameta grants the resulting permission
request, so recording works with no setup on your side — just call
`navigator.mediaDevices.getUserMedia({ audio: true })`.

## The handshake

1. Your page loads and posts `{type:"lameta:ready"}` to the parent (the client kit does this).
2. lameta replies with `{type:"lameta:init", context}`.
3. API calls are `{type:"lameta:request", id, method, params}` → `{type:"lameta:response", id, result|error}`.

If lameta receives no `lameta:ready` within ~10 s, it shows a "plugin failed to start" overlay
with a Reload button. If your `apiVersion` is newer than the host supports, lameta shows an
in-panel message instead of loading the iframe.

## The CSS starter kit

Vendor `lameta-plugin.css` and link it to get lameta's font stack, colors (exposed as CSS
variables like `--lameta-dark-green`), and form-control styling, so your UI roughly matches the
host. It's a starting point — override freely.

## Installing & developing

- **Install**: File → Plugins… → *Install plugin…*, choose a `.lmplug`. Or drop the unzipped
  folder into the plugins folder (File → Plugins… → *Open plugins folder*).
- **Enable/disable/uninstall**: File → Plugins….
- **Develop with a live loop**: turn on Developer mode, then File → Plugins… → *Developer plugin
  folder* and point it at your plugin folder. lameta watches the folder and reloads the open tab
  whenever you save. If your plugin is buildless (plain ES modules, like the example), the loop
  is simply: edit → save → the tab refreshes. If you use a bundler, run it in watch mode
  (e.g. `vite build --watch`) and you get the same loop.

## A complete minimal plugin (copy-paste)

Make a folder with these three files, point the *Developer plugin folder* at it, select an
audio file, and you'll see a "Hello" tab that shows the file name and remembers a note.

**`plugin.json5`**

```json5
{
  id: "com.example.hello",
  name: "Hello Plugin",
  version: "1.0.0",
  apiVersion: 1,
  tabs: [
    {
      id: "hello",
      label: "Hello",
      entry: "index.html",
      match: { lametaTypes: ["Audio"] }
    }
  ]
}
```

**`index.html`**

```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /></head>
  <body>
    <h3 id="title">…</h3>
    <label>Note: <input id="note" type="text" /></label>
    <script type="module" src="main.js"></script>
  </body>
</html>
```

**`main.js`** (buildless — plain ES module; no client kit needed for this tiny example)

```js
const pending = new Map();
let nextId = 1;
function call(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    parent.postMessage({ type: "lameta:request", id, method, params }, "*");
  });
}
window.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || typeof d !== "object") return;
  if (d.type === "lameta:init") start(d.context);
  else if (d.type === "lameta:response") {
    const p = pending.get(d.id);
    if (!p) return;
    pending.delete(d.id);
    d.error ? p.reject(new Error(d.error)) : p.resolve(d.result);
  }
});

async function start(context) {
  document.getElementById("title").textContent = context.file.name;
  const note = document.getElementById("note");

  // Restore the saved note (eager-persistence: read on connect).
  const saved = await call("readSidecar", ["note"]);
  if (saved) note.value = JSON.parse(saved).text;

  // Persist on change.
  note.addEventListener("input", () => {
    call("writeSidecar", [JSON.stringify({ text: note.value }), "note"]);
  });
}

// Announce we're ready; lameta replies with lameta:init.
parent.postMessage({ type: "lameta:ready" }, "*");
```

For anything real, vendor `lametaPluginClient.js` (from `src/plugins/client/`) and use
`connectToLameta()` instead of hand-writing the protocol above.

## Full example

See `example-plugins/waveform-annotator/` for a complete, buildless plugin that shows a
waveform (vendored wavesurfer.js v7 ESM), lets you drag to create labelled regions, and
persists them to a sidecar. Build its `.lmplug` with `node package-plugin.mjs`.

## Known limitations (v1)

- **Regular content files only.** The Session and Person metadata views are plugin-free.
- **Renames orphan sidecars.** Sidecars are keyed by file name, so renaming a session (which
  renames its files) leaves the old sidecars behind. A future version may migrate them.
- **Deliberately not included in this version** (ask if you need them): a
  `companions.watch` event API (poll `companions.stat()` instead), an ffmpeg conversion
  service for producing `_StandardAudio.wav` (decode via Web Audio and write with
  `companions.writeBytes`), and `durationMs` in the file context (read it from your media
  element).
