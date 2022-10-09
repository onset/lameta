// This file should be loaded into the render process
import call from "electron-call";

// notice, we're importing type info only. The code won't be loaded in the render process, won't be available in browser debugger
import type { MainProcessApi } from "./mainProcess/MainProcessApi";

const main = call.use<MainProcessApi>("MainProcessApi");

export { main };
