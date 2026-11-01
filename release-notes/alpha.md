## Highlights

- lameta now checks your metadata against your archive's rules while you work, and again when you export. A Problems panel lists anything that the archive would reject, and clicking a problem takes you to the field. ELAR is the first archive whose rules lameta checks.
- lameta now works better with projects that OneDrive, Dropbox, iCloud Drive or a similar service keeps in sync.
- lameta now reads many more kinds of awkward data without failing, including projects that came from SayMore.

## All improvements

- The Problems panel
  - lameta now checks your metadata against your archive's rules while you work, and again when you export. The Problems panel lists anything that the archive would reject. ELAR is the first archive whose rules lameta checks.
  - Besides your archive's rules, lameta now checks every project for a session that has no files to export, a session that has no contributors, a language that sessions call by different names, and a contributor who has no consent file.
  - The top of the Problems panel now says which checks are running: "ELAR Checks" when your archive adds checks of its own, and "Baseline Checks" when lameta runs only its own.
  - Clicking a problem now takes you to the file and the field that it is about. For a missing translation of a role or a genre, it takes you to its row on Project > Translations.
  - ELAR's requirement for English among the metadata languages is now reported once, on the project.
  - If lameta couldn't check everything that your archive requires, and the archive would reject the project, export now stops.
  - Typing is now faster, because lameta doesn't check for problems or redraw the Problems panel as you type.
- Export
  - The IMDI export for ELAR now writes fields with the capitalization that ELAR requires.
  - Exported files and folders now get names that Windows and the archive accept.
  - Exported IMDI and OPEX files now leave out lameta's own comments.
  - Adding a session no longer makes every session's IMDI need exporting again.
- lameta now works better with projects that OneDrive, Dropbox, iCloud Drive or a similar service keeps in sync.
- When Add Files turns down a file, it now names the file and tells you why.

## All fixes

- Fewer failures when opening a project or quitting lameta
  - lameta now opens a project even when some of its metadata files can't be read. The beta already does this for session and person files.
  - Quitting lameta now closes it completely. It could keep running in the background with no window, and the next time you started it you saw "A JavaScript error occurred in the main process".
- Better handling of unusual data, such as projects from SayMore
  - Badly formed multilingual text is now read as plain text instead of causing an error.
  - lameta now treats two person names as the same when they differ only in spacing or in how accented letters are stored.
  - In projects from SayMore, lameta now reads the role in a participant's "name (role)", and a language that SayMore stored as a name exports as that name.
  - lameta now keeps contributors even when their name or role is missing.
  - A custom field with the same name as one of lameta's own fields now keeps its value.
  - A status that isn't in the list now shows the warning icon.
  - A birth year later than the recording date no longer gives a negative age.
- Export
  - RO-Crate export now leaves out missing files and warns you about them, encodes "%" in IDs, and gives no license to documents whose access isn't set.
  - CSV export now puts the contributions cell in quotation marks.
  - IMDI export now trims spaces from the ends of values.
  - A person whose consent file link was deleted is now left out of the consent documents.
- Your local time instead of UTC
  - The files inside a CSV export zip now have your local time, not UTC.
  - Each run in the log file now starts with your local date.
- On Windows, you can now copy a file into a project even when its path is long or its name ends in a dot.
- lameta no longer closes the project when the folder of a session or a person disappears while the project is open, as when OneDrive applies a rename that someone made on another computer. lameta tells you once that it can't save that folder, and you can keep working on the rest of the project.
