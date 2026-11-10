## Highlights

- Contributors whose names don't match anyone on the People tab are marked with a "?", and you can choose their names again in other files.
- lameta now copes much better when OneDrive, Dropbox or a similar program is holding the project's files, especially when you rename sessions and people.
- File and folder names are now kept to plain ASCII characters with no spaces. lameta marks older files that break this rule and can rename them for you.
- lameta now runs on Macs with Apple silicon as well as on Intel Macs.

## All improvements

- Contributors who aren't on the People tab
  - When you type a contributor's name that doesn't match anyone on the People tab, lameta now shows a "?" next to it. The mark also appears in lists of contributors and in the list of names to choose from.
  - Once you have typed such a name, you can now choose it from the list in other files.
- Names of files, folders and sessions
  - lameta now always keeps file and folder names to plain ASCII characters with no spaces. Files that were added earlier and break that rule are marked, and each one has a button that renames it for you.
  - A session ID can no longer contain spaces. The Session ID field tells you when it does, and IMDI export replaces any spaces with underscores.
- Export
  - There is a new genre, "Collection description".
  - The "IMDI files only" export now includes ConsentDocuments.imdi.
- lameta now runs on Macs with Apple silicon as well as on Intel Macs.
- The Full Name field on the People tab now tells you about problems.
- Updated translations of lameta's interface, especially in Spanish and Portuguese.

## All fixes

- Renaming a session or person now works more reliably when OneDrive, Dropbox or a similar program is holding the project's files. lameta can't prevent every problem that these programs cause, but it notices more of them, and in some cases it can repair the project.
- The date picker
  - The date picker no longer shows the day before the one you picked when your computer is set to a time zone east of London.
  - You can now clear a date completely with the date picker.
- lameta no longer warns about person codes and contributions when nothing is wrong.
- lameta now leaves the capitalization of keywords, topics and person codes as you typed it.
- IMDI export now writes genres and actor roles in sentence case, with spaces between the words.
- New sessions and people now start out named "new_session1" and "new_person1".
- lameta can now read the details of audio and video files on Macs with Apple silicon.
