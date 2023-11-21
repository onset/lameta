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

  public async validateImdi(
    imdiContents: string
  ): Promise<XMLValidationResult> {
    const schemaPath = locateWithApp(app.getAppPath(), "assets/IMDI_3.0.xsd");
    const [imdiSchemaContents] = await Promise.all([
      fs.promises.readFile(schemaPath, "utf8") // todo: path
    ]);

    const validationResult = await validateXML({
      xml: [
        {
          fileName: "imdi",
          contents: imdiContents
        }
      ],
      schema: [imdiSchemaContents]
    });

    return validationResult;
  }

  public test(): Promise<string> {
    return Promise.resolve("hello from main");
  }
}

const mainProcessInstance = new MainProcessApi();
call.provide("MainProcessApi", mainProcessInstance);
