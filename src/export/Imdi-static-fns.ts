import * as XmlBuilder from "xmlbuilder";
import { Field } from "../model/field/Field";
import { fi } from "date-fns/locale";

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
  const field = fieldOrString instanceof Field ? fieldOrString : undefined;
  const text = typeof fieldOrString === "string" ? fieldOrString : undefined;
  let lastElementWeAdded: XmlBuilder.XMLElementOrXMLNode = tail;

  if (xmlElementIsRequired) {
    assert(
      defaultValue,
      "defaultValue is required if xmlElementIsRequired is true"
    );
    if ((field && field.isEmpty()) || !field) {
      assert(typeof fieldOrString === "string");
      lastElementWeAdded = addElementWithMonolingualStringContent(
        elementName,
        defaultValue,
        tail
      );
    }
  } else if (text) {
    lastElementWeAdded = addElementWithMonolingualStringContent(
      elementName,
      text,
      tail
    );
  } else if (field && !field.isEmpty()) {
    lastElementWeAdded = addElementsFromFieldContent(elementName, field, tail);
  }
  tail = lastElementWeAdded === tail ? tail : lastElementWeAdded.up();
  return { tail, mostRecentElement: tail }; // review is lastElementWeAdded what mostRecentElement should be?
}

function addElementWithMonolingualStringContent(
  elementName: string,
  text: string | undefined,
  tail: XmlBuilder.XMLElementOrXMLNode
) {
  if (text && text.length > 0) return tail.element(elementName, text);
  else return tail;
}

function addElementsFromFieldContent(
  elementName: string,
  field: Field,
  tail: XmlBuilder.XMLElementOrXMLNode
) {
  if (field.definition?.imdiRange) {
    // wer're assuming at this point that we don't have mulilingual vocabularies
    const element = tail.element(elementName, field.text);
    element.attribute("Link", field.definition.imdiRange);
    const type = field.definition.imdiIsClosedVocabulary
      ? "ClosedVocabulary"
      : "OpenVocabulary";
    element.attribute("Type", type);
  } else {
    field.getAllNonEmptyTextAxes().forEach((language) => {
      const element = tail.element(elementName, field.getTextAxis(language));
      element.attribute("LanguageId", language);
    });
  }
  return tail;
}
