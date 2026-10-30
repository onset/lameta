## Highlights

- You can now choose settings for the archive you deposit with, such as ELAR, AILLA or PARADISEC. lameta then shows the fields, choices and file name rules that the archive expects, and tells you which fields it requires.
- Fields can now hold text in more than one language, each in its own box. If your project already keeps several languages in one field, separated by slashes, lameta can convert that text for you.
- A search box on the Sessions and People tabs now narrows the list to the items that contain what you type.
- lameta can now export an RO-Crate, with a web page that anyone can open to see what the project contains.
- A project can now have more than one subject language and more than one working language.
- Large projects now open 12 times faster, and IMDI export is much faster.
- The beta now installs as "lameta beta", alongside the regular version of lameta, and has its own settings.

## All improvements

- Your archive's settings
  - You can now choose settings for the archive you deposit with: ELAR, AILLA, PARADISEC, TLA, REAP, ANLA or AILCA. An archive's settings can change which fields lameta shows, the vocabularies, the rules for file names, the access choices and what IMDI must contain.
  - Each field now shows whether your archive requires it, whether it may hold personal information, and whether it goes into IMDI.
  - When a file's name breaks your archive's rules, lameta now says so and offers a button that fixes the name.
  - For ELAR, the wording, tooltips and field tips now match what ELAR asks for, and the list of continents has "Americas" in place of North, Middle and South America.
- Text in more than one language
  - Your archive's settings now decide which fields can hold text in more than one language, and which IMDI schema lameta checks against. ELAR uses a draft IMDI 3.0 schema that allows multilingual fields.
  - In a multilingual text field, each language now has its own box, with a hint that says which language goes there. Text whose language lameta doesn't know is marked.
  - A new Metadata Languages list on the Project tab sets the order of the language boxes in multilingual fields.
  - lameta can now convert fields that hold several languages separated by slashes, so that it knows which language each part is in. It waits until you have checked that every field has the same languages in the same order, and guides you through the steps.
  - In a field where you pick from a list, you can now hover over the field to see the translations that export will use. If one is missing, the field shows a warning icon, and its tooltip links to the place where you can add the translation.
  - You can now enter translations of genres and roles, and of the standard titles and descriptions that IMDI export gives project documents and consent documents.
- The Project tab
  - The fields are now grouped under Collection, Funding Project, Languages and Location. The project's name and its title are separate fields.
  - A project can now have more than one subject language and more than one working language.
  - Each subject language that isn't in lameta's list now gets its own code from the private-use range qaa to qtz.
  - You can now set the access level of project documents.
- Export
  - File > Export Project can now make an RO-Crate, a standard way of packaging research data with its metadata, following the LDAC profile. It writes ro-crate-metadata.json in the project folder, along with ro-crate-preview.html, a page that anyone can open in a browser to see what the project contains.
  - IMDI export is now much faster. It shows its progress, and you can cancel it. Warnings and errors appear in a box that you can scroll and copy from.
  - IMDI export now writes an approximate year such as "~1960" as "1959/1961", which IMDI accepts, and writes a birth date of "?" as "Unspecified".
  - IMDI export now gives .srt files the type "subtitles", includes the gender "Other", and adds the collection steward as an actor on project documents.
- On the Sessions and People tabs, a search box now narrows the list to the items that contain what you type, and shows how many there are. It searches the metadata, the names of files, contributions, notes and status.
- Large projects now open 12 times faster, and lameta shows its progress while a large project opens.
- lameta now shows PDF and TIFF files itself.
- lameta now checks spelling in English, French, German, Indonesian, Portuguese and Spanish.
- Right-clicking in a text field now gives you Cut, Copy, Paste and the other usual commands.
- lameta now saves a session, person or project file by writing a new copy and then putting it in place of the old one, so an interrupted save no longer leaves an empty file.
- The beta now installs as "lameta beta", with its own settings, alongside the regular version of lameta. The first time it starts, it takes over the settings of any older beta that was installed as "lameta", and then removes that older beta.

## All fixes

- Fewer failures when opening and saving projects
  - lameta now opens a project even when one of its session or person files is empty or can't be read. That session or person stays in the list with a mark, and lameta leaves its file alone.
  - If the project folder is moved, renamed or deleted while lameta has it open, lameta now closes the project instead of crashing.
  - A new person's name is now saved as soon as you add the person.
  - If you delete several sessions or people and some of them can't be deleted, those now stay in the list.
  - lameta now ignores the hidden "._" files that macOS puts on some drives.
- Export and import
  - Export now works when the project title contains characters that file names can't have, such as : or ?.
  - IMDI export now writes language codes and names correctly, and always uses three-letter ISO 639-3 codes.
  - IMDI export now writes multilingual text correctly, including text that came in through a spreadsheet import.
  - IMDI export now writes some genres and roles correctly that it used to get wrong.
  - IMDI export now includes Primary Occupation.
  - A linked file whose .link file was deleted now shows as missing, and IMDI export skips it instead of failing.
  - CSV export now writes line breaks correctly and handles values that contain quotation marks.
  - OPEX export now passes its schema check.
  - Spreadsheet import now reads access codes correctly, and no longer brings in folders that lameta found problems with.
- Choosing languages
  - You can now add a language that isn't in lameta's list, and choose a language again straight after removing it.
  - Languages now appear with their names instead of their codes.
- People and contributions
  - You can now edit the comments on contributions, and click into an empty Notes tab and start typing.
  - Adding a contribution now works when some contributors aren't on the People tab yet.
  - Two people whose IDs differ only in capitalization no longer cause trouble.
- Fixes for people who use lameta in a language other than English
  - Field labels, choices and tips now appear in your interface language. Portuguese and Chinese users have their translated interface back.
  - lameta now starts even when one of its translation files is missing, and uses English instead.
- Selecting an audio or video file no longer gives an error about ffprobe.
- On macOS, the app's name no longer appears as "lameta ${version}".
- A custom field with "date" in its name is no longer treated as a date, so lameta keeps its text.
