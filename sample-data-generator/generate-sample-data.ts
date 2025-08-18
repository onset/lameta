const fs = require('fs');
const path = require('path');

interface MediaFile {
  filename: string;
  duration: string;
  notes: string;
  equipment: string;
  quality: string;
}

interface Contribution {
  name: string;
  role: string;
  date: string;
}

interface Person {
  name: string;
  nickname: string;
  code: string;
  birthYear: string;
  gender: string;
  primaryOccupation: string;
  howToContact: string;
  ethnicGroup: string;
  education: string;
  description: string;
  customFields: Record<string, string>;
}

interface Session {
  id: string;
  title: string;
  description: string;
  participants: string;
  languages: string;
  workingLanguages: string;
  genre: string;
  subgenre: string;
  location: string;
  access: string;
  accessDescription: string;
  date: string;
  status: string;
  involvement: string;
  locationRegion: string;
  locationCountry: string;
  locationContinent: string;
  planningType: string;
  socialContext: string;
  keyword: string;
  topic: string;
  additionalFields: Record<string, string>;
  customFields: Record<string, string>;
  contributions: Contribution[];
  mediaFiles: MediaFile[];
}

interface ProjectData {
  project: {
    name: string;
    language_code: string;
    working_language: string;
    culture: string;
    location: string;
  };
  people: Person[];
  sessions: Session[];
}

class SampleDataGenerator {
  private baseDir: string;
  private data: ProjectData;

  constructor(dataFilePath: string, baseDir: string) {
    this.baseDir = baseDir;
    const jsonContent = fs.readFileSync(dataFilePath, 'utf-8');
    this.data = JSON.parse(jsonContent);
  }

  async generateAll(): Promise<void> {
    console.log(`Generating sample data for project: ${this.data.project.name}`);
    
    // Generate people
    for (const person of this.data.people) {
      await this.generatePerson(person);
    }

    // Generate sessions
    for (const session of this.data.sessions) {
      await this.generateSession(session);
    }

    console.log('✅ Sample data generation complete!');
  }

  private async generatePerson(person: Person): Promise<void> {
    const personDir = path.join(this.baseDir, 'People', person.name.replace(' ', '_'));
    
    // Create directory
    if (!fs.existsSync(personDir)) {
      fs.mkdirSync(personDir, { recursive: true });
    }

    // Generate .person file
    const personFilePath = path.join(personDir, `${person.name.replace(' ', '_')}.person`);
    const personXml = this.generatePersonXml(person);
    fs.writeFileSync(personFilePath, personXml, 'utf-8');

    // Generate consent file (required for every person)
    const consentFilename = `${person.name.replace(' ', '_')}_Consent.jpg`;
    const consentPath = path.join(personDir, consentFilename);
    
    // Create empty dummy consent file
    fs.writeFileSync(consentPath, '');

    console.log(`✅ Generated person: ${person.name} (with consent file)`);
  }

  private generatePersonXml(person: Person): string {
    const customFieldsXml = Object.entries(person.customFields)
      .map(([key, value]) => `    <${key}>${this.escapeXml(value)}</${key}>`)
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<Person>
  <notes />
  <name>${this.escapeXml(person.name)}</name>
  <nickname>${this.escapeXml(person.nickname)}</nickname>
  <code>${this.escapeXml(person.code)}</code>
  <birthYear>${this.escapeXml(person.birthYear)}</birthYear>
  <gender>${this.escapeXml(person.gender)}</gender>
  <primaryOccupation>${this.escapeXml(person.primaryOccupation)}</primaryOccupation>
  <howToContact>${this.escapeXml(person.howToContact)}</howToContact>
  <ethnicGroup>${this.escapeXml(person.ethnicGroup)}</ethnicGroup>
  <education>${this.escapeXml(person.education)}</education>
  <description>${this.escapeXml(person.description)}</description>
  <consent>true</consent>
  <privacyProtection>false</privacyProtection>
${customFieldsXml}
</Person>`;
  }

  private async generateSession(session: Session): Promise<void> {
    const sessionDir = path.join(this.baseDir, 'Sessions', session.id);
    
    // Create directory
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    // Generate .session file
    const sessionFilePath = path.join(sessionDir, `${session.id}.session`);
    const sessionXml = this.generateSessionXml(session);
    fs.writeFileSync(sessionFilePath, sessionXml, 'utf-8');

    // Generate media files with .meta files
    for (const mediaFile of session.mediaFiles) {
      await this.generateMediaFile(sessionDir, mediaFile);
    }

    console.log(`✅ Generated session: ${session.id}`);
  }

  private generateSessionXml(session: Session): string {
    const additionalFieldsXml = Object.entries(session.additionalFields)
      .map(([key, value]) => `    <${key}>${this.escapeXml(value)}</${key}>`)
      .join('\n');

    const customFieldsXml = Object.entries(session.customFields)
      .map(([key, value]) => `    <${key}>${this.escapeXml(value)}</${key}>`)
      .join('\n');

    const contributionsXml = session.contributions
      .map(contrib => `    <Contribution>
      <name>${this.escapeXml(contrib.name)}</name>
      <role>${this.escapeXml(contrib.role)}</role>
      <date>${contrib.date}</date>
      <comments />
    </Contribution>`)
      .join('\n');

    return `<?xml version="1.0" encoding="utf-8"?>
<Session>
  <notes />
  <title>${this.escapeXml(session.title)}</title>
  <description>${this.escapeXml(session.description)}</description>
  <participants>${this.escapeXml(session.participants)}</participants>
  <languages>${this.escapeXml(session.languages)}</languages>
  <workingLanguages>${this.escapeXml(session.workingLanguages)}</workingLanguages>
  <genre>${this.escapeXml(session.genre)}</genre>
  <subGenre>${this.escapeXml(session.subgenre)}</subGenre>
  <location>${this.escapeXml(session.location)}</location>
  <access>${this.escapeXml(session.access)}</access>
  <accessDescription>${this.escapeXml(session.accessDescription)}</accessDescription>
  <date>${session.date}</date>
  <status>${this.escapeXml(session.status)}</status>
  <involvement>${this.escapeXml(session.involvement)}</involvement>
  <locationRegion>${this.escapeXml(session.locationRegion)}</locationRegion>
  <locationCountry>${this.escapeXml(session.locationCountry)}</locationCountry>
  <locationContinent>${this.escapeXml(session.locationContinent)}</locationContinent>
  <planningType>${this.escapeXml(session.planningType)}</planningType>
  <socialContext>${this.escapeXml(session.socialContext)}</socialContext>
  <keyword>${this.escapeXml(session.keyword)}</keyword>
  <topic>${this.escapeXml(session.topic)}</topic>
${additionalFieldsXml}
${customFieldsXml}
  <Contributions>
${contributionsXml}
  </Contributions>
</Session>`;
  }

  private async generateMediaFile(sessionDir: string, mediaFile: MediaFile): Promise<void> {
    const mediaFilePath = path.join(sessionDir, mediaFile.filename);
    const metaFilePath = path.join(sessionDir, `${mediaFile.filename}.meta`);

    // Generate dummy media file based on extension
    const ext = path.extname(mediaFile.filename).toLowerCase();
    
    // For this sample data generator, we'll create empty placeholder files
    // In production, these would be actual media files
    let placeholderContent = '';
    
    if (ext === '.wav') {
      placeholderContent = `# WAV Audio File Placeholder
# Duration: ${mediaFile.duration}
# Quality: ${mediaFile.quality}
# Equipment: ${mediaFile.equipment}
# This is a placeholder file for development and testing purposes.`;
    } else if (ext === '.mp4') {
      placeholderContent = `# MP4 Video File Placeholder
# Duration: ${mediaFile.duration}
# Quality: ${mediaFile.quality}
# Equipment: ${mediaFile.equipment}
# This is a placeholder file for development and testing purposes.`;
    } else if (ext === '.jpg' || ext === '.jpeg') {
      placeholderContent = `# JPEG Image File Placeholder
# Quality: ${mediaFile.quality}
# Equipment: ${mediaFile.equipment}
# This is a placeholder file for development and testing purposes.`;
    } else {
      placeholderContent = `# Media File Placeholder
# Type: ${ext}
# This is a placeholder file for development and testing purposes.`;
    }
    
    fs.writeFileSync(mediaFilePath, placeholderContent, 'utf-8');

    // Generate .meta file
    const metaXml = this.generateMetaXml(mediaFile);
    fs.writeFileSync(metaFilePath, metaXml, 'utf-8');
  }

  private generateMetaXml(mediaFile: MediaFile): string {
    return `<?xml version="1.0" encoding="utf-8"?>
<MetaData>
  <notes>${this.escapeXml(mediaFile.notes)}</notes>
  <equipment>${this.escapeXml(mediaFile.equipment)}</equipment>
  <recordingQuality>${this.escapeXml(mediaFile.quality)}</recordingQuality>
  <duration>${this.escapeXml(mediaFile.duration)}</duration>
</MetaData>`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: bun generate-sample-data.ts <json-file-path> <target-directory>');
    console.error('Example: bun generate-sample-data.ts kurbin-expansion-data.json "C:\\dev\\lameta\\sample data\\Large Sample"');
    process.exit(1);
  }

  const jsonFilePath = args[0];
  const targetDir = args[1];

  if (!fs.existsSync(jsonFilePath)) {
    console.error(`Error: JSON file not found: ${jsonFilePath}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    console.error(`Error: Target directory not found: ${targetDir}`);
    process.exit(1);
  }

  try {
    const generator = new SampleDataGenerator(jsonFilePath, targetDir);
    await generator.generateAll();
  } catch (error) {
    console.error('Error generating sample data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { SampleDataGenerator };
