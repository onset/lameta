import { describe, it, expect } from "vite-plus/test";
import * as temp from "temp";
import * as Path from "path";
import * as fs from "fs";
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

  it("stamps the files in the zip with local time", async () => {
    // in UTC, local and UTC times are the same, so the test needs a zone that differs
    const originalTimeZone = process.env.TZ;
    process.env.TZ = "America/Denver";
    try {
      expect(new Date().getTimezoneOffset()).not.toBe(0);
      await expectZipStampedWithLocalTime();
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimeZone;
    }
  });
});

async function expectZipStampedWithLocalTime() {
  const dir = temp.mkdirSync("asyncMakeZipFile");
  const zipPath = Path.join(dir, "out.zip");
  const before = Date.now();
  await asyncMakeZipFile(zipPath, (archive) => {
    archive.append("a", { name: "a.csv" });
  });
  // the zip starts with the first file's local header, which holds its MS-DOS time and date
  const header = fs.readFileSync(zipPath);
  const time = header.readUInt16LE(10);
  const date = header.readUInt16LE(12);
  const stamped = new Date(
    (date >> 9) + 1980,
    ((date >> 5) & 0xf) - 1,
    date & 0x1f,
    time >> 11,
    (time >> 5) & 0x3f,
    (time & 0x1f) * 2,
  );
  // MS-DOS times have a resolution of two seconds
  expect(Math.abs(stamped.getTime() - before)).toBeLessThan(10 * 1000);
}
