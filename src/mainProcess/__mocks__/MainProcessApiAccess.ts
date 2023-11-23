import { XMLValidationResult } from "xmllint-wasm";

export class MainProcessApi {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public trashItem(path: string): Promise<boolean> {
    // just always return true
    return Promise.resolve(true);
  }

  // We're doing this in the main process because I didn't get xmllint-wasm to work in the render process.
  // It has a browser build, but I couldn't get it loaded in vite. Could try again later.
  public async validateImdiAsync(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    imdiContents: string
  ): Promise<XMLValidationResult> {
    const r: XMLValidationResult = {
      valid: true,
      normalized: "",
      rawOutput: "",
      errors: [
        {
          loc: null,
          message: "",
          rawMessage: ""
        }
      ]
    };
    return r;
  }
}
