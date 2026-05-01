#!/usr/bin/env node

/**
 * Interactive script to add a new release to releases.json
 *
 * Usage:
 *   npm run add-release
 *   node scripts/add-release.js
 *
 * The script will prompt for:
 *   - Version number
 *   - Release date (defaults to today)
 *   - Items for each section (added, changed, fixed, removed, security)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RELEASES_PATH = path.join(__dirname, '..', 'src', 'data', 'releases.json');

const SECTION_TYPES = ['added', 'changed', 'fixed', 'removed', 'security'];
const SECTION_LABELS = {
  added: 'Added (new features)',
  changed: 'Changed (modifications to existing functionality)',
  fixed: 'Fixed (bug fixes)',
  removed: 'Removed (deprecated features)',
  security: 'Security (security-related changes)'
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadReleases() {
  try {
    const content = fs.readFileSync(RELEASES_PATH, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading releases.json:', error.message);
    process.exit(1);
  }
}

function saveReleases(releases) {
  try {
    const content = JSON.stringify(releases, null, 2);
    fs.writeFileSync(RELEASES_PATH, content, 'utf8');
    console.log('\n✓ Release saved to src/data/releases.json');
  } catch (error) {
    console.error('Error saving releases.json:', error.message);
    process.exit(1);
  }
}

async function promptForItems(sectionType) {
  const items = [];
  const label = SECTION_LABELS[sectionType];

  console.log(`\n--- ${label} ---`);
  console.log('Enter items one per line. Press Enter on empty line to finish this section.');
  console.log('(Type "skip" to skip this section entirely)\n');

  let itemNumber = 1;
  while (true) {
    const item = await question(`  ${itemNumber}. `);

    if (item.toLowerCase() === 'skip') {
      return [];
    }

    if (item.trim() === '') {
      break;
    }

    items.push(item.trim());
    itemNumber++;
  }

  return items;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     Add New Release to releases.json    ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Load existing releases
  const releases = loadReleases();
  const latestVersion = releases.length > 0 ? releases[0].version : 'none';
  console.log(`Current latest version: ${latestVersion}\n`);

  // Get version number
  const version = await question('Enter version number (e.g., 2.1.0): ');
  if (!version.trim()) {
    console.log('Version is required. Exiting.');
    rl.close();
    return;
  }

  // Check for duplicate version
  if (releases.some(r => r.version === version.trim())) {
    console.log(`\nWarning: Version ${version.trim()} already exists!`);
    const confirm = await question('Do you want to replace it? (y/N): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Cancelled. Exiting.');
      rl.close();
      return;
    }
    // Remove existing version
    const index = releases.findIndex(r => r.version === version.trim());
    releases.splice(index, 1);
  }

  // Get date
  const defaultDate = getTodayDate();
  const dateInput = await question(`Enter release date (YYYY-MM-DD) [${defaultDate}]: `);
  const date = dateInput.trim() || defaultDate;

  // Validate date format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.log('Invalid date format. Please use YYYY-MM-DD format. Exiting.');
    rl.close();
    return;
  }

  // Collect sections
  console.log('\n═══════════════════════════════════════════');
  console.log('Now enter the items for each section.');
  console.log('═══════════════════════════════════════════');

  const sections = [];

  for (const sectionType of SECTION_TYPES) {
    const items = await promptForItems(sectionType);
    if (items.length > 0) {
      sections.push({
        type: sectionType,
        items: items
      });
    }
  }

  if (sections.length === 0) {
    console.log('\nNo items entered. At least one section is required. Exiting.');
    rl.close();
    return;
  }

  // Create the new release object
  const newRelease = {
    version: version.trim(),
    date: date,
    sections: sections
  };

  // Show preview
  console.log('\n═══════════════════════════════════════════');
  console.log('PREVIEW');
  console.log('═══════════════════════════════════════════');
  console.log(JSON.stringify(newRelease, null, 2));

  // Confirm
  const confirm = await question('\nSave this release? (Y/n): ');
  if (confirm.toLowerCase() === 'n') {
    console.log('Cancelled. Exiting.');
    rl.close();
    return;
  }

  // Add to beginning of releases array (newest first)
  releases.unshift(newRelease);

  // Save
  saveReleases(releases);

  console.log(`\nRelease ${version.trim()} has been added successfully!`);
  console.log('\nRemember to also update:');
  console.log('  - package.json');
  console.log('  - src-tauri/tauri.conf.json');
  console.log('  - src-tauri/Cargo.toml');
  console.log('  - CHANGELOG.md');

  rl.close();
}

main().catch((error) => {
  console.error('Error:', error);
  rl.close();
  process.exit(1);
});
