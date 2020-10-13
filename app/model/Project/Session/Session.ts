import { Folder } from "../../Folder/Folder";
import { File, Contribution } from "../../file/File";
import * as Path from "path";
import { FolderMetadataFile } from "../../file/FolderMetaDataFile";
import { CustomFieldRegistry } from "../CustomFieldRegistry";
import knownFieldDefinitions from "../../field/KnownFieldDefinitions";
import { Project } from "../Project";
import { sanitizeForArchive } from "../../../fileUtilities";
import { titleCase } from "title-case";
import userSettingsSingleton from "../../../UserSettings";

export class Session extends Folder {
  public get /*override*/ metadataFileExtensionWithDot(): string {
    return ".session";
  }

  public get displayName(): string {
    return (
      this.properties.getTextStringOrEmpty("title") ||
      this.properties.getTextStringOrEmpty("id") ||
      "unknown"
    );
  }

  public constructor(
    directory: string,
    metadataFile: File,
    files: File[],
    customFieldRegistry: CustomFieldRegistry
  ) {
    super(directory, metadataFile, files, customFieldRegistry);
    // we used to not store the name, relying instead on the folder name.
    // However that made it impossible to record someone's actual name if it
    // required, for example, unicode characters.
    if (this.properties.getTextStringOrEmpty("id") === "") {
      this.properties.setText("id", Path.basename(directory));
    }
    this.safeFileNameBase = sanitizeForArchive(
      this.properties.getTextStringOrEmpty("id"),
      userSettingsSingleton.IMDIMode
    );
    this.knownFields = knownFieldDefinitions.session; // for csv export

    // default to the project's content language
    if (this.properties.getTextStringOrEmpty("languages") === "") {
      this.properties.setText(
        "languages",
        Project.getDefaultContentLanguageCode()
      );
    }

    // default to the project's working language
    if (this.properties.getTextStringOrEmpty("workingLanguages") === "") {
      this.properties.setText(
        "workingLanguages",
        Project.getDefaultWorkingLanguageCode()
      );
    }
    this.migrateDeprecatedFields();
  }

  // There are 2 fields that ELAR wanted removed. These work as part of the description,
  // so we just append them to the description.
  private migrateDeprecatedFields() {
    this.migrateOneField("situation", "description");
    this.migrateOneField("setting", "description");
  }
  private migrateOneField(migrationSource, migrationTarget) {
    const valueToMove = this.properties
      .getTextStringOrEmpty(migrationSource)
      .trim();
    if (valueToMove.length > 0) {
      const currentTargetValue = this.properties
        .getTextStringOrEmpty(migrationTarget)
        .trim();
      const newTargetValue = `${currentTargetValue} ${titleCase(
        migrationSource
      )}: ${valueToMove}`.trim();
      //console.log(`After migration '${migrationTarget}' = '${newTargetValue}'`);
      this.properties.setText(migrationTarget, newTargetValue);
      this.properties.remove(migrationSource);
    }
  }
  public static fromDirectory(
    directory: string,
    customFieldRegistry: CustomFieldRegistry
  ): Session {
    const metadataFile = new SessionMetadataFile(
      directory,
      customFieldRegistry
    );
    //metadataFile.addTextProperty("status", "", /*persist*/ true, false, false);

    const files = this.loadChildFiles(
      directory,
      metadataFile,
      customFieldRegistry
    );

    //start autosave mobx.autorunAsync(() => this.save(),    10 * 1000 /* min 10 seconds in between */  );

    const session = new Session(
      directory,
      metadataFile,
      files,
      customFieldRegistry
    );
    session.handleLegacyParticipants();
    return session;
  }

  // Old versions of both SayMore and lameta had a "participants" field that didn't give a way to say what
  // the roles of the participants are. All current versions still can read this in, and lameta (at least)
  // still emits it to the xml. But it has been superseded by a normal <contributions> element, just like
  // we had previously for individual files. This method checks the <participants> for any contributions that
  // we might be missing in <contributions>.
  private handleLegacyParticipants() {
    const legacyParticipantNames = this.properties
      .getTextStringOrEmpty("participants")
      .split(";")
      .map((s) => s.trim());
    legacyParticipantNames.forEach((name: string) => {
      if (
        !this.metadataFile!.contributions.find(
          (c) => c.personReference === name
        )
      ) {
        this.metadataFile!.contributions.push(
          new Contribution(name, "participant", "", "")
        );
      }
    });
    // Now empty it out. We don't use it in the UI. We will however reconstruct it when saving, so that it
    // is there in case an older saymore tries to read this.
    this.properties.setText("participants", "");
  }

  // override
  protected textValueThatControlsFolderName(): string {
    return this.properties.getTextStringOrEmpty("id").trim();
  }

  public get hasMoreFieldsTable(): boolean {
    return true;
  }
  public get hasCustomFieldsTable(): boolean {
    return true;
  }

  // A note about name vs. ID. Here "ID" may be the name or the code, since
  // the rule we inherited from SM Classic is that if a Person has something
  // in the "code" field, then that acts as the display name and id around
  // the whole system.
  public updateSessionReferencesToPersonWhenIdChanges(
    oldId: string,
    newId: string
  ): void {
    const oldNameNormalized = this.normalizeNameReference(oldId);
    this.files.forEach((f) =>
      f.contributions
        .filter(
          (c) =>
            this.normalizeNameReference(c.personReference) === oldNameNormalized
        )
        .forEach((c) => (c.personReference = newId))
    );

    //In addition to being listed in the contributors list for one of the constituent files,
    // people can also be listed as a "participant" of the session. THis is messy part of the
    // model that we inherited from SayMore classic.

    // const updatedArrayOfNames = this.getParticipantNames().map(p =>
    //   this.normalizeNameReference(p) === oldNameNormalized ? newId : p
    // );
    // this.setParticipantNames(updatedArrayOfNames);
  }

  private normalizeNameReference(name: string) {
    return name.toLowerCase();
  }
  // Note: some of these contributions are currently created on the fly,
  // so this is not the right way to make changes to them (e.g. name updates)
  public getAllContributionsToAllFiles(): Contribution[] {
    const contributionsToList = new Array<Contribution>();

    this.files.forEach((f) =>
      f.contributions.forEach((c) => {
        if (
          c.personReference &&
          c.personReference.trim().length > 0 /*&& c.role && c.role.length > 0*/
        ) {
          // If a person has multiple roles, we list them once for each role. But if
          // the roles are the same, then we don't list them again.
          if (
            !contributionsToList.some(
              (existingContribution) =>
                existingContribution.personReference.toLowerCase() ===
                  c.personReference.toLowerCase() &&
                existingContribution.role === c.role
            )
          ) {
            contributionsToList.push(c);
          }
        }
      })
    );

    //In addition to being listed in the contributors list for one of the constituent files,
    // people can also be listed as a "participant", which until we tighten up the semantics,
    // we will take to mean a "speaker".
    // this.getParticipantNames().forEach((name: string) => {
    //   if (
    //     name.trim().length > 0 &&
    //     // possibly they are already listed in the contributions
    //     !contributionsToList.some(
    //       x =>
    //         x.personReference.toLowerCase() === name.toLocaleLowerCase() &&
    //         x.role === "speaker"
    //     )
    //   ) {
    //     // 'speaker' is obviously not right for sessions that aren't about
    //     // speaking... but at the moment that's what SayMore classic
    //     // assumes, so we don't have another way of knowing from this
    //     // list what they contributed; they need to show up as a
    //     // contributor to one of our constituent file. This may
    //     // change; we could get rid of "participants" and just let
    //     // the session itself have a "contributors" list
    //     contributionsToList.push(new Contribution(name, "speaker", "", ""));
    //   }
    // });
    //console.log("contributionsToList:" + JSON.stringify(contributionsToList));
    return contributionsToList;
  }
  // public getParticipantNames(): string[] {
  //   return this.properties
  //     .getTextStringOrEmpty("participants")
  //     .split(";")
  //     .map(s => s.trim());
  // }

  // we no longer use "participants" except when serializing for legacy versions of SayMore(x) out there

  public getLanguageCodes(fieldKey: string): string[] {
    return this.properties
      .getTextStringOrEmpty(fieldKey)
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  public getWorkingLanguageCodes(): string[] {
    return this.getLanguageCodes("workingLanguages");
  }
  public getSubjectLanguageCodes(): string[] {
    return this.getLanguageCodes("languages");
  }

  // private setParticipantNames(names: string[]) {
  //   this.properties.setText("participants", names.join(";"));
  // }
}

export class SessionMetadataFile extends FolderMetadataFile {
  constructor(directory: string, customFieldRegistry: CustomFieldRegistry) {
    super(
      directory,
      "Session",
      true,
      ".session",
      knownFieldDefinitions.session,
      customFieldRegistry
    );
    /* I'm not needing it now, but here is an example of how to see what is changing
    a property. Set a breakpoint where the console.log is, look at the call stack,
    and you're done.

    const thingGettingChangedMysteriously = this.getTextField("status")
      .textHolder.map;
    mobx.observe(thingGettingChangedMysteriously, (change: any) => {
      console.log(`** status  '${change.oldValue}' --> '${change.newValue}'`);
    });*/
  }
}
