// Debug script to test isRawAccessValue
import { RoCrateLicense } from "./src/export/ROCrate/RoCrateLicense";

const rocrateLicense = new RoCrateLicense() as any;

const testValues = [
  "Strategic partners",
  "LINGUISTIC STUDY ONLY - not for community distribution",
  "Public",
  "#license-reap-public",
  "https://example.com/license"
];

testValues.forEach((value) => {
  const isRaw = rocrateLicense.isRawAccessValue(value);
  console.log(`"${value}" -> isRawAccessValue: ${isRaw}`);
});
