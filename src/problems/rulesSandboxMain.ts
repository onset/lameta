import { NavigationTarget } from "../navigation/NavigationTarget";
import type { makeLametaSourceReader as MakeLametaSourceReader } from "../export/lametaSourceComment";
import type { ProblemSeverity } from "./rulesFile";

// What lameta gives the rules sandbox
export interface IRulesSandboxInput {
  rulesSource: string;
  sessions: Array<{ sessionId: string; xml: string }>;
  corpusXml?: string;
  // the tags of the project's metadata languages, such as ["en", "es"]
  metadataLanguages: string[];
  // stop collecting problems after this many, so a runaway check can't flood lameta
  maxProblems: number;
}

export interface IRulesSandboxOutput {
  problems: IRulesFileProblem[];
  errors: IRulesFileError[];
  milliseconds: number;
}

export interface IRulesFileProblem {
  checkId: string;
  severity: ProblemSeverity;
  // shown in bold before the message, e.g. "MP3"
  subject?: string;
  message: string;
  // shown on a line of its own after the message
  reason?: string;
  // undefined when the node maps to no place in lameta
  target?: NavigationTarget;
  // which function reported it, and for checkSession, which session's Document
  from: "checkSession" | "checkCorpus" | "checkAcrossSessions";
  sessionId?: string;
  // a few lines of XML around the node, with the node's own lines marked
  excerpt?: Array<{ text: string; marked: boolean }>;
}

export interface IRulesFileError {
  kind: "load" | "declaration" | "xml" | "check" | "timeout" | "limit";
  message: string;
  // the function that threw, e.g. "checkSession"
  check?: string;
  sessionId?: string;
}

// Runs a rules file over IMDI documents and returns plain data.
// It runs inside the rules sandbox, a separate hidden page (see
// mainProcess/rulesSandbox.ts), so it must not refer to anything outside its own body
// and its parameters. `makeReader` is lametaSourceComment's makeLametaSourceReader,
// passed in as source text. `loadModule` loads the rules file's source as an ES module.
export async function rulesSandboxMain(
  input: IRulesSandboxInput,
  makeReader: typeof MakeLametaSourceReader,
  loadModule?: (source: string) => Promise<any>,
): Promise<IRulesSandboxOutput> {
  const start = performance.now();
  const { findLametaSource } = makeReader();
  const problems: IRulesFileProblem[] = [];
  const errors: IRulesFileError[] = [];
  const done = () => ({
    problems,
    errors,
    milliseconds: performance.now() - start,
  });
  const messageOf = (e: any) => (e && e.message ? String(e.message) : String(e));

  const load =
    loadModule ??
    ((source: string) =>
      // written this way so that no bundler rewrites the import()
      new Function("url", "return import(url)")(
        "data:text/javascript;charset=utf-8," + encodeURIComponent(source),
      ));
  let rules: any;
  try {
    rules = await load(input.rulesSource);
  } catch (e) {
    errors.push({
      kind: "load",
      message: "The rules file could not be loaded: " + messageOf(e),
    });
    return done();
  }
  if (rules.interfaceVersion === undefined) {
    errors.push({
      kind: "declaration",
      message: "The rules file does not export interfaceVersion.",
    });
  } else if (rules.interfaceVersion !== 1) {
    errors.push({
      kind: "declaration",
      message: `The rules file is for interfaceVersion ${rules.interfaceVersion}; this lameta supports interfaceVersion 1.`,
    });
  }
  if (rules.format === undefined) {
    errors.push({
      kind: "declaration",
      message: 'The rules file does not export format (e.g. "imdi").',
    });
  } else if (rules.format !== "imdi") {
    errors.push({
      kind: "declaration",
      message: `The rules file checks the format "${rules.format}"; lameta can only check "imdi" so far.`,
    });
  }
  if (errors.length > 0) return done();

  const parse = (xml: string, sessionId?: string): Document | undefined => {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      errors.push({
        kind: "xml",
        message: "lameta generated IMDI that could not be parsed.",
        sessionId,
      });
      return undefined;
    }
    return doc;
  };
  const sessionDocs: Array<{ sessionId: string; doc: Document }> = [];
  for (const s of input.sessions) {
    const doc = parse(s.xml, s.sessionId);
    if (doc) sessionDocs.push({ sessionId: s.sessionId, doc });
  }

  const elementOf = (node: Node): Element | undefined => {
    const n =
      node.nodeType === 2
        ? (node as Attr).ownerElement
        : node.nodeType === 1
          ? node
          : node.parentNode;
    return n && n.nodeType === 1 ? (n as Element) : undefined;
  };
  const excerptOf = (node: Node) => {
    const element = elementOf(node);
    if (!element) return undefined;
    const serializer = new XMLSerializer();
    const clean = (s: string) =>
      s.replace(/ xmlns(:[\w-]+)?="[^"]*"/g, "").replace(/<!--\s*lameta-source[\s\S]*?-->\s*/g, "");
    const firstLine = (e: Element) => {
      const line = clean(serializer.serializeToString(e)).split("\n")[0];
      return line.length > 100 ? line.substring(0, 99) + "…" : line;
    };
    const elementSibling = (e: Element, forward: boolean) => {
      let n = forward ? e.nextSibling : e.previousSibling;
      while (n && n.nodeType !== 1) n = forward ? n.nextSibling : n.previousSibling;
      return n as Element | null;
    };
    const lines: Array<{ text: string; marked: boolean }> = [];
    const parent = element.parentNode;
    if (parent && parent.nodeType === 1)
      lines.push({ text: `<${parent.nodeName}>`, marked: false });
    const before = elementSibling(element, false);
    if (before) lines.push({ text: "  " + firstLine(before), marked: false });
    let own = clean(serializer.serializeToString(element)).split("\n");
    // the first line has no indentation of its own; line the rest up under it
    const rest = own.slice(1).filter((l) => l.trim() !== "");
    const indent = Math.min(...rest.map((l) => l.length - l.trimStart().length), 1000);
    own = [own[0], ...rest.map((l) => "  " + l.substring(indent))];
    if (own.length > 12) own = [...own.slice(0, 11), "  …"];
    for (const l of own) lines.push({ text: "  " + l, marked: true });
    const after = elementSibling(element, true);
    if (after) lines.push({ text: "  " + firstLine(after), marked: false });
    if (parent && parent.nodeType === 1)
      lines.push({ text: `</${parent.nodeName}>`, marked: false });
    return lines;
  };

  // optional text that a problem may have; an empty one counts as none
  const optionalText = (value: any) =>
    value === undefined || value === null || String(value) === "" ? undefined : String(value);
  let limitReached = false;
  const reporter = (from: IRulesFileProblem["from"], sessionIdOfDoc?: string) => (p: any) => {
    if (problems.length >= input.maxProblems) {
      if (!limitReached) {
        limitReached = true;
        errors.push({
          kind: "limit",
          message: `The rules file reported more than ${input.maxProblems} problems; lameta shows only the first ${input.maxProblems}.`,
        });
      }
      return;
    }
    const node: Node | undefined =
      p && p.node && typeof p.node.nodeType === "number" ? p.node : undefined;
    // checkAcrossSessions gets every Document; find which session this node is in
    const sessionId =
      sessionIdOfDoc ??
      (node
        ? sessionDocs.find((s) => s.doc === (node.ownerDocument ?? (node as any)))?.sessionId
        : undefined);
    const severity = p && ["error", "warning"].includes(p.severity) ? p.severity : "warning";
    problems.push({
      checkId: p && p.id ? String(p.id) : "(no id)",
      severity,
      subject: p ? optionalText(p.subject) : undefined,
      message: p && p.message !== undefined ? String(p.message) : "",
      reason: p ? optionalText(p.reason) : undefined,
      target: node ? findLametaSource(node) : undefined,
      from,
      sessionId,
      excerpt: node ? excerptOf(node) : undefined,
    });
  };
  const call = (
    check: "checkSession" | "checkCorpus" | "checkAcrossSessions",
    run: () => void,
    sessionId?: string,
  ) => {
    try {
      run();
    } catch (e) {
      errors.push({ kind: "check", check, sessionId, message: messageOf(e) });
    }
  };

  // what the IMDI does not say about the project; see rulesFile.ts
  const project = { metadataLanguages: [...input.metadataLanguages] };

  if (typeof rules.checkSession === "function") {
    for (const s of sessionDocs) {
      call(
        "checkSession",
        () => rules.checkSession(s.doc, reporter("checkSession", s.sessionId), project),
        s.sessionId,
      );
    }
  }
  if (typeof rules.checkCorpus === "function" && input.corpusXml) {
    const corpus = parse(input.corpusXml);
    if (corpus)
      call("checkCorpus", () => rules.checkCorpus(corpus, reporter("checkCorpus"), project));
  }
  if (typeof rules.checkAcrossSessions === "function") {
    call("checkAcrossSessions", () =>
      rules.checkAcrossSessions(
        sessionDocs.map((s) => s.doc),
        reporter("checkAcrossSessions"),
        project,
      ),
    );
  }
  return done();
}
