import { makeLametaSourceReader } from "../export/lametaSourceComment";
import { IRulesSandboxInput, rulesSandboxMain } from "./rulesSandboxMain";

// The JavaScript that the rules sandbox evaluates: rulesSandboxMain and the
// lameta-source reader, as source text, called with this input. Its value is a
// Promise of IRulesSandboxOutput, which is plain data.
export function makeRulesSandboxScript(input: IRulesSandboxInput): string {
  return `(${rulesSandboxMain.toString()})(${JSON.stringify(
    input,
  )}, ${makeLametaSourceReader.toString()})`;
}
