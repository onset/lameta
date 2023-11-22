import call from "electron-call";
import * as fs from "fs-extra";
import { shell, app } from "electron";
import { XMLValidationResult, validateXML } from "xmllint-wasm";
import { locateWithApp } from "../other/locateWithApp";

const appPath = app.getAppPath();

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
    fs.writeFileSync("mpa-log.txt", "enter");
    const imdiSchemaPath = locateWithApp(
      app.getAppPath(),
      "assets/IMDI_3.0.xsd"
    );
    // append to mpa-log.txt
    fs.appendFileSync("mpa-log.txt", `imdiSchemaPath:${imdiSchemaPath}`);

    const imdiSchemaContents = fs.readFileSync(imdiSchemaPath, "utf8");
    const schemas = [imdiSchemaContents];

    if (imdiContents.indexOf("OPEXMetadata") > -1) {
      const opexSchemaPath = locateWithApp(
        app.getAppPath(),
        "assets/OPEX-Metadata.xsd"
      );
      const opexSchemaContents = fs.readFileSync(opexSchemaPath, "utf8");
      schemas.push(opexSchemaContents);
    }
    try {
      fs.appendFileSync("mpa-log.txt", `calling validator`);
      const validationResult = await validateXML({
        xml: [
          {
            fileName: "imdi",
            contents: imdiContents
          }
        ],
        schema: schemas
      });
      fs.appendFileSync("mpa-log.txt", `finished validator`);
      return validationResult;
    } catch (e) {
      fs.appendFileSync("mpa-log.txt", `caught error`);
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

  public test(): Promise<string> {
    return Promise.resolve("hello from main");
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
