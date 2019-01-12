import * as xml2js from "xml2js";
import * as fs from "fs";
import * as Path from "path";
const filesize = require("filesize");
import * as mobx from "mobx";
import assert from "assert";
const camelcase = require("camelcase");
import { Field, FieldType, FieldDefinition } from "../field/Field";
import { FieldSet } from "../field/FieldSet";
import { locate } from "../../crossPlatformUtilities";
import moment from "moment";
import getSayMoreXml from "./GetSayMoreXml";
import { CustomFieldRegistry } from "../Project/CustomFieldRegistry";
const knownFieldDefinitions = require("../field/fields.json");
const titleCase = require("title-case");

export class Contribution {
  //review this @mobx.observable
  @mobx.observable
  public personReference: string; // this is the contributor
  @mobx.observable
  public role: string;
  @mobx.observable
  public date: string;
  @mobx.observable
  public comments: string;
  public sessionName: string; // not persisted; just used by the UI when listing contributions for a person

  public constructor(
    personReference: string,
    role: string,
    date: string,
    comments: string
  ) {
    this.personReference = personReference;
    this.role = role;
    this.date = date;
    this.comments = comments;
  }
}

export /*babel doesn't like this: abstract*/ class File {
  // can be changed to Session, Project, or Person in constructor
  //protected xmlRootName: string = "MetaData";

  // In the case of folder objects (project, session, people) this will just be the metadata file,
  // and so describedFilePath === metadataPath.
  // In all other cases (mp3, jpeg, elan, txt), this will be the file we are storing metadata about.
  @mobx.observable
  public describedFilePath: string;

  // This file can be *just* metadata for a folder, in which case it has the fileExtensionForFolderMetadata.
  // But it can also be paired with a file in the folder, such as an image, sound, video, elan file, etc.,
  // in which case the metadata will be stored in afile with the same name as the described file, but
  // with an extension of ".meta", as in "banquet.jpg.meta";
  public metadataFilePath: string;

  private xmlRootName: string;
  private doOutputTypeInXmlTags: boolean;
  private fileExtensionForMetadata: string;
  public canDelete: boolean;

  @mobx.observable
  public properties = new FieldSet();

  @mobx.observable
  public contributions = new Array<Contribution>();

  public customFieldNamesRegistry: CustomFieldRegistry;

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
          `Parsing Error: SayMore could not parse "${dateString}" unambiguously, so it will be set to empty. Encountered on ${moment(
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
    this.canDelete = canDelete;
    this.describedFilePath = describedFilePath;
    this.metadataFilePath = metadataFilePath;
    this.xmlRootName = xmlRootName;
    this.doOutputTypeInXmlTags = doOutputTypeInXmlTags;
    this.fileExtensionForMetadata = fileExtensionForMetadata;

    // NB: subclasses should call this (as super()), then read in their definitions, then let us finish by calling finishLoading();
  }

  // call this after loading in your definitions
  protected finishLoading() {
    this.addNotesProperty();
    this.addFieldsUsedInternally();
    this.readMetadataFile();
  }

  // These are fields that are computed and which we don't save, but which show up in the UI.
  private addFieldsUsedInternally() {
    this.addTextProperty("filename", "", false);
    this.setFileNameProperty();
    const stats = fs.statSync(this.describedFilePath);
    this.addTextProperty("size", filesize(stats.size, { round: 0 }), false);
    this.addDateProperty("modifiedDate", stats.mtime, false);
    const typePatterns = [
      ["Session", /\.session$/i],
      ["Person", /\.person$/i],
      ["Audio", /\.((mp3)|(wav)|(ogg))$/i],
      ["Video", /\.((mp4))$/i],
      ["ELAN", /\.((eaf))$/i],
      ["Image", /\.(jpg)|(bmp)|(gif)|(png)/i],
      ["Text", /\.(txt)/i]
    ];
    const match = typePatterns.find(t => {
      return !!this.describedFilePath.match(t[1]);
    });
    const typeName = match
      ? (match[0] as string)
      : Path.extname(this.describedFilePath);
    this.addTextProperty("type", typeName, false);
  }

  private loadPropertiesFromXml(propertiesFromXml: any) {
    const tags = Object.keys(propertiesFromXml);

    for (const tag of tags) {
      if (tag.toLocaleLowerCase() === "contributions") {
        this.loadContributions(propertiesFromXml[tag]);
      }

      // <CustomFields>
      else if (tag.toLowerCase() === "customfields") {
        //        console.log(JSON.stringify(propertiesFromXml[key]));
        const customKeys = Object.keys(propertiesFromXml[tag]);
        for (const customKey of customKeys) {
          // first one is just $":{"type":"xml"}
          if (customKey !== "$") {
            this.loadOnePersistentProperty(
              customKey,
              propertiesFromXml[tag][customKey],
              true // isCustom
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

    // console.log("loadProperties key: " + key);
    // console.log(JSON.stringify(value));
    if (value === undefined) {
      value = "";
    } else if (typeof value === "object") {
      if (
        value.$ &&
        value.$.type &&
        (value.$.type === "string" || value.$.type === "date")
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
      // Since we do not expect and new versions of SayMore Classic,
      // (which could theoretically introduce such a situation),
      // I'm living with that risk.
      Object.keys(knownFieldDefinitions).some((
        area // e.g. project, session, person
      ) =>
        knownFieldDefinitions[area].find(
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
      this.normalizeIncomingDateString(contributionFromXml.date),
      contributionFromXml.comments
    );
    this.contributions.push(n);
  }

  private haveReadMetadataFile: boolean = false;
  public readMetadataFile() {
    if (this.haveReadMetadataFile) {
      console.error("Already read metadataFile of " + this.metadataFilePath);
      return;
    }
    this.haveReadMetadataFile = true;
    //console.log("readMetadataFile() " + this.metadataFilePath);
    if (fs.existsSync(this.metadataFilePath)) {
      const xml: string = fs.readFileSync(this.metadataFilePath, "utf8");

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
            throw err;
          }
          xmlAsObject = result;
        }
      );
      // that will have a root with one child, like "Session" or "Meta". Zoom in on that
      // so that we just have the object with its properties.
      let properties = xmlAsObject[Object.keys(xmlAsObject)[0]];
      if (properties === "") {
        //   Review: This happen if it finds, e.g. <Session/>.
        properties = {};
      }

      //copies from this object (which is just the xml as an object) into this File object
      this.loadPropertiesFromXml(properties);
    }
    this.recomputedChangeWatcher();
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
        this.doOutputTypeInXmlTags,
        doOutputEmptyCustomFields
      );
    } finally {
      this.inGetXml = false;
    }
  }

  public save(forceSave: boolean = false) {
    // console.log("SAVING DISABLED");
    // return;

    if (!forceSave && !this.dirty && fs.existsSync(this.metadataFilePath)) {
      //console.log(`skipping save of ${this.metadataFilePath}, not dirty`);
      return;
    }
    //    console.log(`Saving ${this.metadataFilePath}`);

    const xml = this.getXml(false);

    if (this.describedFilePath.indexOf("sample data") > -1) {
      // console.log(
      //   "PREVENTING SAVING IN DIRECTORY THAT CONTAINS THE WORDS 'sample data'"
      // );
      console.log("WOULD HAVE SAVED THE FOLLOWING TO " + this.metadataFilePath);
      // console.log(xml);
    } else {
      //console.log("writing:" + xml);
      try {
        fs.writeFileSync(this.metadataFilePath, xml);
        this.clearDirty();
      } catch (error) {
        console.log(`File readonly, skipping save: ${this.metadataFilePath}`);
      }
    }
  }

  private getUniqueFilePath(intendedPath: string): string {
    let i = 0;
    let path = intendedPath;
    const extension = Path.extname(intendedPath);
    // enhance: there are pathological file names like "foo.mp3.mp3" where this would mess up.
    const pathWithoutExtension = Path.join(
      Path.dirname(intendedPath),
      Path.basename(intendedPath).replace(extension, "")
    );
    while (fs.existsSync(path)) {
      i++;
      path = pathWithoutExtension + " " + i + extension;
    }
    return path;
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
      // can't think of a strong scenario for this at the moment,
      // but it makes sure the rename will not fail due to a collision
      newPath = this.getUniqueFilePath(newPath);
      fs.renameSync(currentFilePath, newPath);
      return newPath;
    }
    return currentFilePath;
  }
  private updateFolderOnly(path: string, newFolderName: string): string {
    const filePortion = Path.basename(path);
    const directoryPortion = Path.dirname(path);
    const parentDirectoryPortion = Path.dirname(directoryPortion);
    return Path.join(parentDirectoryPortion, newFolderName, filePortion);
  }
  public isOnlyMetadata(): boolean {
    return this.metadataFilePath === this.describedFilePath;
  }
  // Rename the file and change any internal references to the name.
  // Must be called *before* renaming the parent folder.
  public updateNameBasedOnNewFolderName(newFolderName: string) {
    const hasSeparateMetaDataFile =
      this.metadataFilePath !== this.describedFilePath;
    if (hasSeparateMetaDataFile && fs.existsSync(this.metadataFilePath)) {
      this.metadataFilePath = this.internalUpdateNameBasedOnNewFolderName(
        this.metadataFilePath,
        newFolderName
      );
      this.metadataFilePath = this.updateFolderOnly(
        this.metadataFilePath,
        newFolderName
      );
    }
    this.describedFilePath = this.internalUpdateNameBasedOnNewFolderName(
      this.describedFilePath,
      newFolderName
    );
    this.describedFilePath = this.updateFolderOnly(
      this.describedFilePath,
      newFolderName
    );
    if (!hasSeparateMetaDataFile) {
      this.metadataFilePath = this.describedFilePath;
    }
    this.setFileNameProperty();
  }

  private setFileNameProperty() {
    this.properties.setText("filename", Path.basename(this.describedFilePath));
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
      // console.log("changed() but already dirty " + this.metadataFilePath);
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

  public getIconName(): string {
    const type = this.getTextProperty("type", "unknowntype");
    return locate(`assets/file-icons/${type}.png`);
  }

  // We're defining "core name" to be the file name (no directory) minus the extension
  private getCoreName(): string {
    return Path.basename(this.describedFilePath).replace(
      Path.extname(this.describedFilePath),
      ""
    );
  }
  /**
   * Return core name of the file modified to indicate the given role
   *
   * @param roleName e.g. "consent"
   */
  private getCoreNameWithRole(roleName: string): string {
    // TODO: this needs to become a lot more sophisticated
    return this.getCoreName() + "_" + roleName;
  }
  private tryToRenameToFunction(roleName: string): boolean {
    if (this.tryToRenameBothFiles(this.getCoreNameWithRole(roleName))) {
      return true;
    }
    return false;
  }

  public tryToRenameBothFiles(newCoreName: string): boolean {
    assert(
      this.metadataFilePath !== this.describedFilePath,
      "this method is not for renaming the person or session files"
    );

    this.save();
    const newDescribedFilePath = Path.join(
      Path.dirname(this.describedFilePath),
      newCoreName + Path.extname(this.describedFilePath)
    );

    const newMetadataFilePath = newDescribedFilePath + ".meta";

    if (
      fs.existsSync(newDescribedFilePath) ||
      fs.existsSync(newMetadataFilePath)
    ) {
      console.error(
        "Cannot rename: one of the files that would result from the rename already exists."
      );
      return false;
    }
    try {
      fs.renameSync(this.metadataFilePath, newMetadataFilePath);
    } catch (err) {
      return false;
    }
    try {
      fs.renameSync(this.describedFilePath, newDescribedFilePath);
    } catch (err) {
      // oh my. We failed to rename the described file. Undo the rename of the metadata file.
      try {
        fs.renameSync(newMetadataFilePath, this.metadataFilePath);
      } catch (err) {
        return false;
      }
      return false;
    }
    this.describedFilePath = newDescribedFilePath;
    this.metadataFilePath = newMetadataFilePath;
    this.setFileNameProperty();
    return true;
  }

  public isLabeledAsConsent(): boolean {
    return this.describedFilePath.indexOf("Consent") > -1;
  }
  public canRenameForConsent(): boolean {
    return !(this.isLabeledAsConsent() || this.isOnlyMetadata());
  }
  public renameForConsent() {
    assert(!this.isOnlyMetadata());
    assert(!this.isLabeledAsConsent());
    if (!this.tryToRenameToFunction("Consent")) {
      window.alert("Sorry, something prevented the rename");
    } else {
      console.log("renameForConsent " + this.describedFilePath);
    }
    //this.properties.setValue("hasConsent", true);
  }
}

export class OtherFile extends File {
  constructor(path: string, customFieldRegistry?: CustomFieldRegistry) {
    super(path, path + ".meta", "Meta", false, ".meta", true);
    if (customFieldRegistry) {
      this.customFieldNamesRegistry = customFieldRegistry;
    }
    this.finishLoading();
  }
}
