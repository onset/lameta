import * as XmlBuilder from "xmlbuilder";
import { Field } from "../model/field/Field";
import { applyCapitalization } from "../model/field/capitalization";
import { staticLanguageFinder } from "../languageFinder/LanguageFinder";

// public for testing
// imdiSupportsMultipleElements: when true, creates separate elements with LanguageId attributes for each language.
// When false (e.g., for IMDI String_Type elements like Session.Title), uses only the first/default language value.
// extraAttributes: optional attributes to add to each element (e.g., { Name: "short_description" })
export function fieldElement(
  elementName: string,
  fieldOrString: string | Field | undefined,
  tail: XmlBuilder.XMLElementOrXMLNode,
  mostRecentElement?: XmlBuilder.XMLElementOrXMLNode,
  xmlElementIsRequired?: boolean,
  defaultValue?: string,
  imdiSupportsMultipleElements: boolean = true,
  extraAttributes?: Record<string, string>,
  metadataSlotTags?: string[],
): {
  tail: XmlBuilder.XMLElementOrXMLNode;
  mostRecentElement: XmlBuilder.XMLElementOrXMLNode;
} {
  const field = fieldOrString instanceof Field ? fieldOrString : undefined;
  const text = typeof fieldOrString === "string" ? fieldOrString.trim() : undefined;
  const fieldIsBlank = !field || field.isEmpty() || field.text.trim() === "";
  let lastElementWeAdded: XmlBuilder.XMLElementOrXMLNode = tail;
  const needToUseDefaultValue = xmlElementIsRequired && fieldIsBlank && !text;

  if (needToUseDefaultValue) {
    lastElementWeAdded = textElement(tail, elementName, defaultValue);
    addExtraAttributes(lastElementWeAdded, extraAttributes);
  } else if (text) {
    lastElementWeAdded = addElementWithMonolingualStringContentIfNotEmpty(
      elementName,
      text,
      tail,
      extraAttributes,
    );
  } else if (field && !fieldIsBlank) {
    lastElementWeAdded = addElementsFromFieldContent(
      elementName,
      field,
      tail,
      imdiSupportsMultipleElements,
      extraAttributes,
      metadataSlotTags,
    );
  }
  //lastElementWeAdded = tail.element("hello", "world");
  tail = lastElementWeAdded === tail ? tail : lastElementWeAdded.up();

  return { tail, mostRecentElement: tail }; // review is lastElementWeAdded what mostRecentElement should be?
}

// Every element with text content goes through here, so that no IMDI value keeps the spaces around it.
export function textElement(
  parent: XmlBuilder.XMLElementOrXMLNode,
  elementName: string,
  text: string | undefined,
): XmlBuilder.XMLElementOrXMLNode {
  return parent.element(elementName, text?.trim() ?? "");
}

function addExtraAttributes(
  element: XmlBuilder.XMLElementOrXMLNode,
  extraAttributes?: Record<string, string>,
) {
  if (extraAttributes) {
    Object.entries(extraAttributes).forEach(([attrName, attrValue]) => {
      element.attribute(attrName, attrValue);
    });
  }
}

function addElementWithMonolingualStringContentIfNotEmpty(
  elementName: string,
  text: string | undefined,
  tail: XmlBuilder.XMLElementOrXMLNode,
  extraAttributes?: Record<string, string>,
) {
  if (text && text.length > 0) {
    const element = textElement(tail, elementName, text);
    addExtraAttributes(element, extraAttributes);
    return element;
  } else return tail;
}

// The elements that addElementsFromFieldContent writes for a field that is not blank:
// their text, and for each of several languages, its LanguageId
export function fieldElementValues(
  field: Field,
  imdiSupportsMultipleElements: boolean,
  metadataSlotTags?: string[],
): { text: string; languageId?: string }[] {
  if (field.definition?.imdiRange) {
    // wer're assuming at this point that we don't have mulilingual vocabularies
    return [{ text: field.text }];
  }
  // Spreadsheet import can leave multilingual fields in slash syntax until a user
  // edits them. Export needs to honor that virtual multilingual view as well as
  // already-committed tagged text.
  const shouldUseVirtualMultilingual =
    field.definition?.multilingual === true &&
    metadataSlotTags !== undefined &&
    metadataSlotTags.length > 0;
  const axes = shouldUseVirtualMultilingual
    ? field
        .getEffectiveSlotTags(metadataSlotTags)
        .filter((language) => field.getTextAxisVirtual(language, metadataSlotTags).trim() !== "")
    : field.getAllNonEmptyTextAxes();
  const getTextForLanguage = (language: string) =>
    applyCapitalization(
      field.definition,
      shouldUseVirtualMultilingual
        ? field.getTextAxisVirtual(language, metadataSlotTags)
        : field.getTextAxis(language),
    );

  // If IMDI doesn't support multiple elements with LanguageId (e.g., String_Type),
  // just use the first language's value
  if (axes.length === 0) {
    return [{ text: applyCapitalization(field.definition, field.text) }];
  }
  if (!imdiSupportsMultipleElements || axes.length === 1) {
    return [{ text: getTextForLanguage(axes[0]) }];
  }
  // Multiple languages and IMDI supports LanguageId attributes
  return axes.map((language) => ({
    text: getTextForLanguage(language),
    // Always use ISO639-3 (3-letter) codes for IMDI export
    // Archives require 3-letter codes, they can't handle 2-letter ISO639-1 codes
    languageId:
      "ISO639-3:" +
      (staticLanguageFinder ? staticLanguageFinder.getIso639_3Code(language) : language),
  }));
}

function addElementsFromFieldContent(
  elementName: string,
  field: Field,
  tail: XmlBuilder.XMLElementOrXMLNode,
  imdiSupportsMultipleElements: boolean,
  extraAttributes?: Record<string, string>,
  metadataSlotTags?: string[],
) {
  let element;
  for (const value of fieldElementValues(field, imdiSupportsMultipleElements, metadataSlotTags)) {
    element = textElement(tail, elementName, value.text);
    if (field.definition?.imdiRange) {
      element.attribute("Link", field.definition.imdiRange);
      const type = field.definition.imdiIsClosedVocabulary ? "ClosedVocabulary" : "OpenVocabulary";
      element.attribute("Type", type);
    }
    if (value.languageId) element.attribute("LanguageId", value.languageId);
    addExtraAttributes(element, extraAttributes);
  }
  return element;
}
