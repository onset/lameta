import call from "electron-call";
import * as fs from "fs-extra";
import { shell } from "electron";
import { XMLValidationResult, validateXML } from "xmllint-wasm";
import { locateDependency } from "../other/locateDependency";
import { app } from "electron/main";

if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
  throw new Error(
    "MainProcessApiAccess should not be imported in unit tests. Mocking should have prevented this."
  );
}

// Put things here that y[ou want to run on the main process. You can then access them with:
// This is is using `electron-call` to produce type-safe wrappers that hide the IPC stuff.
// See MainProcessApiAccess for instructions on using this from the Render process.
export class MainProcessApi {
  // electron's trashItem not working in render process, so we provide this here
  // see https://github.com/electron/electron/issues/29598
  public trashItem(path: string): Promise<boolean> {
    return shell.trashItem(path).then(
      () => !fs.existsSync(path), // returned true but let's double-check
      () => false // reject
    );
  }

  // We're doing this in the main process because I didn't get xmllint-wasm to work in the render process.
  // It has a browser build, but I couldn't get it loaded in vite. Could try again later.
  public async validateImdiAsync(
    imdiContents: string
  ): Promise<XMLValidationResult> {
    const imdiSchemaPath = locateDependency(
      "assets/IMDI_3.0.xsd",
      app.getAppPath()
    );
    const imdiSchemaContents = fs.readFileSync(imdiSchemaPath, "utf8");
    const schemas = [imdiSchemaContents];

    if (imdiContents.indexOf("OPEXMetadata") > -1) {
      const opexSchemaPath = locateDependency(
        "assets/OPEX-Metadata.xsd",
        app.getAppPath()
      );
      const opexSchemaContents = fs.readFileSync(opexSchemaPath, "utf8");
      schemas.push(opexSchemaContents);
    }
    try {
      const validationResult = await validateXML({
        xml: [
          {
            fileName: "imdi",
            contents: imdiContents
          }
        ],
        schema: schemas
      });
      return validationResult;
    } catch (e) {
      const r: XMLValidationResult = {
        valid: false,
        normalized: e.message,
        rawOutput: e.message,
        errors: [
          {
            loc: null,
            message: e.message,
            rawMessage: e.message
          }
        ]
      };
      return r;
    }
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
