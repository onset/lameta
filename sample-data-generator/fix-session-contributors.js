#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class SessionContributorFixer {
  constructor(baseDir, jsonDataPath) {
    this.baseDir = baseDir;
    this.jsonData = JSON.parse(fs.readFileSync(jsonDataPath, 'utf-8'));
  }

  escapeXml(str) {
    if (str === null || str === undefined) {
      return '';
    }
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  fixSessionContributors() {
    const sessionsDir = path.join(this.baseDir, 'Sessions');
    
    if (!fs.existsSync(sessionsDir)) {
      console.error('Sessions directory not found:', sessionsDir);
      return;
    }

    console.log(`Fixing contributor names in sessions...`);

    for (const session of this.jsonData.sessions) {
      this.fixSessionContributor(session);
    }

    console.log('✅ Session contributor fix complete!');
  }

  fixSessionContributor(sessionData) {
    const sessionDir = path.join(this.baseDir, 'Sessions', sessionData.id);
    const sessionFilePath = path.join(sessionDir, `${sessionData.id}.session`);

    if (!fs.existsSync(sessionFilePath)) {
      console.log(`⏭️  Session file not found: ${sessionFilePath}`);
      return;
    }

    // Read current session file
    let sessionContent = fs.readFileSync(sessionFilePath, 'utf-8');

    // Generate correct contributions XML
    const contributionsXml = sessionData.contributions
      .map(contrib => `    <Contribution>
      <name>${this.escapeXml(contrib.personName)}</name>
      <role>${this.escapeXml(contrib.role)}</role>
      <date>0001-01-01</date>
      <comments />
    </Contribution>`)
      .join('\n');

    // Replace the contributions section
    const newContributionsSection = `  <Contributions>
${contributionsXml}
  </Contributions>`;

    // Use regex to replace the existing Contributions section
    const contributionsPattern = /<Contributions>[\s\S]*?<\/Contributions>/;
    sessionContent = sessionContent.replace(contributionsPattern, newContributionsSection);

    // Write back the corrected file
    fs.writeFileSync(sessionFilePath, sessionContent, 'utf-8');

    console.log(`✅ Fixed contributors for session: ${sessionData.id}`);
  }
}

// Usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node fix-session-contributors.js <target-directory> <json-data-file>');
    console.log('Example: node fix-session-contributors.js "C:\\dev\\lameta\\sample data\\Large Sample" kurbin-large-expansion.json');
    process.exit(1);
  }

  const targetDir = args[0];
  const jsonDataPath = args[1];
  const fixer = new SessionContributorFixer(targetDir, jsonDataPath);
  fixer.fixSessionContributors();
}

module.exports = SessionContributorFixer;
