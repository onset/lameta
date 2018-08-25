import * as xmlbuilder from "xmlbuilder";
import { FieldSet } from "../field/FieldSet";
import { Field, FieldType, FieldDefinition } from "../field/Field";
import { Contribution } from "./File";
import assert from "assert";

// public so that unit tests can get it without going through files
export default function getSayMoreXml(
  xmlRootName: string,
  properties: FieldSet,
  contributions: Contribution[],
  doOutputTypeInXmlTags: boolean
): string {
  const root = xmlbuilder.create(xmlRootName, {
    version: "1.0",
    encoding: "utf-8"
  });
  properties.forEach((k, f: Field) => {
    // SayMore Windows, at least through version 3.3, has inconsistent capitalization...
    // for now we just use those same tags when writing so that the file can be opened in that SM
    const tag =
      f.definition && f.definition.tagInSayMoreClassic
        ? f.definition.tagInSayMoreClassic
        : k;

    if (f.persist) {
      if (f.key === "contributions") {
        const contributionsElement = root.element("contributions", {
          type: "xml"
        });
        contributions.forEach(contribution => {
          if (contribution.name && contribution.name.trim().length > 0) {
            let tail = contributionsElement.element("contributor");
            if (contribution.name) {
              //console.log("zzzzz:" + contribution.name);
              tail = tail.element("name", contribution.name).up();
            }
            if (contribution.role) {
              tail = tail.element("role", contribution.role).up();
            }
            writeDate(tail, "date", contribution.date);
            if (
              contribution.comments &&
              contribution.comments.trim().length > 0
            ) {
              tail = tail.element("comments", contribution.comments).up();
            }
          }
        });
      } else {
        if (!f.definition || !f.definition.isCustom) {
          const t = f.typeAndValueForXml();
          const type = t[0];
          const value = t[1];

          if (type === "date") {
            // console.log(
            //   "date " + f.key + " is a " + type + " of value " + value
            // );
            writeDate(root, tag, value);
          } else {
            assert.ok(
              k.indexOf("date") === -1 || type === "date",
              "SHOULDN'T " + k + " BE A DATE?"
            );
            if (value.length > 0) {
              // For some reason SayMore Windows 3 had a @type attribute on sessions and people, but not project
              if (doOutputTypeInXmlTags) {
                root.element(tag, { type }, value).up();
              } else {
                root.element(tag, value).up();
              }
            }
          }
        }
      }
    }
  });
  const customParent = root.element("CustomFields", {
    type: "xml"
  });
  properties.forEach((k, f: Field) => {
    if (f.definition && f.definition.isCustom) {
      const t = f.typeAndValueForXml();
      if (k && k.length > 0 && t[1] && t[1].length > 0) {
        customParent.element(k, { type: t[0] }, t[1]).up();
      }
    }
  });
  customParent.up();

  return root.end({ pretty: true, indent: "  " });
}

function writeDate(
  builder: xmlbuilder.XMLElementOrXMLNode,
  tag: string,
  dateString: string
): xmlbuilder.XMLElementOrXMLNode {
  const ISO_YEAR_MONTH_DATE_DASHES_FORMAT = "YYYY-MM-DD";
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
