import pkg from "package.json";
import * as xml2js from "xml2js";
import fs from "fs";
import * as Path from "path";
const filesize = require("filesize");
import { makeObservable, observable } from "mobx";
import * as mobx from "mobx";
import assert from "assert";
const camelcase = require("camelcase");
import { Field, FieldType } from "../field/Field";
import { FieldDefinition } from "../field/FieldDefinition";
import { FieldSet } from "../field/FieldSet";
import moment from "moment";
import getSayMoreXml from "./GetSayMoreXml";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
import fieldDefinitionsOfCurrentConfig, {
  isKnownFieldKey
} from "../field/ConfiguredFieldDefinitions";
import { ShowSavingNotifier } from "../../components/SaveNotifier";
import {
  NotifyError,
  NotifyException,
  NotifyFileAccessProblem,
  NotifyRenameProblem,
  NotifySuccess,
  NotifyWarning
} from "../../components/Notify";
import _ from "lodash";
import { GetFileFormatInfoForPath } from "./FileTypeInfo";
import { sentryBreadCrumb } from "../../other/errorHandling";
import compareVersions from "compare-versions";
import xmlbuilder from "xmlbuilder";
import { PatientFS } from "../../other/patientFile";
import { t } from "@lingui/macro";
import { ShowMessageDialog } from "../../components/ShowMessageDialog/MessageDialog";

import { getMediaFolderOrEmptyForThisProjectAndMachine } from "../Project/MediaFolderAccess";

function getCannotRenameFileMsg() {
  return t`lameta  was not able to rename that file.`;
}

export const kLinkExtensionWithFullStop = ".link";

export class Contribution {
  //review this @observable
  public personReference: string; // this is the contributor
  public role: string;
  public comments: string;
  public sessionName: string; // not persisted; just used by the UI when listing contributions for a person

  public constructor(personReference: string, role: string, comments: string) {
    makeObservable(this, {
      personReference: observable,
      role: observable,
      comments: observable
    });

    this.personReference = personReference;
    this.role = role;
    this.comments = comments;
  }
}

export /*babel doesn't like this: abstract*/ class File {
  // can be changed to Session, Project, or Person in constructor
  //protected xmlRootName: string = "MetaData";

  // In the case of folder objects (project, session, people) this will just be the metadata file,
  // and so describedFilePath === metadataPath.
  // It may be a .link file file, which will contain as its contents the subpath starting from the the media
  // folder.
  // Otherwise, (mp3, jpeg, elan, txt), this will be the file we are storing metadata about.
  private describedFileOrLinkFilePath: string;

  public get pathInFolderToLinkFileOrLocalCopy() {
    return this.describedFileOrLinkFilePath;
  }

  public copyInProgress: boolean;

  public copyProgress: string;

  // This file can be *just* metadata for a folder, in which case it has the fileExtensionForFolderMetadata.
  // But it can also be paired with a file in the folder, such as an image, sound, video, elan file, etc.,
  // in which case the metadata will be stored in afile with the same name as the described file, but
  // with an extension of ".meta", as in "banquet.jpg.meta";
  public metadataFilePath: string;

  private xmlRootName: string;
  private doOutputTypeInXmlTags: boolean;
  public fileExtensionForMetadata: string;
  public canDelete: boolean;

  public properties = new FieldSet();

  public contributions = new Array<Contribution>();

  public customFieldNamesRegistry: CustomFieldRegistry;

  public get isMedia(): boolean {
    return ["Image", "Audio", "Video"].indexOf(this.type) > -1;
  }
  public get isImage(): boolean {
    return "Image" === this.type;
  }

  get type(): string {
    const x = this.properties.getValue("type") as Field;
    return x ? x.text : "???";
  }
  private checkType(key: string, value: any) {
    if (this.properties.containsKey(key)) {
      const a = typeof this.properties.getValueOrThrow(key);
      const b = typeof value;
      assert.ok(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
  public wasDeleted() {
    // there was a bug at one time with something still holding a reference to this.
    this.metadataFilePath = "error: this file was previously put in trash";
    this.describedFileOrLinkFilePath = "";
  }
  protected addDatePropertyFromString(key: string, dateString: string) {
    // Note: I am finding it rather hard to not mess up dates, because in javascript
    // everything (including moment) wants to over-think things and convert dates
    // to one's local timezone. You get bugs like having the file say 2015-3-21, but
    // then saving as 2015-3-20 because you're running this in America. Ugghhh.
    // It's just too easy to mess up. So what I'm trying for now
    // is to confine anything that could mess with the date to 2 places: here,
    // at import time where we have to be permissive, and when displaying in the UI.
    // Other than those two places, the rule is that all strings are YYYY-MM-DD in UTC.

    //assert.ok(moment(dateString).isValid()); //todo: handle bad data

    this.properties.setValue(
      key,
      new Field(
        key,
        FieldType.Date,
        this.normalizeIncomingDateString(dateString)
      )
    );
  }
  protected normalizeIncomingDateString(dateString: string): string {
    if (!dateString || dateString.trim().length === 0) {
      return "";
    }
    if (dateString === "0001-01-01") {
      // this is used to pacify SM Classic when it requires a date but we don't know it
      //celnoos.log("SKIPPING 0001-01-01");
      return "";
    }

    let date: moment.Moment;

    date = moment(dateString, "YYYY-MM-DD", true /*strict*/);
    if (!date.isValid()) {
      //console.error(`Could not parse ${dateString} strictly.`);
      date = moment(dateString, moment.ISO_8601); // e.g. "2010-01-01T05:06:07"
      if (!date.isValid()) {
        this.setTextProperty(
          "notes",
          `Parsing Error: lameta could not parse "${dateString}" unambiguously, so it will be set to empty. Encountered on ${moment(
            moment.now()
          ).toString()}`
        );
        return ""; // Our GUI controls need an unambiguous date, so it's safer to just clear the date and leave it for the human to fix it using the error we put in the notes
      }
    }
    const ISO_YEAR_MONTH_DATE_DASHES_FORMAT = "YYYY-MM-DD";
    // if there is time info, throw that away.
    const standardizedDate = date.format(ISO_YEAR_MONTH_DATE_DASHES_FORMAT);
    return standardizedDate;
  }
  protected addDateProperty(key: string, date: Date, persist: boolean = true) {
    this.checkType(key, date);
    const definition = {
      key,
      englishLabel: key,
      persist,
      type: "Date",
      isCustom: false,
      showOnAutoForm: false
    };

    const f = Field.fromFieldDefinition(definition);
    f.setValueFromString(date.toISOString());
    this.properties.setValue(key, f);
  }
  protected addNotesProperty() {
    const definition: FieldDefinition = {
      key: "notes",
      englishLabel: "notes",
      persist: true,
      type: "Text",
      isCustom: false,
      showOnAutoForm: false,
      multipleLines: true
    };

    const f = Field.fromFieldDefinition(definition);
    //f.setValueFromString("");
    this.properties.setValue("notes", f);
  }

  //this would be used for round-tripping nested xml that we don't understand
  // public addObjectProperty(key: string, value: object) {
  //   this.addTextProperty(key, JSON.stringify(value));
  // }

  public addTextProperty(
    key: string,
    value: string,
    persist: boolean = true,
    isCustom: boolean = false,
    showOnAutoForm: boolean = false
  ) {
    // assert.notEqual(
    //   value,
    //   undefined,
    //   `addTextProperty('${key}') was given a value of undefined`
    // );
    if (value === undefined) {
      value = "";
    }
    // if this field (and more importantly, its definition, already exists, just stick in a new value)
    const field = this.properties.getValue(key);
    if (field) {
      field.setValueFromString(value);
    }
    // otherwise make up a field with a generic definition and stick the value in there
    else {
      const definition = {
        key,
        // no: don't mess with the case of things we don't know about, we will probably just be round-tripping this
        //  englishLabel: isCustom ? key : titleCase(key),
        englishLabel: key,
        persist,
        type: "Text",
        isCustom,
        showOnAutoForm
      };

      const f = Field.fromFieldDefinition(definition);
      f.setValueFromString(value);
      this.properties.setValue(key, f);
    }
    if (key === "Sub-Genre") {
      console.log(
        "addTextProperty(Sub-Genre) " +
          JSON.stringify(this.properties.getValue(key))
      );
    }

    // //console.log("setting " + key + " to " + value);
    // const field = new Field(
    //   key,
    //   FieldType.Text,
    //   value,
    //   undefined,
    //   undefined,
    //   undefined,
    //   persist
    // );
    //this.properties.setValue(key, field);

    assert.ok(
      value === this.properties.getTextField(key).text,
      `expected value of '${key}', '${value}'==='${
        this.properties.getTextField(key).text
      }'`
    );
  }
  public setTextProperty(key: string, value: string) {
    //many SayMore 1/2/3.x xml files used a mix of upper and lower case
    //We can read the upper case ones, but then we convert them to lower case initial
    const correctedKey = camelcase(key);

    // we want to re-use any existing field... among other things, that preserves the field definition
    const existing: Field | undefined = this.properties.getValue(key);
    if (existing) {
      existing.setValueFromString(value);
    } else {
      this.properties.setValue(
        key,
        new Field(correctedKey, FieldType.Text, value)
      );
    }
  }
  public getTextProperty(key: string, ifMissing: string = "MISSING"): string {
    try {
      const p = this.properties.getValueOrThrow(key); //as Field;
      return p.text;
    } catch {
      return ifMissing;
    }
  }

  public getTextField(key: string): Field {
    return this.properties.getValueOrThrow(key) as Field;
  }

  public constructor(
    describedFilePath: string,
    metadataFilePath: string,
    xmlRootName: string,
    doOutputTypeInXmlTags: boolean,
    fileExtensionForMetadata: string,
    canDelete: boolean
  ) {
    makeObservable<File, "describedFileOrLinkFilePath">(this, {
      describedFileOrLinkFilePath: observable,
      copyInProgress: observable,
      copyProgress: observable,
      properties: observable,
      contributions: observable
    });

    this.canDelete = canDelete;
    this.describedFileOrLinkFilePath = describedFilePath;
    this.metadataFilePath = metadataFilePath;
    this.xmlRootName = xmlRootName;
    this.doOutputTypeInXmlTags = doOutputTypeInXmlTags;
    this.fileExtensionForMetadata = fileExtensionForMetadata;

    this.addNotesProperty();
    this.addTextProperty("filename", "", false);
    this.setFileNameProperty();

    // NB: subclasses should call this (as super()), then read in their definitions, then let us finish by calling finishLoading();
  }

  // call this after loading in your definitions, or, if doing a copy, when the copy is complete.
  public finishLoading() {
    this.addFieldsUsedInternally();
    this.readMetadataFile();
    this.copyInProgress = false;
  }

  public isLinkFile(): boolean {
    return this.describedFileOrLinkFilePath.endsWith(
      kLinkExtensionWithFullStop
    );
  }
  public getFilenameToShowInList(): string {
    return trimSuffix(
      this.getTextProperty("filename"),
      kLinkExtensionWithFullStop
    );
  }
  public getActualFileExists(): boolean {
    return fs.existsSync(this.getActualFilePath());
  }

  // Note: This isn't giving correct results but at the moment ELAR wants it to stay the same,
  // perhaps because their injestion systems are expecting it to be this way. (Feb 2023).
  // For example, ConsentDocuments will list bundleroot/consentfile instead of bundleroot/myproject/ConsentDocuments/consentfile
  // Meanwhile a file in a Session will be listed as mysession/thefile instead
  // of either ./thefile or bundleroot/myproject/mysession/thefile, both of which would be better.
  public getRelativePathForExportingTheActualFile(): string {
    let dir = Path.dirname(this.pathInFolderToLinkFileOrLocalCopy);
    if (dir.indexOf("ConsentBundle") > -1) {
      dir = "ConsentDocuments"; // per notion #241
    }
    return Path.join(
      // folder name, e.g. "ETR009/"
      Path.basename(dir),
      // file name
      this.getNameToUseWhenExportingUsingTheActualFile()
    ).replace(/\\/g, "/");
  }
  public getNameToUseWhenExportingUsingTheActualFile(): string {
    // For links, use the name shown in the list, which may have been renamed or sanitized
    // or whatever, rather than the original name that we are linking to
    const filename = this.isLinkFile()
      ? trimSuffix(this.describedFileOrLinkFilePath, kLinkExtensionWithFullStop)
      : this.describedFileOrLinkFilePath;
    return Path.basename(filename);
  }
  public getActualFilePath(): string {
    if (this.isLinkFile()) {
      const subpath = fs.readFileSync(
        this.describedFileOrLinkFilePath,
        "utf-8"
      );
      return Path.join(
        getMediaFolderOrEmptyForThisProjectAndMachine(),
        subpath
      );
    } else {
      return this.describedFileOrLinkFilePath;
    }
  }
  public getModifiedDate(): Date | undefined {
    // when you drag a file into the filelist, it doesn't have a modifiedDate
    if (this.properties.getHasValue("modifiedDate"))
      return this.properties.getDateField("modifiedDate").asDate();
    return undefined;
  }

  // These are fields that are computed and which we don't save, but which show up in the UI.
  private addFieldsUsedInternally() {
    if (!fs.existsSync(this.getActualFilePath())) {
      return;
    }

    const stats = fs.statSync(this.getActualFilePath());

    this.addTextProperty("size", filesize(stats.size, { round: 0 }), false);
    this.addDateProperty("modifiedDate", stats.mtime, false);
    const typeName =
      GetFileFormatInfoForPath(this.getActualFilePath())?.type ??
      Path.extname(this.getActualFilePath());
    this.addTextProperty("type", typeName, false);
  }
  protected specialLoadingOfField(
    tag: string,
    propertiesFromXml: any
  ): boolean {
    //console.log("Field.specialHandlingOfField");
    return false;
  }
  private loadPropertiesFromXml(propertiesFromXml: any) {
    const tags = Object.keys(propertiesFromXml);
    for (const tag of tags) {
      if (this.specialLoadingOfField(tag, propertiesFromXml)) {
        continue;
      } else if (tag.toLocaleLowerCase() === "contributions") {
        this.loadContributions(propertiesFromXml[tag]);
      }

      // <CustomFields>
      else if (tag.toLowerCase() === "customfields") {
        //        console.log(JSON.stringify(propertiesFromXml[key]));
        const customKeys = Object.keys(propertiesFromXml[tag]);
        for (const key of customKeys) {
          // first one is just $":{"type":"xml"}
          if (key !== "$") {
            // If one of our files is opened in SayMore Classic, it will see fields that it doesn't
            // understand. It will move them to the set of "custom" fields. Notably, in Dec 2019
            // this happened when we introduced "id" as a field (instead of just relying on the folder
            // name).
            // Here we can pull such fields back out of the custom list and up to the top level.
            const isCustom = !isKnownFieldKey(key);
            if (!isCustom) {
              //   console.info(
              //     `** Pulling ${key}:${propertiesFromXml[tag][key]._} back out of custom list, where presumably SayMore Classic put it.`
              //   );
            }
            this.loadOnePersistentProperty(
              key,
              propertiesFromXml[tag][key],
              isCustom
            );
          }
        }
      }
      // <AdditionalFields>
      else if (tag.toLowerCase() === "additionalfields") {
        //        console.log(JSON.stringify(propertiesFromXml[key]));
        const tagsInAdditionalFieldSection = Object.keys(
          propertiesFromXml[tag]
        );
        for (const childTag of tagsInAdditionalFieldSection) {
          // first one is just $":{"type":"xml"}
          if (childTag !== "$") {
            this.loadOnePersistentProperty(
              childTag,
              propertiesFromXml[tag][childTag],
              false
            );
          }
        }
      } else {
        // "Normal" fields
        this.loadOnePersistentProperty(tag, propertiesFromXml[tag], false);
      }
    }
  }

  private loadOnePersistentProperty(
    xmlTag: string,
    value: any,
    isCustom: boolean
  ) {
    //for some reason xml gives us undefined for things with just a space. Let's just trim while we're at it.
    if (value === undefined) {
      value = "";
    }

    const typesWeStoreAsStrings = [
      "string",
      "date",
      "multiLanguage",
      "language"
    ];

    // console.log("loadProperties key: " + key);
    // console.log(JSON.stringify(value));
    if (value === undefined) {
      value = "";
    } else if (typeof value === "object") {
      if (
        value.$ &&
        value.$.type &&
        typesWeStoreAsStrings.includes(value.$.type)
      ) {
        value = value._;
      }
      // if we decide we do need to roundtrip nested unknown elements
      //else {
      //   this.addObjectProperty(elementName, value);
      //   return;
      // }
      else {
        // console.log(
        //   "Skipping " + xmlTag + " which was " + JSON.stringify(value)
        // );
        return;
      }
    }

    const textValue: string = value;

    if (isCustom && textValue.length > 0) {
      this.customFieldNamesRegistry.encountered(this.type, xmlTag);
    }

    // this is getting messy... we don't want to enforce our casing
    // on keys that we don't understand, because we need to round-trip them.
    // Starting to wish I just used whatever the xml element name was for the
    // key, regardless. Since SayMore Windows Classic uses all manor of case
    // styles for elements... ending up with all this code to work around that.
    let fixedKey = xmlTag;
    if (
      // if we know about this field, then we know how to roundtrip correctly
      // already.
      // Note the following would give a false positive if the key was
      // known in, say, session, but we are currently loading a person.
      // Since we do not expect any new versions of SayMore Classic,
      // (which could theoretically introduce such a situation),
      // I'm living with that risk.
      Object.keys(fieldDefinitionsOfCurrentConfig).some((
        area // e.g. project, session, person
      ) =>
        fieldDefinitionsOfCurrentConfig[area].find(
          (d: any) =>
            d.key.toLowerCase() === xmlTag.toLowerCase() ||
            d.tagInSayMoreClassic === xmlTag
        )
      )
    ) {
      fixedKey = this.properties.getKeyFromXmlTag(xmlTag);
    }

    // ---- DATES  --
    if (xmlTag.toLowerCase().indexOf("date") > -1) {
      const normalizedDateString = this.normalizeIncomingDateString(textValue);
      if (this.properties.containsKey(fixedKey)) {
        const existingDateField = this.properties.getValueOrThrow(fixedKey);
        existingDateField.setValueFromString(normalizedDateString);
        //console.log("11111" + key);
      } else {
        this.addDatePropertyFromString(fixedKey, normalizedDateString);
      }
    }

    // --- Text ----
    // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
    else if (this.properties.containsKey(fixedKey)) {
      const v = this.properties.getValueOrThrow(fixedKey);
      v.setValueFromString(textValue);
      //console.log("11111" + key);
    } else {
      //console.log("extra" + fixedKey + "=" + value);
      // otherwise treat it as a string
      this.addTextProperty(
        fixedKey,
        textValue,
        true,
        isCustom,
        undefined /*showOnAutoForm*/
      );
    }
  }

  private loadContributions(contributionsFromXml: any) {
    //console.log("loadContributions() " + this.metadataFilePath);
    if (!contributionsFromXml.contributor) {
      return;
    }
    if (Array.isArray(contributionsFromXml.contributor)) {
      for (const c of contributionsFromXml.contributor) {
        this.loadOneContribution(c);
      }
    } else {
      this.loadOneContribution(contributionsFromXml.contributor);
    }
  }
  private loadOneContribution(contributionFromXml: any) {
    //console.log("loadOneContribution() " + this.metadataFilePath);

    // SayMore Classic doesn't allow "unspecified" as a role, so if we need that, we
    // emit an <smxrole>unspecified</smxrole>, which it won't see, but here we do
    // see it if it's there and use it instead of the one in <role>.
    // prettier-ignore
    const role = contributionFromXml.smxrole
      ? (contributionFromXml.smxrole === "unspecified" ? "" : contributionFromXml.smxrole)
      : contributionFromXml.role;
    const n = new Contribution(
      contributionFromXml.name,
      role,
      //this.normalizeIncomingDateString(contributionFromXml.date),
      contributionFromXml.comments
    );
    this.contributions.push(n);
  }
  public removeContribution(index: number) {
    console.assert(index >= 0 && index < this.contributions.length);
    this.contributions.splice(index, 1);
  }

  private haveReadMetadataFile: boolean = false;
  public readMetadataFile() {
    try {
      sentryBreadCrumb(`enter readMetadataFile ${this.metadataFilePath}`);
      if (this.haveReadMetadataFile) {
        console.error("Already read metadataFile of " + this.metadataFilePath);
        return;
      }
      this.haveReadMetadataFile = true;
      //console.log("readMetadataFile() " + this.metadataFilePath);
      if (fs.existsSync(this.metadataFilePath)) {
        const xml: string = PatientFS.readFileSyncWithNotifyAndRethrow(
          this.metadataFilePath
        );

        let xmlAsObject: any = {};
        xml2js.parseString(
          xml,
          {
            async: false,
            explicitArray: false //this is good for most things, but if there are sometimes 1 and sometime multiple (array), you have to detect the two scenarios
            //explicitArray: true, this also just... gives you a mess
            //explicitChildren: true this makes even simple items have arrays... what a pain
          },
          (err, result) => {
            if (err) {
              throw Error(
                `There was a problem reading the XML in ${this.metadataFilePath}: ${err.message}`
              );
            }
            xmlAsObject = result;
          }
        );
        if (!xmlAsObject) {
          // there was a sentry error report that seemed to implicate this being null
          throw new Error(
            `Got null xmlAsObject in readMetadataFile ${this.metadataFilePath}`
          );
        }
        // that will have a root with one child, like "Session" or "Meta". Zoom in on that
        // so that we just have the object with its properties.
        let properties = xmlAsObject[Object.keys(xmlAsObject)[0]];

        if (properties === "") {
          // This happen if it finds, e.g. <Session/>. Which is what we get when making a new file.

          properties = {};
        }
        const minimumVersion = properties.$?.minimum_lameta_version_to_read;
        if (minimumVersion) {
          const current = pkg.version;
          if (compareVersions(minimumVersion, current) === 1) {
            throw Error(
              `The file ${this.metadataFilePath} is from a later version of lameta. It claims to require at least lameta version ${minimumVersion}. Please upgrade.`
            );
          }
        }
        //copies from this object (which is just the xml as an object) into this File object
        this.loadPropertiesFromXml(properties);
        // note this could conceivably be wrong if we wanted to save some changes/updates that happen during loadPropertiesFromXml()
        // But otherwise, we don't want to spend time saving, notifying, and messing with the file change dates.
        this.clearDirty();
      }
      this.recomputedChangeWatcher();
    } catch (err) {
      NotifyException(
        err,
        `There was a problem reading ${this.metadataFilePath}`
      );
      throw err;
    } finally {
      sentryBreadCrumb(`exit readMetadataFile ${this.metadataFilePath}`);
    }
  }
  private inGetXml: boolean = false;
  public getXml(doOutputEmptyCustomFields: boolean = false) {
    if (this.inGetXml) {
      throw new Error("Loop detected in getXml() for " + this.metadataFilePath);
    }
    this.inGetXml = true;
    try {
      //console.log("-----------getXml() of " + this.metadataFilePath);
      return getSayMoreXml(
        this.xmlRootName,
        this.properties,
        this.contributions,
        this,
        this.doOutputTypeInXmlTags,
        doOutputEmptyCustomFields
      );
    } finally {
      this.inGetXml = false;
    }
  }
  //overridden by person (eventually session)
  public writeXmlForComplexFields(root: xmlbuilder.XMLElementOrXMLNode) {}

  public save(beforeRename: boolean = false, forceSave: boolean = false) {
    //console.log(`Might save ${this.metadataFilePath}`);

    // console.log(
    //   `dirty of ${this.metadataFilePath} is ${
    //     this.dirty === undefined ? "undefined" : this.dirty
    //   }}`
    // );
    if (
      !forceSave &&
      this.dirty === false &&
      fs.existsSync(this.metadataFilePath)
    ) {
      //console.log(`skipping save of ${this.metadataFilePath}, not dirty`);
      return;
    }

    sentryBreadCrumb(`Saving xml ${this.metadataFilePath}`);

    //console.log(`Saving ${this.metadataFilePath}`);

    const xml = this.getXml(false);

    if (this.describedFileOrLinkFilePath.indexOf("sample data") > -1) {
      // now warning at project level so that we don't see this repeatedly
      // NotifyWarning(
      //   "Not saving because directory contains the words 'sample data'"
      // );
      console.log("WOULD HAVE SAVED THE FOLLOWING TO " + this.metadataFilePath);
    } else {
      try {
        // console.log(`Saving ${this.metadataFilePath}`);
        ShowSavingNotifier(Path.basename(this.metadataFilePath), beforeRename);
        PatientFS.writeFileSyncWithNotifyThenRethrow(
          this.metadataFilePath,
          xml
        );
        this.clearDirty();
      } catch (error) {
        if (error.code === "EPERM") {
          NotifyFileAccessProblem(
            `Cannot save because lameta was denied write access to ${this.metadataFilePath}.`,
            error
          );
        } else {
          NotifyError(
            `While saving ${this.metadataFilePath}, got ${error} (file.save)`
          );
        }
        //console.log(`File readonly, skipping save: ${this.metadataFilePath}`);
      }
    }
  }

  private getUniqueFilePath(intendedPath: string): string {
    if (fs.existsSync(intendedPath)) {
      // Dec 2019, I don't think this ever gets used
      throw Error(
        `Please report error: getUniqueFilePath("${intendedPath}") did not expect that it was actually possible to have to come up with a unique name.`
      );

      //     In Sentry, someone using 0.9.2, got

      //     Error: Please report error: getUniqueFilePath("D:\lameta\Limassa\Sessions\Forest_scavanging_2\BME_BW_AlMi_A_001.session") did not expect that it was actually possible to have to come up with a unique name.
      // at getUniqueFilePath (./app/model/file/File.ts:666:13)
      // at internalUpdateNameBasedOnNewFolderName (./app/model/file/File.ts:708:24)
      // at updateNameBasedOnNewFolderName (./app/model/file/File.ts:762:35)
      // at call (./app/model/Folder/Folder.ts:331:11)
      // at Array.forEach (~/>)
    }
    return intendedPath;
    // this was in-progress when I decided I don't need it
    // let path = intendedPath;
    // const extension = Path.extname(intendedPath);
    // // enhance: there are pathological file names like "foo.mp3.mp3" where this would mess up.
    // const pathWithoutExtension = Path.join(
    //   Path.dirname(intendedPath),
    //   Path.basename(intendedPath).replace(extension, "")
    // );
    // let lastNumber = 0;
    // let pathBeforeNumber = pathWithoutExtension;
    // while (fs.existsSync(path)) {
    //   const match = pathWithoutExtension.match("(S+)s(d+)$");
    //   if (match && match.length > 1) {
    //     lastNumber = parseInt(match[match.length - 1], undefined);
    //   }
  }

  // Rename one file on disk and return the new full path.
  // A file is renamed only if it currently contains
  // the folder name. E.g. if we are changing from "jo" to "joe":
  // jo.person  --> joe.person
  // jo_photo.jpg --> joe_photo.jpg
  // group_photo.jpg --> no change
  private internalUpdateNameBasedOnNewFolderName(
    currentFilePath: string,
    newbase: string
  ): string {
    const oldbase = Path.basename(Path.dirname(currentFilePath));
    const oldFilename = Path.basename(currentFilePath);
    if (oldFilename.startsWith(oldbase)) {
      const newFilename = oldFilename.replace(oldbase, newbase);
      let newPath = Path.join(Path.dirname(currentFilePath), newFilename);

      // Note, this code hasn't been tested with Linux, which has a case-sensitive file system.
      // Windows is always case-insensitive, and macos usually (but not always!) is. Here we
      // currently only support case-insensitive.
      if (!this.areSamePath(newPath, currentFilePath)) {
        newPath = this.getUniqueFilePath(newPath);
      }

      PatientFS.renameSyncWithNotifyAndRethrow(currentFilePath, newPath);
      //console.log(`Renamed ${currentFilePath} to ${newPath}`);
      return newPath;
    }
    return currentFilePath;
  }
  private areSamePath(a: string, b: string) {
    //fix slashes and such
    const aNormalized = Path.normalize(a);
    const bNormalized = Path.normalize(b);
    // enhance, on Linux this might need to be different?
    return (
      aNormalized.localeCompare(bNormalized, undefined, {
        sensitivity: "accent"
      }) === 0
    );
  }
  private updateFolderOnly(path: string, newFolderName: string): string {
    const filePortion = Path.basename(path);
    const directoryPortion = Path.dirname(path);
    const parentDirectoryPortion = Path.dirname(directoryPortion);
    return Path.join(parentDirectoryPortion, newFolderName, filePortion);
  }
  public isOnlyMetadata(): boolean {
    return this.metadataFilePath === this.describedFileOrLinkFilePath;
  }

  public throwIfFilesMissing() {
    if (!fs.existsSync(this.metadataFilePath)) {
      throw new Error(`${this.metadataFilePath} does not exist.`);
    }
    if (!fs.existsSync(this.describedFileOrLinkFilePath)) {
      throw new Error(`${this.describedFileOrLinkFilePath} does not exist.`);
    }
  }
  // Rename the file and change any internal references to the name.
  // Must be called *before* renaming the parent folder.
  public updateNameBasedOnNewFolderName(newFolderName: string) {
    const hasSeparateMetaDataFile =
      this.metadataFilePath !== this.describedFileOrLinkFilePath;
    //was: if (hasSeparateMetaDataFile && fs.existsSync(this.metadataFilePath)),
    // but the file might not have been saved yet... we still need to change the
    // path so that it points to somewhere in the newly renamed folder.
    if (hasSeparateMetaDataFile) {
      this.metadataFilePath = this.internalUpdateNameBasedOnNewFolderName(
        this.metadataFilePath,
        newFolderName
      );
      // this.metadataFilePath = this.updateFolderOnly(
      //   this.metadataFilePath,
      //   newFolderName
      // );
    }
    this.describedFileOrLinkFilePath = this.internalUpdateNameBasedOnNewFolderName(
      this.describedFileOrLinkFilePath,
      newFolderName
    );
    // this.describedFilePath = this.updateFolderOnly(
    //   this.describedFilePath,
    //   newFolderName
    // );
    if (!hasSeparateMetaDataFile) {
      this.metadataFilePath = this.describedFileOrLinkFilePath;
    }
    this.setFileNameProperty();
  }
  public updateRecordOfWhatFolderThisIsLocatedIn(newFolderName: string) {
    const hasSeparateMetaDataFile =
      this.metadataFilePath !== this.describedFileOrLinkFilePath;
    if (hasSeparateMetaDataFile) {
      this.metadataFilePath = this.updateFolderOnly(
        this.metadataFilePath,
        newFolderName
      );
    }
    this.describedFileOrLinkFilePath = this.updateFolderOnly(
      this.describedFileOrLinkFilePath,
      newFolderName
    );
    if (!hasSeparateMetaDataFile) {
      this.metadataFilePath = this.describedFileOrLinkFilePath;
    }
  }

  private setFileNameProperty() {
    this.properties.setText(
      "filename",
      Path.basename(this.describedFileOrLinkFilePath)
    );
  }
  /* ----------- Change Detection -----------
    Enhance: move to its own class
  */

  private watchForChangeDisposer: mobx.IReactionDisposer;

  //does this need to be saved?
  private dirty: boolean;

  private clearDirty() {
    this.dirty = false;
    //console.log("dirty cleared " + this.metadataFilePath);
  }

  private changed() {
    if (this.dirty) {
      //console.log("changed() but already dirty " + this.metadataFilePath);
    } else {
      this.dirty = true;
      //console.log(`Changed and now dirty: ${this.metadataFilePath}`);
    }
  }
  public wasChangeThatMobxDoesNotNotice() {
    this.changed();
  }

  public recomputedChangeWatcher() {
    if (this.watchForChangeDisposer) {
      this.watchForChangeDisposer();
    }
    // It's important to do this *after* all the deserializing, so that we don't count the deserializing as a change
    // and then re-save, which would make every file look as if it was modified today.
    // And we also need to run it even if the meta file companion doesn't exist yet for some file, so that
    // we'll create it if/when some property gets set.
    this.watchForChangeDisposer = mobx.reaction(
      // Function to check for a change. Mobx looks at its result, and if it is different
      // than the first run, it will call the second function.
      // IMPORTANT! the only change it can see is what gets into the xml result. Mobx is *not* looking at access here. So if a
      // field is not written (because it is blank), this is not going to detect that the field was added or removed.
      () => {
        return this.getXml(true);
      },
      // Function fires when a change is detected
      () => this.changed()
    );
  }

  public getIconPath(): string {
    // if (this.getStatusOfThisFile().missing) {
    //   return locate("assets/warning.png");
    // }
    const type = this.getTextProperty("type", "unknowntype");
    const typesWeHaveIconsFor = [
      "Audio",
      "Video",
      "Image",
      "ELAN",
      "Person",
      "Session"
    ];
    if (!typesWeHaveIconsFor.includes(type)) {
      return `assets/file-icons/generic.png`;
    }
    return `assets/file-icons/${type}.png`;
  }

  /**
   * Return core name of the file modified to indicate the given role
   *
   * @param roleName e.g. "consent"
   */
  private getCoreNameWithRole(roleName: string): string {
    const directoryPortion = Path.dirname(this.metadataFilePath);
    const directoryName = Path.basename(directoryPortion);
    return directoryName + "_" + roleName;
  }
  private tryToRenameToFunction(roleName: string): boolean {
    sentryBreadCrumb(
      `Rename for function ${roleName} (${this.describedFileOrLinkFilePath})`
    );
    if (this.tryToRenameBothFiles(this.getCoreNameWithRole(roleName))) {
      return true;
    }
    return false;
  }

  public static getNameWithoutLinkExtension(path: string) {
    //remove the link extension if it's there
    return trimSuffix(path, kLinkExtensionWithFullStop);
  }

  public tryToRenameBothFiles(newCoreName: string): boolean {
    assert(
      this.metadataFilePath !== this.describedFileOrLinkFilePath,
      "this method is not for renaming the person or session files"
    );

    this.save();
    const possibleLinkExtension = this.isLinkFile()
      ? kLinkExtensionWithFullStop
      : "";
    const originalFileName = this.describedFileOrLinkFilePath.replace(
      kLinkExtensionWithFullStop,
      ""
    );
    const originalFileExtension = Path.extname(originalFileName);
    const newDescribedFilePath = Path.join(
      Path.dirname(this.describedFileOrLinkFilePath),
      newCoreName + originalFileExtension + possibleLinkExtension
    );

    const newMetadataFilePath =
      newDescribedFilePath.replace(kLinkExtensionWithFullStop, "") + ".meta";

    const cannotRenameBecauseExists = t`Renaming failed because there is already a file with that name.`;

    if (fs.existsSync(newDescribedFilePath)) {
      NotifyWarning(`${cannotRenameBecauseExists} (${newDescribedFilePath})`);
      return false;
    }
    if (fs.existsSync(newMetadataFilePath)) {
      NotifyWarning(`${cannotRenameBecauseExists} (${newMetadataFilePath})`);
      return false;
    }

    sentryBreadCrumb(
      `Attempting rename from ${this.metadataFilePath} to ${newMetadataFilePath}`
    );

    try {
      PatientFS.renameSyncWithNotifyAndRethrow(
        this.metadataFilePath,
        newMetadataFilePath
      );
    } catch (err) {
      return false;
    }
    sentryBreadCrumb(
      `Attempting rename from ${this.describedFileOrLinkFilePath} to ${newDescribedFilePath}`
    );

    try {
      PatientFS.renameSyncWithNotifyAndRethrow(
        this.describedFileOrLinkFilePath,
        newDescribedFilePath,
        this.type
      );
    } catch (err) {
      // oh my. We failed to rename the described file. Undo the rename of the metadata file.
      try {
        PatientFS.renameSyncWithNotifyAndRethrow(
          newMetadataFilePath,
          this.metadataFilePath
        );
      } catch (err) {
        // oh boy. in danger of losing this data, especially since something might want to come along and clean up because it looks like a zombie file now
        // that its name does not match a core file.
        // try and just copy it over
        try {
          PatientFS.copyFileSync(newMetadataFilePath, this.metadataFilePath);
        } catch (err) {
          try {
            PatientFS.copyFileSync(
              newMetadataFilePath,
              Path.join(this.metadataFilePath, ".maybeLostInfoHere")
            );
          } catch (e) {
            // ok this is getting stupid. just fall through.
          }
          ShowMessageDialog({
            title: `Error`,
            text: `During the failed rename, the meta file got renamed and lameta can't seem to get it back to its original name. The `,
            buttonText: "OK"
          });
        }
      }
      return false;
    }
    this.describedFileOrLinkFilePath = newDescribedFilePath;
    this.metadataFilePath = newMetadataFilePath;
    this.setFileNameProperty();
    return true;
  }

  public isLabeledAsConsent(): boolean {
    return this.describedFileOrLinkFilePath.indexOf("Consent") > -1;
  }
  public canRenameForConsent(): boolean {
    return !(this.isLabeledAsConsent() || this.isOnlyMetadata());
  }
  public renameForConsent() {
    assert(!this.isOnlyMetadata());
    assert(!this.isLabeledAsConsent());

    if (!this.tryToRenameToFunction("Consent")) {
      NotifyWarning(`${getCannotRenameFileMsg()}`);
    }
  }
}

export class OtherFile extends File {
  constructor(
    path: string,
    customFieldRegistry: CustomFieldRegistry,
    partialLoadWhileCopyingInThisFile?: boolean
  ) {
    // we want "foo.mp3.meta", not "foo.mp3.link.meta"
    const r = path.replace(kLinkExtensionWithFullStop, "");
    super(path, r + ".meta", "Meta", false, ".meta", true);

    this.customFieldNamesRegistry = customFieldRegistry;

    if (partialLoadWhileCopyingInThisFile) {
      this.copyInProgress = true;
      // caller should call  finishLoading() if the file already exists, or after copying completes
    } else {
      this.finishLoading();
    }
  }

  public static CreateLinkFile(
    pathToOriginalFile: string,
    customFileRegistry: CustomFieldRegistry,
    destinationFolderPath: string
  ) {
    const mediaFolderPath = getMediaFolderOrEmptyForThisProjectAndMachine();
    if (!mediaFolderPath)
      throw new Error(
        "CreateLinkFile called but there is no known MediaFolder"
      );
    if (!fs.existsSync(mediaFolderPath))
      throw new Error(
        `CreateLinkFile called but the MediaFolder "${mediaFolderPath}" does not exist.`
      );
    const pathRelativeToRoot = Path.relative(
      mediaFolderPath!,
      pathToOriginalFile
    );
    const pathToLinkFile = Path.posix.join(
      destinationFolderPath,
      Path.basename(pathToOriginalFile + kLinkExtensionWithFullStop)
    );
    fs.writeFileSync(pathToLinkFile, pathRelativeToRoot, "utf-8");
    return new OtherFile(pathToLinkFile, customFileRegistry, false);
  }
}

// for a given attribute the xml parser will give us an object if there is one child, or an array if there are multiple
// This will give [] if x null or undefined (but not empty string), [x] if x is an object, or x if x is already an array
export function ensureArray(x: any): any[] {
  if (x === null || x === undefined) return [];
  return Array.isArray(x) ? x : [x];
}

export function getStandardMessageAboutLockedFiles(): string {
  return (
    " " + // add space because this will always follow another message
    t`File locking can happen when a media player is holding on to a video file. It can also be caused by anti-virus or file synchronization. If the problem continues, please restart lameta and try again.`
  );
}

/// Note _.trimEnd means something different! (it matches from a list of chars,
/// not a whole string). https://github.com/lodash/lodash/issues/2578
function trimSuffix(toTrim: string, trim: string): string {
  if (!toTrim || !trim) {
    return toTrim;
  }
  const index = toTrim.lastIndexOf(trim);
  if (index === -1 || index + trim.length !== toTrim.length) {
    return toTrim;
  }
  return toTrim.substring(0, index);
}
