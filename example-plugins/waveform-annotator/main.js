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
    error: "Could not load audio: ",
    zoom: "Zoom"
  },
  es: {
    loading: "Cargando audio…",
    ready:
      "Arrastra sobre la forma de onda para crear una región y escribe una etiqueta.",
    labelPlaceholder: "Etiqueta de la región",
    delete: "Eliminar región",
    error: "No se pudo cargar el audio: ",
    zoom: "Zoom"
  }
};
function stringsFor(languageCode) {
  const base = (languageCode || "en").split("-")[0];
  return STRINGS[base] || STRINGS.en;
}

const REGION_COLOR = "rgba(230, 150, 100, 0.25)";
const SIDECAR_VERSION = 1;
const LABEL_DEBOUNCE_MS = 400;
const ZOOM_STORAGE_KEY = "zoom";
const DEFAULT_ZOOM = 100; // px/second — a reasonable middle ground between "fit" and fully zoomed in

const statusEl = document.getElementById("status");
const hintEl = document.getElementById("hint");
const labelInput = document.getElementById("label-input");
const deleteButton = document.getElementById("delete-region");
const waveformEl = document.getElementById("waveform");
const zoomLabel = document.getElementById("zoom-label");
const zoomSlider = document.getElementById("zoom-slider");

// Read the saved zoom preference (px/second for wavesurfer's zoom()). Guard against a missing,
// corrupt, or non-positive value by falling back to DEFAULT_ZOOM.
function readZoomPreference() {
  const raw = Number(localStorage.getItem(ZOOM_STORAGE_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ZOOM;
}

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
  zoomLabel.textContent = t.zoom;
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
    // wavesurfer only accepts zoom(pxPerSec) once the audio is decoded, so this is the first
    // point we can apply the user's saved zoom level.
    //
    // PERSISTENCE NOTE (localStorage vs sidecar): zoom is this user's personal UI preference on
    // this machine, scoped to this plugin's origin — it has nothing to do with the audio file
    // itself, so it lives in localStorage rather than the sidecar (which holds annotation data
    // that belongs to the file and must travel with the project).
    const zoom = readZoomPreference();
    ws.zoom(zoom);
    zoomSlider.value = String(zoom);
    zoomSlider.disabled = false;
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

  // Zoom is machine-local and synchronous, so no debounce is needed (unlike scheduleLabelSave()
  // above) — just apply it and write it straight through on every change.
  zoomSlider.addEventListener("input", () => {
    const value = Number(zoomSlider.value);
    ws.zoom(value);
    localStorage.setItem(ZOOM_STORAGE_KEY, String(value));
  });
}

main().catch((e) => {
  statusEl.textContent = "Plugin error: " + (e && e.message ? e.message : e);
  console.error(e);
});
