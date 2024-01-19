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
  const field = fieldOrString instanceof Field ? fieldOrString : undefined;
  const text = typeof fieldOrString === "string" ? fieldOrString : undefined;
  let lastElementWeAdded: XmlBuilder.XMLElementOrXMLNode = tail;
  const needToUseDefaultValue =
    xmlElementIsRequired && ((field && field.isEmpty()) || !field) && !text;

  if (needToUseDefaultValue) {
    lastElementWeAdded = tail.element(elementName, defaultValue);
  } else if (text) {
    lastElementWeAdded = addElementWithMonolingualStringContentIfNotEmpty(
      elementName,
      text,
      tail
    );
  } else if (field && !field.isEmpty()) {
    lastElementWeAdded = addElementsFromFieldContent(elementName, field, tail);
  }
  //lastElementWeAdded = tail.element("hello", "world");
  tail = lastElementWeAdded === tail ? tail : lastElementWeAdded.up();

  return { tail, mostRecentElement: tail }; // review is lastElementWeAdded what mostRecentElement should be?
}

function addElementWithMonolingualStringContentIfNotEmpty(
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
  let element;
  if (field.definition?.imdiRange) {
    // wer're assuming at this point that we don't have mulilingual vocabularies
    element = tail.element(elementName, field.text);
    element.attribute("Link", field.definition.imdiRange);
    const type = field.definition.imdiIsClosedVocabulary
      ? "ClosedVocabulary"
      : "OpenVocabulary";
    element.attribute("Type", type);
  } else {
    const axes = field.getAllNonEmptyTextAxes();
    axes.forEach((language) => {
      element = tail.element(elementName, field.getTextAxis(language));

      // this logic might not be what we end up with, but for now we're just
      // assuming that 1) the UI only allows multiple languages if the the schema is going to support it, and
      //2) if there is only one language, we don't need to specify the language even if it can be multilingual.
      if (axes.length > 1) {
        // 2 letter is ISO639-1, 3 letter is taken to be the ISO639-3 (ethonogue code)
        const kind = language.length === 2 ? "ISO639-1" : "ISO639-3";
        element.attribute("LanguageId", kind + ":" + language);
      }
    });
  }
  return element;
}
