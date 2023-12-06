// From any code in the Render process,
// import { mainProcessApi } from "../MainProcessApiAccess";
// mainProcessApi.someFunction(someArg).then()...
// This is is using `electron-call` to produce type-safe wrappers that hide the IPC stuff.
import call from "electron-call";

// notice, we're importing type info only. The code won't be loaded in the render process, won't be available in browser debugger
import type { MainProcessApi } from "./MainProcessApi";

let mainProcessApi: MainProcessApi;

// This shouldn't be needed, since there is a mock in __mocks__. But that isn't working at the moment.
if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
  import("./__mocks__/MainProcessApiAccess").then((m) => {
    // NB: don't try to use await here, it is currently breaking vite build
    mainProcessApi = (m as unknown) as any;
  });
} else {
  mainProcessApi = call.use<MainProcessApi>("MainProcessApi");
}

export { mainProcessApi };
