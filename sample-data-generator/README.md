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
  "code": "ABC",
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
- Unique name and code

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
yarn test

# Test specific project  
yarn test src/model/Project/LargeSample.spec.ts
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
