import * as XmlBuilder from "xmlbuilder";
import { Field } from "../model/field/Field";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";

// public for testing
// imdiSupportsMultipleElements: when true, creates separate elements with LanguageId attributes for each language.
// When false (e.g., for IMDI String_Type elements like Session.Title), uses only the first/default language value.
export function fieldElement(
  elementName: string,
  fieldOrString: string | Field | undefined,
  tail: XmlBuilder.XMLElementOrXMLNode,
  mostRecentElement?: XmlBuilder.XMLElementOrXMLNode,
  xmlElementIsRequired?: boolean,
  defaultValue?: string,
  imdiSupportsMultipleElements: boolean = true
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
    lastElementWeAdded = addElementsFromFieldContent(
      elementName,
      field,
      tail,
      imdiSupportsMultipleElements
    );
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
  tail: XmlBuilder.XMLElementOrXMLNode,
  imdiSupportsMultipleElements: boolean
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

    // If IMDI doesn't support multiple elements with LanguageId (e.g., String_Type),
    // just use the first language's value
    if (!imdiSupportsMultipleElements || axes.length === 1) {
      const firstLanguage = axes[0];
      element = tail.element(elementName, field.getTextAxis(firstLanguage));
    } else {
      // Multiple languages and IMDI supports LanguageId attributes
      axes.forEach((language) => {
        element = tail.element(elementName, field.getTextAxis(language));
        // Always use ISO639-3 (3-letter) codes for IMDI export
        // Archives require 3-letter codes, they can't handle 2-letter ISO639-1 codes
        const iso639_3 = staticLanguageFinder
          ? staticLanguageFinder.getIso639_3Code(language)
          : language;
        element.attribute("LanguageId", "ISO639-3:" + iso639_3);
      });
    }
  }
  return element;
}
