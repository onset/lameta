// Waveform Annotator — a buildless lameta plugin (plain ES modules, no bundler).
//
// Exercises the whole v1 API: connect -> localize -> getFileBytes -> render waveform ->
// drag to create regions -> click to edit a region's label -> writeSidecar; and readSidecar
// to restore on load. Because lameta destroys and recreates this iframe on file change (and on
// every save during development), we persist eagerly and restore from the sidecar on connect —
// so hot-reload and switching-away-and-back are loss-free.
//
// PERSISTENCE NOTE: wavesurfer's region-created / region-updated / region-removed events all
// fire once a change has *settled* (end of a drag/resize), so we save immediately on those.
// We do NOT rely on a debounce timer surviving until the user leaves — the iframe is torn down
// on file/tab change and any pending timer would be lost. Only free-text label typing is
// debounced, and we also flush it on blur.

import WaveSurfer from "./lib/wavesurfer.esm.js";
import RegionsPlugin from "./lib/regions.esm.js";
import { connectToLameta } from "./lametaPluginClient.js";

// --- tiny hand-rolled localization (en + es) -------------------------------
const STRINGS = {
  en: {
    loading: "Loading audio…",
    ready: "Drag across the waveform to create a region, then type a label.",
    labelPlaceholder: "Region label",
    delete: "Delete region",
    error: "Could not load audio: "
  },
  es: {
    loading: "Cargando audio…",
    ready:
      "Arrastra sobre la forma de onda para crear una región y escribe una etiqueta.",
    labelPlaceholder: "Etiqueta de la región",
    delete: "Eliminar región",
    error: "No se pudo cargar el audio: "
  }
};
function stringsFor(languageCode) {
  const base = (languageCode || "en").split("-")[0];
  return STRINGS[base] || STRINGS.en;
}

const REGION_COLOR = "rgba(230, 150, 100, 0.25)";
const SIDECAR_VERSION = 1;
const LABEL_DEBOUNCE_MS = 400;

const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const labelInput = document.getElementById("label-input");
const deleteButton = document.getElementById("delete-region");
const waveformEl = document.getElementById("waveform");

let api = null;
let regionsPlugin = null;
let selectedRegion = null;
let labelTimer = null;
let t = stringsFor("en");
// While we're restoring saved regions, addRegion() emits region-created; suppress saving then
// so restore doesn't immediately rewrite (and potentially race) the file we just read.
let restoring = false;

// Read the current label of a region as a plain string. NB: region.getContent(true) returns
// the content DOM node; getContent(false)/getContent() returns its innerHTML string, which is
// what we want to serialize and to show in the input.
function labelOf(region) {
  const c = region.getContent ? region.getContent(false) : "";
  return (c || "").toString();
}

async function save() {
  if (!regionsPlugin || !api) return;
  const regions = regionsPlugin.getRegions().map((r) => ({
    id: r.id,
    start: r.start,
    end: r.end,
    label: labelOf(r)
  }));
  const payload = JSON.stringify({ version: SIDECAR_VERSION, regions }, null, 2);
  try {
    await api.writeSidecar(payload);
  } catch (e) {
    console.error("waveform-annotator: writeSidecar failed", e);
  }
}

function scheduleLabelSave() {
  if (labelTimer) clearTimeout(labelTimer);
  labelTimer = setTimeout(() => {
    labelTimer = null;
    save();
  }, LABEL_DEBOUNCE_MS);
}

function selectRegion(region) {
  selectedRegion = region;
  if (region) {
    labelInput.disabled = false;
    deleteButton.disabled = false;
    labelInput.value = labelOf(region);
    labelInput.focus();
  } else {
    labelInput.disabled = true;
    deleteButton.disabled = true;
    labelInput.value = "";
  }
}

async function restore() {
  try {
    const text = await api.readSidecar(); // default "annotations"
    if (!text) return;
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.regions)) return;
    restoring = true;
    for (const r of data.regions) {
      regionsPlugin.addRegion({
        id: r.id,
        start: r.start,
        end: r.end,
        content: r.label || "",
        color: REGION_COLOR
      });
    }
  } catch (e) {
    console.warn("waveform-annotator: could not restore sidecar", e);
  } finally {
    restoring = false;
  }
}

async function main() {
  const conn = await connectToLameta();
  api = conn.api;
  t = stringsFor(conn.context.ui.languageCode);
  hintEl.textContent = t.ready;
  labelInput.placeholder = t.labelPlaceholder;
  deleteButton.textContent = t.delete;
  statusEl.textContent = t.loading;

  const ws = WaveSurfer.create({
    container: waveformEl,
    waveColor: "#becde4",
    progressColor: "#3d5e90",
    cursorColor: "#e69664",
    height: 160
  });
  ws.on("ready", () => {
    statusEl.textContent = "";
  });
  regionsPlugin = ws.registerPlugin(RegionsPlugin.create());

  // Load the file bytes as a Blob (works for any audio format the OS can decode).
  let bytes;
  try {
    bytes = await api.getFileBytes();
  } catch (e) {
    statusEl.textContent = t.error + e.message;
    return;
  }
  await ws.loadBlob(new Blob([bytes]));
  statusEl.textContent = ""; // in case "ready" fired before our listener attached

  // Drag on the waveform to create regions.
  regionsPlugin.enableDragSelection({ color: REGION_COLOR });

  // Persist immediately on settled region changes (see PERSISTENCE NOTE above).
  regionsPlugin.on("region-created", (region) => {
    if (!restoring) save();
  });
  regionsPlugin.on("region-updated", () => {
    if (!restoring) save();
  });
  regionsPlugin.on("region-removed", () => {
    if (!restoring) save();
  });
  regionsPlugin.on("region-clicked", (region, e) => {
    e.stopPropagation(); // don't seek
    selectRegion(region);
  });

  // Restore any saved annotations (before wiring label editing so it doesn't double-save).
  await restore();

  // Label editing for the selected region.
  labelInput.addEventListener("input", () => {
    if (!selectedRegion) return;
    selectedRegion.setContent(labelInput.value);
    scheduleLabelSave();
  });
  labelInput.addEventListener("blur", () => {
    if (labelTimer) {
      clearTimeout(labelTimer);
      labelTimer = null;
    }
    save();
  });
  deleteButton.addEventListener("click", () => {
    if (!selectedRegion) return;
    selectedRegion.remove(); // fires region-removed -> save()
    selectRegion(null);
  });
}

main().catch((e) => {
  statusEl.textContent = "Plugin error: " + (e && e.message ? e.message : e);
  console.error(e);
});
