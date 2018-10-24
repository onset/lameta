import * as xmlbuilder from "xmlbuilder";
import { FieldSet } from "../field/FieldSet";
import { Field, FieldType, FieldDefinition } from "../field/Field";
import { Contribution } from "./File";
import assert from "assert";

// This supplies the xml that gets saved in the .sprj, .session, and .person files
export default function getSayMoreXml(
  xmlRootName: string,
  properties: FieldSet,
  contributions: Contribution[],
  doOutputTypeInXmlTags: boolean,
  doOutputEmptyCustomFields: boolean // used for watching empty custom fields
): string {
  const root = xmlbuilder.create(xmlRootName, {
    version: "1.0",
    encoding: "utf-8"
  });

  const fields = properties.values().filter(field => field.persist);
  writeNormalFields(root, fields, doOutputTypeInXmlTags);
  writeContributions(root, contributions);
  writeFieldGroup(
    root,
    fields.filter(f => f.definition && f.definition.isAdditional),
    "AdditionalFields",
    false // only custom fields might need special treatment
  );
  writeFieldGroup(
    root,
    fields.filter(f => f.definition && f.definition.isCustom),
    "CustomFields",
    doOutputEmptyCustomFields
  );

  return root.end({ pretty: true, indent: "  " });
}

function writeNormalFields(
  root: xmlbuilder.XMLElementOrXMLNode,
  allFields: Field[],
  doOutputTypeInXmlTags: boolean
) {
  allFields
    .filter(field => !field.definition || !field.definition.isCustom)
    .filter(field => field.type !== FieldType.Contributions)
    .forEach(field => {
      writeField(root, field, doOutputTypeInXmlTags);
    });
}

// "Additional Fields are labeled "More Fields" in the UI.
// JH: I don't see a reason to wrap them up under a parent, but remember we're conforming to the inherited format at this point.
function writeFieldGroup(
  root: xmlbuilder.XMLElementOrXMLNode,
  fields: Field[],
  groupTag: string,
  doOutputEmptyFields: boolean // used for watching empty custom fields
) {
  const groupParent = root.element(groupTag, {
    type: "xml"
  });

  let didWriteAtLeastOne = false;
  fields.forEach((f: Field) => {
    const v = f.typeAndValueEscapedForXml().value;
    if (doOutputEmptyFields || (v && v.length > 0 && v !== "unspecified")) {
      writeField(
        groupParent,
        f,
        true /* we only have these additional fields for sessions & people, which have type on the xml tag*/,
        doOutputEmptyFields
      );
      didWriteAtLeastOne = true;
    }
  });
  if (didWriteAtLeastOne) {
    groupParent.up();
  } else {
    groupParent.up();
    groupParent.remove();
  }
}

// function writeCustomFields(
//   root: xmlbuilder.XMLElementOrXMLNode,
//   allFields: Field[]
// ) {
//   const customParent = root.element("CustomFields", {
//     type: "xml"
//   });

//   allFields.forEach((f: Field) => {
//     if (f.definition && f.definition.isCustom) {
//       //const t = f.typeAndValueForXml();
//       const { type, value } = f.typeAndValueEscapedForXml();
//       if (f.key && f.key.length > 0 && value && value.length > 0) {
//         customParent.element(f.key, { type }, value).up();
//       }
//     }
//   });

//   customParent.up();
// }
function writeContributions(
  root: xmlbuilder.XMLElementOrXMLNode,
  contributions: Contribution[]
) {
  const contributionsElement = root.element("contributions", {
    type: "xml"
  });
  contributions.forEach(contribution => {
    if (contribution.name && contribution.name.trim().length > 0) {
      let tail = contributionsElement.element("contributor");
      if (contribution.name) {
        tail = tail.element("name", contribution.name).up();
      }
      if (contribution.role) {
        tail = tail.element("role", contribution.role).up();
      }
      writeDate(tail, "date", contribution.date);
      if (contribution.comments && contribution.comments.trim().length > 0) {
        tail = tail.element("comments", contribution.comments).up();
      }
    }
  });
}

function writeField(
  root: xmlbuilder.XMLElementOrXMLNode,
  field: Field,
  doOutputTypeInXmlTags: boolean,
  doOutputEmptyFields: boolean = false
) {
  const { type, value } = field.typeAndValueEscapedForXml();

  // SayMore Windows, at least through version 3.3, has inconsistent capitalization...
  // for now we just use those same tags when writing so that the file can be opened in that SM
  const tag =
    field.definition && field.definition.tagInSayMoreClassic
      ? field.definition.tagInSayMoreClassic
      : field.key;

  if (type === "date") {
    // console.log(
    //   "date " + f.key + " is a " + type + " of value " + value
    // );
    writeDate(root, tag, value);
  } else {
    assert.ok(
      field.key.indexOf("date") === -1 || type === "date",
      "SHOULDN'T " + field.key + " BE A DATE?"
    );
    if (doOutputEmptyFields || value.trim().length > 0) {
      // For some reason SayMore Windows 3 had a @type attribute on sessions and people, but not project
      if (doOutputTypeInXmlTags) {
        root.element(tag, { type }, value.trim()).up();
      } else {
        root.element(tag, value.trim()).up();
      }
    }
  }
}

function writeDate(
  builder: xmlbuilder.XMLElementOrXMLNode,
  tag: string,
  dateString: string
): xmlbuilder.XMLElementOrXMLNode {
  if (dateString) {
    // if (moment(dateString).isValid()) {
    //   const d = moment(dateString);
    //   return builder
    //     .element(
    //       key,
    //       // As of SayMore Windows 3.1.4, it can't handle a type "date"; it can only read and write a "string",
    //       // so instead of the more reasonable { type: "date" }, we are using this
    //       { type: "string" },
    //       d.format(ISO_YEAR_MONTH_DATE_DASHES_FORMAT)
    //     )
    //     .up();
    return builder.element(tag, dateString).up();
  }

  return builder; // we didn't write anything
}
