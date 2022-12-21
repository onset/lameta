// From any code in the Render process,
// import { mainProcessApi } from "../MainProcessApiAccess";
// mainProcessApi.someFunction(someArg).then()...
// This is is using `electron-call` to produce type-safe wrappers that hide the IPC stuff.
import call from "electron-call";

// notice, we're importing type info only. The code won't be loaded in the render process, won't be available in browser debugger
import type { MainProcessApi } from "./mainProcess/MainProcessApi";

const mainProcessApi = call.use<MainProcessApi>("MainProcessApi");

export { mainProcessApi };
