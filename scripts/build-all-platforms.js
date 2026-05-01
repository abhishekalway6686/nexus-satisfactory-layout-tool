#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Detect current platform
const platform = process.platform;
const isWindows = platform === 'win32';
const isMac = platform === 'darwin';
const isLinux = platform === 'linux';

console.log(`Building Satisfactory Layout Tool for all platforms...`);
console.log(`Current platform: ${platform}`);

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist-releases');
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Helper function to execute commands
function execute(command, options = {}) {
  console.log(`Executing: ${command}`);
  try {
    execSync(command, { stdio: 'inherit', ...options });
  } catch (error) {
    console.error(`Failed to execute: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

// Helper function to copy platform config
function usePlatformConfig(platform) {
  const sourceConfig = path.join(__dirname, '..', 'src-tauri', `tauri.${platform}.conf.json`);
  const targetConfig = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json');
  
  if (fs.existsSync(sourceConfig)) {
    console.log(`Using ${platform} configuration...`);
    fs.copyFileSync(sourceConfig, targetConfig);
  }
}

// Clean previous builds
console.log('Cleaning previous builds...');
execute('npm run clean', { cwd: path.join(__dirname, '..') });

// Build frontend once
console.log('Building frontend...');
execute('npm run build', { cwd: path.join(__dirname, '..') });

// Build for each platform
const platforms = ['windows', 'macos', 'linux'];

for (const targetPlatform of platforms) {
  console.log(`\n========================================`);
  console.log(`Building for ${targetPlatform}...`);
  console.log(`========================================\n`);
  
  // Skip platforms that can't be built on current OS
  if (targetPlatform === 'macos' && !isMac) {
    console.log('Skipping macOS build (requires macOS)');
    continue;
  }
  
  if (targetPlatform === 'windows' && !isWindows) {
    console.log('Note: Building Windows target on non-Windows platform');
    console.log('Some features like code signing may not be available');
  }
  
  // Use platform-specific configuration
  usePlatformConfig(targetPlatform);
  
  // Build with Tauri
  try {
    const buildCommand = `npm run tauri build`;
    execute(buildCommand, { cwd: path.join(__dirname, '..') });
    
    // Move built files to dist-releases
    const srcDir = path.join(__dirname, '..', 'src-tauri', 'target', 'release', 'bundle');
    
    // Platform-specific file patterns
    const patterns = {
      windows: ['*.msi', '*.exe', 'nsis/*.exe'],
      macos: ['*.dmg', '*.app'],
      linux: ['*.deb', '*.rpm', '*.AppImage'],
    };
    
    console.log(`\nMoving ${targetPlatform} build artifacts...`);
    
    for (const pattern of patterns[targetPlatform]) {
      const files = require('glob').sync(path.join(srcDir, pattern));
      for (const file of files) {
        const basename = path.basename(file);
        const dest = path.join(distDir, `${targetPlatform}-${basename}`);
        console.log(`Moving ${basename} to dist-releases/`);
        fs.copyFileSync(file, dest);
      }
    }
    
  } catch (error) {
    console.error(`Failed to build for ${targetPlatform}:`, error);
  }
}

// Restore original config
const originalConfig = path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json.backup');
if (fs.existsSync(originalConfig)) {
  fs.copyFileSync(originalConfig, path.join(__dirname, '..', 'src-tauri', 'tauri.conf.json'));
  fs.unlinkSync(originalConfig);
}

console.log('\n========================================');
console.log('Build complete! Check dist-releases/ for build artifacts.');
console.log('========================================');

// Generate checksums
console.log('\nGenerating checksums...');
const crypto = require('crypto');
const checksumFile = path.join(distDir, 'checksums.txt');
const checksums = [];

fs.readdirSync(distDir).forEach(file => {
  if (file === 'checksums.txt') return;
  
  const filePath = path.join(distDir, file);
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const hex = hashSum.digest('hex');
  checksums.push(`${hex}  ${file}`);
});

fs.writeFileSync(checksumFile, checksums.join('\n'));
console.log('Checksums written to checksums.txt');

// Platform-specific post-build notes
console.log('\n========================================');
console.log('Post-build steps:');
console.log('========================================');

if (isWindows || platforms.includes('windows')) {
  console.log('\nWindows:');
  console.log('- Sign the .exe and .msi files with your code signing certificate');
  console.log('- Test installation on clean Windows 10/11 VMs');
  console.log('- Submit to Windows Defender for analysis');
}

if (isMac || platforms.includes('macos')) {
  console.log('\nmacOS:');
  console.log('- Sign the .app bundle with your Developer ID');
  console.log('- Notarize the .dmg file with Apple');
  console.log('- Test on both Intel and Apple Silicon Macs');
  console.log('- Verify Gatekeeper approval');
}

if (isLinux || platforms.includes('linux')) {
  console.log('\nLinux:');
  console.log('- Test .deb on Ubuntu/Debian');
  console.log('- Test .rpm on Fedora/RHEL');
  console.log('- Test .AppImage on various distros');
  console.log('- Consider creating Snap and Flatpak packages');
}

console.log('\nDone!');