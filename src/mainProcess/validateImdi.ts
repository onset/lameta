import { XMLValidationResult, validateXML } from "xmllint-wasm";
import * as fs from "fs-extra";
import path from "path";

// We're doing this in the main process because I didn't get xmllint-wasm to work in the render process.
// It has a browser build, but I couldn't get it loaded in vite. Could try again later.
export async function validateImdiAsyncInternal(
  appPath: string,
  fileContents: string,
  imdiSchemaName?: string // Optional schema name, defaults to "IMDI_3.0.xsd"
): Promise<XMLValidationResult> {
  const schemaFileName = imdiSchemaName || "IMDI_3.0.xsd";
  const imdiSchemaPath = path.join(appPath, `schemas/${schemaFileName}`);

  const imdiSchemaContents = fs.readFileSync(imdiSchemaPath, "utf8");

  // I was not able to get xmllint-wasm (or raw xmllint) to validate the imdi inside when wrapped in opex.
  // I tried providing multiple schemas, I tried creating a new schema that included both.
  // It would just always validate. So we extract the imdi and validate it separately.
  const imdiStart = fileContents.indexOf("<METATRANSCRIPT");
  const imdiEnd = fileContents.indexOf("</METATRANSCRIPT>");
  const imdiContents = fileContents.substring(imdiStart, imdiEnd + 17);

  let result = await validateAgainstOneSchema(imdiContents, imdiSchemaContents);

  if (imdiContents.indexOf("OPEXMetadata") > -1) {
    const opexSchemaPath = path.join(appPath, "schemas/OPEX-Metadata.xsd");
    const opexSchemaContents = fs.readFileSync(opexSchemaPath, "utf8");
    const opexResult = await validateAgainstOneSchema(
      fileContents,
      opexSchemaContents
    );

    // combine the results
    result = {
      valid: result.valid && opexResult.valid,
      normalized: result.normalized + opexResult.normalized,
      rawOutput: result.rawOutput + opexResult.rawOutput,
      errors: result.errors.concat(opexResult.errors)
    };
  }

  return result;
}

async function validateAgainstOneSchema(
  xml: string,
  schema: string
): Promise<XMLValidationResult> {
  try {
    const validationResult = await validateXML({
      xml: [
        {
          fileName: "imdi",
          contents: xml
        }
      ],
      schema: [schema]
    });
    // console.log(
    //   `----validateImdiAsync no errors:\n\n${imdiContents}\n\n${JSON.stringify(
    //     validationResult,
    //     null,
    //     2
    //   )}`
    // );
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
    // console.log(
    //   `*************validateImdiAsync Error:${JSON.stringify(r, null, 2)}`
    // );
    return r;
  }
}
