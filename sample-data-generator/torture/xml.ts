// Small XML writer for the files lameta and SayMore put in a project. It writes exactly
// what it is given, so a case can reproduce the quirks of a particular writer: a BOM,
// tab indents, CRLF, `type` attributes or none, an element in the wrong case.

export interface XmlNode {
  tag: string;
  attrs?: Record<string, string>;
  text?: string;
  children?: XmlNode[];
  // written as-is, for content that must not be escaped (entities, broken markup)
  raw?: string;
  comment?: string;
}

export interface XmlStyle {
  bom?: boolean;
  indent?: string;
  eol?: "\n" | "\r\n";
  // SayMore and old lameta wrote `<?xml version="1.0" encoding="utf-8" ?>`
  declaration?: string;
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function attrString(attrs: Record<string, string> | undefined): string {
  if (!attrs) return "";
  return Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeXml(v)}"`)
    .join("");
}

function writeNode(node: XmlNode, depth: number, style: Required<XmlStyle>): string {
  const pad = style.indent.repeat(depth);
  if (node.comment !== undefined) return `${pad}<!-- ${node.comment} -->`;
  const open = `<${node.tag}${attrString(node.attrs)}>`;
  const close = `</${node.tag}>`;
  if (node.raw !== undefined) return `${pad}${open}${node.raw}${close}`;
  if (node.children && node.children.length > 0) {
    const inner = node.children.map((c) => writeNode(c, depth + 1, style)).join(style.eol);
    return `${pad}${open}${style.eol}${inner}${style.eol}${pad}${close}`;
  }
  // lameta never writes self-closing tags, because SayMore Classic chokes on some of them
  return `${pad}${open}${escapeXml(node.text ?? "")}${close}`;
}

export function xmlDocument(root: XmlNode, style: XmlStyle = {}): string {
  const s: Required<XmlStyle> = {
    bom: style.bom ?? false,
    indent: style.indent ?? "  ",
    eol: style.eol ?? "\n",
    declaration: style.declaration ?? `<?xml version="1.0" encoding="utf-8"?>`,
  };
  return (s.bom ? "﻿" : "") + s.declaration + s.eol + writeNode(root, 0, s);
}

export interface Contribution {
  name: string;
  // undefined leaves out the <role> element altogether
  role?: string;
  smxrole?: string;
  date?: string;
  comments?: string;
}

// a field as lameta writes it: <tag type="string">value</tag>; dates have no type
export function field(tag: string, value: string, attrs?: Record<string, string>): XmlNode {
  return { tag, attrs: attrs ?? { type: "string" }, text: value };
}
export function dateField(tag: string, value: string): XmlNode {
  return { tag, attrs: {}, text: value };
}

// <Contributions> the way the current lameta writes it
export function lametaContributions(contributions: Contribution[]): XmlNode {
  return {
    tag: "Contributions",
    children: contributions.map((c) => ({
      tag: "contributor",
      children: [
        { tag: "name", text: c.name },
        ...(c.role === undefined ? [] : [{ tag: "role", text: c.role }]),
        ...(c.smxrole === undefined ? [] : [{ tag: "smxrole", text: c.smxrole }]),
        { tag: "date", text: c.date ?? "0001-01-01" },
        ...(c.comments ? [{ tag: "comments", text: c.comments }] : []),
      ],
    })),
  };
}

// <contributions type="xml"> the way SayMore Classic writes it
export function sayMoreContributions(contributions: Contribution[]): XmlNode {
  return {
    tag: "contributions",
    attrs: { type: "xml" },
    children: contributions.map((c) => ({
      tag: "contributor",
      children: [
        { tag: "name", text: c.name },
        ...(c.role === undefined ? [] : [{ tag: "role", text: c.role }]),
        { tag: "date", text: c.date ?? "0001-01-01" },
        { tag: "notes", raw: "\n      " },
      ],
    })),
  };
}

export function customFields(fields: Record<string, string>): XmlNode {
  return {
    tag: "CustomFields",
    attrs: { type: "xml" },
    children: Object.entries(fields).map(([k, v]) => field(k, v)),
  };
}

export function additionalFields(fields: Record<string, string>): XmlNode {
  return {
    tag: "AdditionalFields",
    attrs: { type: "xml" },
    children: Object.entries(fields).map(([k, v]) => field(k, v)),
  };
}

export interface SessionSpec {
  // lameta writes notes first, so a parse error later in the file overwrites them
  notes?: string;
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  genre?: string;
  subgenre?: string;
  access?: string;
  accessDescription?: string;
  status?: string;
  languages?: string;
  workingLanguages?: string;
  location?: string;
  keyword?: string;
  topic?: string;
  participants?: string;
  contributions?: Contribution[];
  additional?: Record<string, string>;
  custom?: Record<string, string>;
  // any other top-level elements, written after the known ones
  extra?: XmlNode[];
}

const sessionFieldOrder: Array<keyof SessionSpec> = [
  "notes",
  "id",
  "title",
  "description",
  "languages",
  "workingLanguages",
  "genre",
  "subgenre",
  "location",
  "access",
  "accessDescription",
  "status",
  "keyword",
  "topic",
];

// A .session in the format the current lameta writes
export function lametaSession(spec: SessionSpec): string {
  const children: XmlNode[] = [];
  for (const key of sessionFieldOrder) {
    const v = spec[key];
    if (typeof v === "string") children.push(field(key === "subgenre" ? "subgenre" : key, v));
  }
  if (spec.date !== undefined) children.push(dateField("date", spec.date));
  if (spec.participants !== undefined)
    children.push({ tag: "participants", text: spec.participants });
  children.push(...(spec.extra ?? []));
  children.push(lametaContributions(spec.contributions ?? []));
  if (spec.additional) children.push(additionalFields(spec.additional));
  if (spec.custom) children.push(customFields(spec.custom));
  return xmlDocument({
    tag: "Session",
    attrs: { minimum_lameta_version_to_read: "0.0.0" },
    children,
  });
}

// A .session in the format SayMore Classic 3.x writes: BOM, type on every field
// including the date, <contributions type="xml">, custom fields that SayMore did not
// know about moved into <CustomFields>
export function sayMoreSession(spec: SessionSpec, rootAttrs: Record<string, string> = {}): string {
  const children: XmlNode[] = [];
  for (const key of sessionFieldOrder) {
    const v = spec[key];
    if (typeof v === "string") children.push(field(key, v));
  }
  if (spec.date !== undefined) children.push(field("date", spec.date));
  if (spec.participants !== undefined) children.push(field("participants", spec.participants));
  children.push(...(spec.extra ?? []));
  children.push(sayMoreContributions(spec.contributions ?? []));
  if (spec.custom) children.push(customFields(spec.custom));
  return xmlDocument({ tag: "Session", attrs: rootAttrs, children }, { bom: true });
}

export interface PersonLanguage {
  tag: string;
  primary?: boolean;
  mother?: boolean;
  father?: boolean;
}

export interface PersonSpec {
  notes?: string;
  name?: string;
  nickname?: string;
  code?: string;
  birthYear?: string;
  gender?: string;
  education?: string;
  primaryOccupation?: string;
  ethnicGroup?: string;
  howToContact?: string;
  description?: string;
  privacyProtection?: string;
  languages?: PersonLanguage[];
  custom?: Record<string, string>;
  extra?: XmlNode[];
}

const personFieldOrder: Array<keyof PersonSpec> = [
  "notes",
  "name",
  "nickname",
  "code",
  "birthYear",
  "gender",
  "education",
  "primaryOccupation",
  "ethnicGroup",
  "howToContact",
  "description",
  "privacyProtection",
];

export function lametaPerson(spec: PersonSpec): string {
  const children: XmlNode[] = [];
  for (const key of personFieldOrder) {
    const v = spec[key];
    if (typeof v === "string") children.push(field(key, v));
  }
  if (spec.languages) {
    children.push({
      tag: "languages",
      attrs: { type: "xml" },
      children: spec.languages.map((l) => ({
        tag: "language",
        attrs: {
          tag: l.tag,
          primary: String(!!l.primary),
          mother: String(!!l.mother),
          father: String(!!l.father),
        },
        text: "",
      })),
    });
  }
  children.push(...(spec.extra ?? []));
  children.push({ tag: "contributions", attrs: { type: "xml" }, text: "" });
  if (spec.custom) children.push(customFields(spec.custom));
  return xmlDocument({
    tag: "Person",
    attrs: { minimum_lameta_version_to_read: "0.0.0" },
    children,
  });
}

// A .meta sidecar. lameta writes <MetaData>; old lameta and SayMore wrote <Meta>.
export function metaFile(
  fields: Record<string, string>,
  opts: { root?: string; contributions?: Contribution[]; custom?: Record<string, string> } = {},
): string {
  const children: XmlNode[] = Object.entries(fields).map(([k, v]) => field(k, v));
  if (opts.contributions) children.push(sayMoreContributions(opts.contributions));
  if (opts.custom) children.push(customFields(opts.custom));
  return xmlDocument({ tag: opts.root ?? "MetaData", children });
}
