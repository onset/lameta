#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class ConsentFileAdder {
  constructor(baseDir) {
    this.baseDir = baseDir;
  }

  addConsentFiles() {
    const peopleDir = path.join(this.baseDir, 'People');
    
    if (!fs.existsSync(peopleDir)) {
      console.error('People directory not found:', peopleDir);
      return;
    }

    const personDirs = fs.readdirSync(peopleDir)
      .filter(item => fs.statSync(path.join(peopleDir, item)).isDirectory());

    console.log(`Found ${personDirs.length} people directories`);

    for (const personDir of personDirs) {
      const fullPersonDir = path.join(peopleDir, personDir);
      this.addConsentFileForPerson(fullPersonDir, personDir);
    }

    console.log('✅ Consent file addition complete!');
  }

  addConsentFileForPerson(personDir, personName) {
    // Check if consent file already exists
    const files = fs.readdirSync(personDir);
    const hasConsentFile = files.some(file => file.toLowerCase().includes('consent'));

    if (hasConsentFile) {
      console.log(`⏭️  ${personName} already has consent file`);
      return;
    }

    // Create consent file - try different extensions randomly
    const extensions = ['jpg', 'pdf', 'mp4'];
    const randomExtension = extensions[Math.floor(Math.random() * extensions.length)];
    
    const consentFilename = `${personName}_Consent.${randomExtension}`;
    const consentPath = path.join(personDir, consentFilename);
    
    // Create empty dummy consent file
    fs.writeFileSync(consentPath, '');
    
    // Create metadata file for the consent file
    const metaPath = path.join(personDir, `${consentFilename}.meta`);
    const metaContent = `<?xml version="1.0" encoding="utf-8"?>
<MetaData>
  <notes>Consent form for cultural documentation and research</notes>
  <equipment>Standard consent documentation equipment</equipment>
  <recordingQuality>Standard consent documentation quality</recordingQuality>
  <duration>Standard consent documentation duration</duration>
</MetaData>`;
    
    fs.writeFileSync(metaPath, metaContent);
    
    console.log(`✅ Added consent file for ${personName}: ${consentFilename}`);
  }
}

// Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node add-consent-files.js <target-directory>');
    console.log('Example: node add-consent-files.js "C:\\dev\\lameta\\sample data\\Large Sample"');
    process.exit(1);
  }

  const targetDir = args[0];
  const adder = new ConsentFileAdder(targetDir);
  adder.addConsentFiles();
}

module.exports = ConsentFileAdder;
