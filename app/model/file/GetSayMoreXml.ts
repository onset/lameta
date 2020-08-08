import * as xmlbuilder from "xmlbuilder";
import { FieldSet } from "../field/FieldSet";
import { Field, FieldType } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";
import { Contribution } from "./File";
import assert from "assert";
import { PersonLanguage } from "../PersonLanguage";

// This supplies the xml that gets saved in the .sprj, .session, and .person files
export default function getSayMoreXml(
  xmlRootName: string,
  properties: FieldSet,
  contributions: Contribution[],
  languagesOfPerson: PersonLanguage[] | undefined,
  doOutputTypeInXmlTags: boolean,
  doOutputEmptyCustomFields: boolean // used for watching empty custom fields
): string {
  const root = xmlbuilder.create(xmlRootName, {
    version: "1.0",
    encoding: "utf-8",
  });
  // 0.0.0 because we haven't started using this yet. It is just here  that in the future
  // *if* we use it, old versions will know not to open the file. Note, we would never just replace
  // "0.0.0" with the current version; we'd only update it, by hand, when we know we are doing something
  // that is not backwards compatible. And at the point we would need to be concerned about locking
  // people into whatever beta version this was introduced in, because they won't be able to go back
  // to their release version if there is a problem.
  // 0.9.1 (predicted) switched to new person languages format
  root.attribute("minimum_lameta_version_to_read", "0.0.0");
  const propertiesToPersist = properties
    .values()
    .filter((field) => field.persist);
  writeSimplePropertyElements(root, propertiesToPersist, doOutputTypeInXmlTags);
  if (properties.getValue("participants")) {
    // In older versions of SayMore & lameta, there were "participants", people without roles.
    // Now we just use the Contributors, which have roles and comments. But we still write out
    // this list in case the file is opened by an old version of SayMore
    const legacyParticipantsList = contributions
      .map((c) => c.personReference)
      .join(";");
    root.element("participants", {}, legacyParticipantsList);
  }

  if (languagesOfPerson && languagesOfPerson.length > 0) {
    writePersonLanguages(root, languagesOfPerson);
  }
  writeContributions(root, contributions);

  // "Additional Fields are labeled "More Fields" in the UI.
  // JH: I don't see a reason to wrap them up under a parent, but remember we're conforming to the inherited format at this point.
  writeElementGroup(
    root,
    propertiesToPersist.filter(
      (f) => f.definition && f.definition.isAdditional
    ),
    "AdditionalFields",
    false // only custom fields might need special treatment
  );
  writeElementGroup(
    root,
    propertiesToPersist.filter((f) => f.definition && f.definition.isCustom),
    "CustomFields",
    doOutputEmptyCustomFields
  );
  //writeElementsWeDontUnderstand();
  return root.end({
    pretty: true,
    indent: "  ",
    /*there are parts of the Windows Classic reading that will choke on a self-closing tag, thus this allowEmpty:true, which prevents self closing tags */
    allowEmpty: true,
  });
}
//function writeElementsWeDontUnderstand() {}
function writeSimplePropertyElements(
  root: xmlbuilder.XMLElementOrXMLNode,
  properties: Field[],
  doOutputTypeInXmlTags: boolean
) {
  properties
    .filter(
      (field) =>
        !field.definition ||
        (!field.definition.isCustom && !field.definition.isAdditional)
    )
    //.filter(field => field.type !== FieldType.Contributions)
    .forEach((field) => {
      writeField(root, field, doOutputTypeInXmlTags);
    });
}

function writeElementGroup(
  root: xmlbuilder.XMLElementOrXMLNode,
  fields: Field[],
  groupTag: string,
  doOutputEmptyFields: boolean // used for watching empty custom fields
) {
  const groupParent = root.element(groupTag, {
    type: "xml",
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

function writeContributions(
  root: xmlbuilder.XMLElementOrXMLNode,
  contributions: Contribution[]
) {
  const contributionsElement = root.element("contributions", {
    type: "xml",
  });
  contributions.forEach((contribution) => {
    if (
      contribution.personReference &&
      contribution.personReference.trim().length > 0
    ) {
      let tail = contributionsElement.element("contributor");
      if (contribution.personReference) {
        tail = tail.element("name", contribution.personReference).up();
      }
      // SayMore classic will crash if there is no role. It is limited to the
      // roles in olac, so it does not accept
      // something like "unspecified". To allow smx to have unspecified,
      // we give it "participant" which something approaching a generic role. But then if we do this,
      // we emit an "smxrole" for what we really want, so as long as you stay in smx, you
      // can have unspecified roles. However if this file gets rewritten
      // by SM Classic, we'll probably lose that when it comes  back to SMx.
      const role = contribution.role ? contribution.role : "participant"; // TODO: change to "unspecified" or just empty if/when SM classic released that can handle it.
      tail = tail.element("role", role).up();
      if (!contribution.role) {
        tail = tail.element("smxrole", "unspecified").up();
      }

      if (contribution.date) {
        writeDate(tail, "date", contribution.date);
      } else {
        // SayMore classic will crash if there is no date.
        // It also uses 0001-01-01 in this situation
        writeDate(tail, "date", "0001-01-01");
      }

      if (contribution.comments && contribution.comments.trim().length > 0) {
        tail = tail.element("comments", contribution.comments).up();
      }
    }
  });
}

function writePersonLanguages(
  root: xmlbuilder.XMLElementOrXMLNode,
  languages: PersonLanguage[]
) {
  const languageElement = root.element("personLanguages", {
    type: "xml",
  });
  languages.forEach((language) => {
    if (language.tag.trim().length > 0) {
      const tail = languageElement.element("language");
      tail.attribute("tag", language.tag.trim());
      writeBooleanAttribute(tail, "primary", language.primary);
      writeBooleanAttribute(tail, "mother", language.mother);
      writeBooleanAttribute(tail, "father", language.father);
    }
  });
}

function writeBooleanAttribute(tail: any, name: string, value: boolean) {
  tail.attribute(name, value ? "true" : "false");
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
