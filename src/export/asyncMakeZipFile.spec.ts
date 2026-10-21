import { describe, it, expect } from "vite-plus/test";
import * as temp from "temp";
import * as Path from "path";
import { asyncMakeZipFile } from "./CsvExporter";

temp.track();

describe("asyncMakeZipFile", () => {
  it("rejects when finalize rejects without an error event", async () => {
    const dir = temp.mkdirSync("asyncMakeZipFile");
    const failure = new Error("finalize failed");
    const result = asyncMakeZipFile(Path.join(dir, "out.zip"), (archive) => {
      archive.finalize = () => Promise.reject(failure);
    });
    await expect(result).rejects.toBe(failure);
  });
});
