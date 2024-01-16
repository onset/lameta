import * as XmlBuilder from "xmlbuilder";
import { Field } from "../model/field/Field";

// public for testing
export function fieldElement(
  elementName: string,
  fieldOrString: string | Field | undefined,
  tail: XmlBuilder.XMLElementOrXMLNode,
  mostRecentElement?: XmlBuilder.XMLElementOrXMLNode,
  xmlElementIsRequired?: boolean,
  defaultValue?: string
): {
  tail: XmlBuilder.XMLElementOrXMLNode;
  mostRecentElement: XmlBuilder.XMLElementOrXMLNode;
} {
  // TODO at this point, handle multilingual
  let text = defaultValue;
  if (
    fieldOrString &&
    typeof fieldOrString === "string" &&
    fieldOrString.length > 0
  ) {
    text = fieldOrString;
    // if value is a field, and it has text, use that
  } else if (
    fieldOrString &&
    fieldOrString instanceof Field &&
    fieldOrString.text &&
    fieldOrString.text.length > 0
  ) {
    text = fieldOrString.text;
  } // just return the tail, and the most recent element
  else {
    // are we required to output something?
    if (xmlElementIsRequired) {
      // yes, so we need to output something, but we don't have anything.
      // so we'll output the default value
      text = defaultValue;
    } else {
      return { tail, mostRecentElement: mostRecentElement || tail };
    }
  }

  tail = tail.element(elementName, text);

  if (fieldOrString instanceof Field && fieldOrString.definition?.imdiRange) {
    tail.attribute("Link", fieldOrString.definition.imdiRange);
    const type = fieldOrString.definition.imdiIsClosedVocabulary
      ? "ClosedVocabulary"
      : "OpenVocabulary";
    tail.attribute("Type", type);
  }
  //this.mostRecentElement = tail;
  tail = tail.up();
  return { tail, mostRecentElement: tail };
}
