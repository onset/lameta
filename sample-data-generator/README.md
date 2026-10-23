# Sample Data Generator for Lameta

This tool generates comprehensive sample data for the Lameta language documentation system. It creates realistic language documentation projects that demonstrate all of Lameta's features and provide educational examples for users.

## Purpose

Sample data should showcase Lameta's full capabilities including:

- Complex metadata with custom fields
- Proper people-to-session linking via contributions
- Diverse session types and genres
- Cultural and linguistic authenticity (even if fictional)
- Media files with detailed metadata
- Complete field population for testing and demonstration

The generator creates playful but respectful fictional people groups with rich cultural contexts, avoiding real cultural appropriation while providing realistic examples.

## Torture project

`torture/generate-torture-project.ts` writes a different kind of project: one meant to turn up bugs. It is a documentation project of interviews with abstract artists (all invented), about 950 sessions and 260 people, and among them every case that has hurt lameta or plausibly could: non-ASCII, right-to-left and emoji names, names that collide once sanitized, long paths, private-use and deprecated language codes, every genre, role and access value of every archive configuration, people referenced by name and by code, missing people and consent, files of every type with and without `.meta`, misnamed metadata files, files from SayMore and old lameta versions, broken media, and values that ELAR's rules report. The project's `OtherDocuments/torture-cases.md` lists each case, why it is there, and the code it aims at.

Run it with Node (`tsx`), not Bun: Bun opens plain Windows paths through Win32 name parsing, which sends a file named `nul` to the null device.

```bash
pnpm run make-torture-project "D:/somewhere/Interviews with Abstract Artists ŋ"
```

The `.sprj` takes the name of the folder. It writes the same bytes on every run, except that files made by ffmpeg can differ between ffmpeg versions. It refuses to write into a folder that is not empty unless it made that folder; when it did, a new run deletes everything in it except `Sessions/BIG_media`, so keep nothing of your own there.

| Option                                     | Adds                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (none)                                     | Only names that git can check out on Windows, macOS and Linux. This version is committed in `sample data/Interviews with Abstract Artists ŋ` (where lameta never saves).                                                                                                                                                                         |
| `--hostile-names`                          | NFC and NFD spellings of one name, trailing dots and spaces, Windows device names (`CON`, `aux.txt`, `COM1`), paths over 260 characters. Never commit these; OneDrive and Explorer cannot handle some of them.                                                                                                                                   |
| `--blocking`                               | Files that stop the whole project from loading (zero-byte, truncated or UTF-16 metadata, a newer `minimum_lameta_version_to_read`), custom fields whose names contain "date" (they stop every session from saving), and the old slash form of multilingual text (it blocks IMDI export). Each hides the other cases, so test them one at a time. |
| `--large-media`                            | About 1.9 GB in `Sessions/BIG_media`: a playable 1 GB 1080p video, a 500 MB WAV, the first 300 MB of the video, 50 MB of random bytes named `.mp4`, and zero-byte files. Needs ffmpeg on the PATH or in `node_modules/ffmpeg-ffprobe-static`. Files already there at full size are kept on the next run.                                         |
| `--archive-config <name>`                  | The archive configuration in the `.sprj` (default `ELAR`).                                                                                                                                                                                                                                                                                       |
| `--bulk-sessions <n>`, `--bulk-people <n>` | The size of the ordinary part of the project (default 800 and 240).                                                                                                                                                                                                                                                                              |
| `--size <n>`                               | `n` bulk sessions and people at 30% of that, so that the same project can be made at several sizes.                                                                                                                                                                                                                                              |
| `--no-cases`                               | Leaves out the hand-made cases, so that the project holds only the bulk part.                                                                                                                                                                                                                                                                    |

`src/export/tortureProject.manual.spec.ts` loads a generated project and runs every exporter over it, recording each exception and notification in a `report.json`, together with the values that saving each file would lose:

```bash
LAMETA_TORTURE_DIR="<project folder>" LAMETA_TORTURE_OUT="<output folder>" vp test run src/export/tortureProject.manual.spec.ts
```

### Measuring how lameta scales

`src/model/Project/ScalingCounts.spec.ts` (in the normal suite) and `e2e/scalingCounts.e2e.ts` build the bulk project at two sizes and assert how many records each user action reads, writes, checks or renders. `src/model/Project/ScalingMeasure.manual.spec.ts` and `e2e/scalingMeasure.e2e.ts` time those actions on projects made with `--size <n> --no-cases`; `e2e/scalingProfile.e2e.ts` records a CPU profile of typing. To make the times look like those of an old laptop, run the model measurements with the CPU capped:

```powershell
pnpm exec tsx sample-data-generator/torture/generate-torture-project.ts D:\perf-projects\elar-1000 --size 1000 --no-cases
.\scripts\measure-scaling-throttled.ps1 -Dirs "D:\perf-projects\elar-1000" -Out C:\temp\scaling-1000.json
$env:LAMETA_SCALING_DIRS="D:\perf-projects\elar-1000"; pnpm exec playwright test e2e/scalingMeasure.e2e.ts --workers=1
```

### Comparing exports

`torture/compare-exports.ts` runs that harness in a lameta worktree and compares what two runs exported, so you can see what a change, or a range of releases, did to lameta's exports.

```bash
pnpm run compare-exports run <lameta worktree> <project folder> <output folder>
pnpm run compare-exports diff <before>/normalized <after>/normalized [--ignore-source-comments]
```

`run` runs the harness on a copy of the project in `<output folder>/project`, because loading a project writes into it. It writes the harness output to `<output folder>/raw` and a copy without what changes from run to run (export dates, lameta's version, RO-Crate's `datePublished` and the file times it reads from disk, the time in a date-parse note, a random project guid, the paths of the run) to `<output folder>/normalized`. A worktree of a lameta too old to have the harness gets a copy of this one's, and one from before Vite+ runs it under the Node version in its `package.json`. `diff` lists each changed line, or for a CSV each changed cell, once, with the files it is in, and exits with 1 if anything differs. `--ignore-source-comments` leaves out the `lameta-source` and `lameta-translations` comments that lameta writes before IMDI elements so that a problem can lead back to its field; comparing with a version that predates them, every line would differ otherwise.

`torture/golden-exports` holds master's normalized output for the portable torture project. To check a change against it:

```bash
pnpm run make-torture-project "D:/runs/Interviews with Abstract Artists ŋ"
pnpm run compare-exports run . "D:/runs/Interviews with Abstract Artists ŋ" D:/runs/out
pnpm run compare-exports diff sample-data-generator/torture/golden-exports D:/runs/out/normalized
```

When the differences are the ones you meant, replace the golden files by running `run` again with `--normalized sample-data-generator/torture/golden-exports`, and commit them with the change.

## Requirements

- [Bun](https://bun.sh/) runtime (faster TypeScript execution)

## Quick Start

1. Generate expansion data for the Large Sample project:

```bash
cd sample-data-generator
bun install
bun run generate-expansion
```

This adds 2 new people and 2 new sessions to the existing Large Sample project using the JSON specification file stored in the Large Sample folder.

## How to Run

### Using bun scripts (recommended):

```bash
bun run generate <path-to-json-file> <target-directory>
```

### Running directly with bun:

```bash
bun generate-sample-data.ts <path-to-json-file> <target-directory>
```

### Examples:

```bash
# Add to existing project
bun run generate "../sample data/Large Sample/kurbin-expansion-data.json" "../sample data/Large Sample"

# Create new project (directory must exist)
bun run generate "../sample data/New Project/my-language-data.json" "../sample data/New Project"
```

## File Organization

### JSON Data Files

JSON specification files should be stored alongside the target project data:

- For existing projects: Place JSON files in the project folder (e.g., `../sample data/Large Sample/`)
- For new projects: Create the JSON file in the intended project directory

This keeps the data specifications with their corresponding projects and makes the workflow more intuitive.

## Valid Data Structure

### JSON Input Format

Your JSON file must contain a `people` array and `sessions` array with the following structures:

#### Person Object

```json
{
  "name": "Full Name",
  "nickname": "Nickname",
  "birthYear": "1980",
  "gender": "Male/Female",
  "primaryOccupation": "Job description",
  "howToContact": "email@domain.com",
  "ethnicGroup": "Cultural group",
  "education": "Education description",
  "description": "Detailed biography",
  "customFields": {
    "Clan_Affiliation": "Cultural group",
    "Traditional_Role": "Cultural position",
    "Specialist_Knowledge": "Areas of expertise"
  }
}
```

#### Session Object

```json
{
  "id": "SESSION_ID",
  "title": "Session Title",
  "description": "Rich description with cultural context",
  "participants": "Person Name",
  "languages": "language-code",
  "workingLanguages": "eng",
  "genre": "mythology/procedural/conversation/elicitation",
  "subgenre": "creation_stories/how_to/interview",
  "location": "Recording location",
  "access": "Open/Community/Restricted",
  "date": "2025-01-01",
  "status": "Finished/In_Progress/Incoming",
  "contributions": [
    {
      "name": "Person Name",
      "role": "storyteller/demonstrator/speaker/consultant/researcher",
      "date": "0001-01-01"
    }
  ],
  "mediaFiles": [
    {
      "filename": "audio.wav",
      "duration": "12:34",
      "notes": "Description of recording",
      "equipment": "Recording equipment used",
      "quality": "Excellent/Good/Fair/Poor"
    }
  ],
  "customFields": {
    "Cultural_Significance": "High/Medium/Low",
    "Language_Register": "Formal/Informal/Ceremonial",
    "Seasonal_Relevance": "Cultural timing"
  }
}
```

### Generated Output Structure

The generator creates complete Lameta project structures:

```
project-directory/
├── People/
│   └── Person_Name/
│       ├── Person_Name.person
│       └── Person_Name_Consent.jpg (empty placeholder)
├── Sessions/
│   └── SESSION_ID/
│       ├── SESSION_ID.session
│       ├── media_file.wav (placeholder)
│       └── media_file.wav.meta
```

### Key Requirements

**Every person must have:**

- Complete biographical information
- A consent file (PDF, JPG, or video - created as empty placeholder)
- Unique name (skip the code)

**Every session must have:**

- At least one contributor linked to an actual person
- Rich cultural and linguistic descriptions
- Proper contributions XML structure
- Media files with metadata

**Names and linking:**

- Person names in contributions must exactly match person file names
- Contributions link sessions to people via the contributions XML structure
- All custom fields should reflect consistent cultural themes

## Content Guidelines

### Cultural Design Principles

1. **Respectful Fiction**: Create vibrant, living cultures with current issues, not museum pieces
2. **Internal Consistency**: Names, ages, occupations, and customs should align
3. **Linguistic Authenticity**: Use plausible linguistic terminology and concepts
4. **Variety**: Include multiple genres, complexity levels, and session types

### Session Content Variety

Include diverse genres:

- `mythology` - Traditional narratives (avoid starting titles with "Traditional" or "Sacred")
- `procedural` - How-to demonstrations, crafts
- `conversation` - Natural discourse, interviews
- `elicitation` - Linguistic data collection
- `ceremony` - Ritual content
- `song` - Traditional music

Vary complexity and access levels across sessions.

### Common Pitfalls to Avoid

1. **Contributions XML**: Must use exact structure with `<contributor>` elements
2. **Name Mismatches**: Contribution names must exactly match person names
3. **Empty Contributions**: Every session needs at least one contributor
4. **Missing Consent**: Every person needs a consent file
5. **Museum Approach**: Avoid portraying cultures as static or only historical

## Scaling and Automation

### For Large Datasets (100+ entities)

1. **Design Phase**: Create 2-4 examples manually to establish patterns
2. **JSON Specification**: Expand JSON with hundreds of realistic entities
3. **Batch Generation**: Use the script to create all files at once
4. **Validation**: Run unit tests to verify proper loading

### Performance

- Uses Bun runtime for optimal TypeScript execution (~74ms startup)
- Handles large datasets efficiently
- Creates proper XML structure and file organization
- No external dependencies required

### Quality Assurance

After generation, verify with unit tests:

```bash
# Test all projects
vp test run

# Test specific project
vp test run src/model/Project/LargeSample.spec.ts
```

Tests verify:

- Project loads via `Project.fromDirectory()`
- All people and session files load correctly
- Contributions properly link sessions to people
- Custom fields are preserved
- No XML parsing errors

## Kürbinian Language Project (Example Scenario)

The included example data features the fictional "Kürbinian (Gourd-Folk)" language and culture:

### Cultural Context

- **Language**: Kürbinian (`qky-x-kurbin`)
- **Location**: Mythical Research Territory
- **Culture**: Gourd-Folk with clan-based society
- **Specializations**: Traditional crafts, seasonal ceremonies, botanical knowledge
- **Modern Context**: Current community issues, politics, and daily life

### Key Cultural Elements

- **Clans**: Ember-Hearth, Stone-Path, Wind-Song, etc.
- **Traditional Roles**: Gourd-Shapers, Harvest-Keepers, Song-Weavers
- **Seasonal Activities**: Harvest festivals, moon ceremonies, craft demonstrations
- **Language Features**: Complex morphology, register variation, ceremonial vocabulary

### Sample Sessions Include

- Honey gathering techniques (procedural)
- Weather prediction lore (traditional knowledge)
- Community history (narrative)
- Seed blessing songs (ceremonial)
- Tool-making demonstrations (craft)

This fictional culture provides rich, interconnected sample data while maintaining cultural sensitivity and demonstrating Lameta's full feature set.
