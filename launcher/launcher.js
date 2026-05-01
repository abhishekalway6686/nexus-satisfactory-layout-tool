#!/usr/bin/env node
/**
 * Satisfactory Layout Tool Launcher
 *
 * This launcher:
 * 1. Starts a static file server for the frontend
 * 2. Starts the Rust backend API server
 * 3. Waits for both to be ready
 * 4. Opens the default browser
 * 5. Handles graceful shutdown
 */

const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { platform } = require('os');

// ============================================================================
// ANSI Color Codes and Styling
// ============================================================================

const colors = {
  // Reset
  reset: '\x1b[0m',

  // Regular colors
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',

  // Bright colors
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',

  // Background colors
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',

  // Styles
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
};

// Styled output helpers
const style = {
  success: (text) => `${colors.brightGreen}${text}${colors.reset}`,
  error: (text) => `${colors.brightRed}${text}${colors.reset}`,
  warning: (text) => `${colors.brightYellow}${text}${colors.reset}`,
  info: (text) => `${colors.brightCyan}${text}${colors.reset}`,
  highlight: (text) => `${colors.brightMagenta}${text}${colors.reset}`,
  dim: (text) => `${colors.dim}${text}${colors.reset}`,
  bold: (text) => `${colors.bold}${text}${colors.reset}`,
  url: (text) => `${colors.bold}${colors.brightCyan}${text}${colors.reset}`,
  header: (text) => `${colors.bold}${colors.brightYellow}${text}${colors.reset}`,
  orange: (text) => `${colors.yellow}${text}${colors.reset}`, // Orange-ish (closest ANSI)
};

// Spinner frames for loading animation
const spinnerFrames = ['|', '/', '-', '\\'];
let spinnerIndex = 0;
let spinnerInterval = null;

function startSpinner(message) {
  spinnerIndex = 0;
  process.stdout.write(`  ${style.info(spinnerFrames[spinnerIndex])} ${message}`);
  spinnerInterval = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
    process.stdout.write(`\r  ${style.info(spinnerFrames[spinnerIndex])} ${message}`);
  }, 100);
}

function stopSpinner(success = true, finalMessage = '') {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
  const icon = success ? style.success('[OK]') : style.error('[FAIL]');
  process.stdout.write(`\r  ${icon} ${finalMessage}\n`);
}

// ASCII Art Banner - Nexus themed
const packageJson = require('./package.json');
const version = packageJson.version;

const BANNER = `
${colors.brightYellow}    ╔═══════════════════════════════════════════════════════════════════╗
    ║                                                                   ║
    ║${colors.reset}          ${colors.bold}${colors.yellow}███╗   ██╗ ███████╗ ██╗  ██╗ ██╗   ██╗ ███████╗${colors.reset}${colors.brightYellow}           ║
    ║${colors.reset}          ${colors.bold}${colors.yellow}████╗  ██║ ██╔════╝ ╚██╗██╔╝ ██║   ██║ ██╔════╝${colors.reset}${colors.brightYellow}           ║
    ║${colors.reset}          ${colors.bold}${colors.brightYellow}██╔██╗ ██║ █████╗    ╚███╔╝  ██║   ██║ ███████╗${colors.reset}${colors.brightYellow}           ║
    ║${colors.reset}          ${colors.bold}${colors.brightYellow}██║╚██╗██║ ██╔══╝    ██╔██╗  ██║   ██║ ╚════██║${colors.reset}${colors.brightYellow}           ║
    ║${colors.reset}          ${colors.bold}${colors.white}██║ ╚████║ ███████╗ ██╔╝ ██╗ ╚██████╔╝ ███████║${colors.reset}${colors.brightYellow}           ║
    ║${colors.reset}          ${colors.bold}${colors.white}╚═╝  ╚═══╝ ╚══════╝ ╚═╝  ╚═╝  ╚═════╝  ╚══════╝${colors.reset}${colors.brightYellow}           ║
    ║${colors.reset}   ${colors.bold}${colors.cyan}              LAYOUT TOOL${colors.reset}${colors.brightYellow}                                      ║
    ║                                                                   ║
    ╠═══════════════════════════════════════════════════════════════════╣
    ║${colors.reset}${colors.dim}            Plan your factory empire with precision              ${colors.reset}${colors.brightYellow}║
    ║${colors.reset}${colors.dim}          created by Austin Handle (@Officer.ASH)            ${colors.reset}${colors.brightYellow}║
    ╚═══════════════════════════════════════════════════════════════════╝${colors.reset}
`;

// Smaller decorative elements
const DIVIDER = `${colors.brightYellow}    ───────────────────────────────────────────────────────────────────${colors.reset}`;
const SECTION_START = `${colors.brightYellow}    ┌─────────────────────────────────────────────────────────────────┐${colors.reset}`;
const SECTION_END = `${colors.brightYellow}    └─────────────────────────────────────────────────────────────────┘${colors.reset}`;

// Print a boxed message
function printBox(lines, padding = 2) {
  const maxLen = Math.max(...lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, '').length));
  const width = maxLen + padding * 2;

  console.log(`${colors.brightYellow}    ┌${'─'.repeat(width + 2)}┐${colors.reset}`);
  for (const line of lines) {
    const cleanLen = line.replace(/\x1b\[[0-9;]*m/g, '').length;
    const rightPad = width - cleanLen;
    console.log(`${colors.brightYellow}    │${colors.reset} ${line}${' '.repeat(rightPad)} ${colors.brightYellow}│${colors.reset}`);
  }
  console.log(`${colors.brightYellow}    └${'─'.repeat(width + 2)}┘${colors.reset}`);
}

// Print a status line with icon
function printStatus(icon, message, detail = '') {
  const iconStr = icon === 'ok' ? style.success('[OK]')
    : icon === 'fail' ? style.error('[FAIL]')
    : icon === 'warn' ? style.warning('[!!]')
    : icon === 'info' ? style.info('[..]')
    : icon === 'arrow' ? style.info(' >> ')
    : `[${icon}]`;

  if (detail) {
    console.log(`    ${iconStr} ${message} ${detail}`);
  } else {
    console.log(`    ${iconStr} ${message}`);
  }
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Configuration
const FRONTEND_PORT = 5173;
const BACKEND_PORT = 5175;
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}`;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;
const HEALTH_CHECK_URL = `${BACKEND_URL}/health`;
const MAX_WAIT_TIME = 30000; // 30 seconds
const CHECK_INTERVAL = 500; // Check every 500ms

// MIME types for static file serving
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

// Get the directory where the executable is located
// When packaged with pkg, __dirname points to virtual /snapshot/, so we use process.execPath
function getExeDir() {
  // Check if we're running as a packaged executable (pkg)
  // In pkg, process.pkg is defined
  if (process.pkg) {
    // process.execPath is the path to the packaged exe
    return path.dirname(process.execPath);
  }
  // Running as regular Node.js script
  return __dirname;
}

// Determine the server executable path
function getServerPath() {
  const isWindows = platform() === 'win32';
  const exeName = isWindows ? 'standalone-server.exe' : 'standalone-server';
  const exeDir = getExeDir();

  // Check multiple possible locations
  const possiblePaths = [
    // Same directory as launcher executable (primary for distribution)
    path.join(exeDir, exeName),
    // In a 'bin' subdirectory
    path.join(exeDir, 'bin', exeName),
    // Development paths (when running as node script)
    path.join(__dirname, exeName),
    path.join(__dirname, '..', 'src-tauri', 'target', 'release', exeName),
  ];

  const fs = require('fs');
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      printStatus('ok', 'Found backend server', style.dim(path.basename(p)));
      return p;
    }
  }

  // Default to same directory as exe
  const defaultPath = path.join(exeDir, exeName);
  printStatus('warn', 'Backend server not found, will try:', style.dim(defaultPath));
  return defaultPath;
}

// Start a simple static file server for the frontend
function startStaticServer(distPath) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Parse URL and get pathname
      let pathname = req.url.split('?')[0];

      // Default to index.html for root or SPA routes
      if (pathname === '/' || !path.extname(pathname)) {
        pathname = '/index.html';
      }

      const filePath = path.join(distPath, pathname);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // For SPA, serve index.html for any missing route
          if (err.code === 'ENOENT') {
            fs.readFile(path.join(distPath, 'index.html'), (err2, indexData) => {
              if (err2) {
                res.writeHead(404);
                res.end('Not Found');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(indexData);
              }
            });
          } else {
            res.writeHead(500);
            res.end('Server Error');
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        }
      });
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        printStatus('warn', `Port ${FRONTEND_PORT} already in use`, style.dim('checking if app is running...'));
        resolve(server); // Continue anyway, might be already running
      } else {
        reject(err);
      }
    });

    server.listen(FRONTEND_PORT, '127.0.0.1', () => {
      printStatus('ok', 'Frontend server started', style.dim(`port ${FRONTEND_PORT}`));
      resolve(server);
    });
  });
}

// Check if backend server is ready
function checkServerReady() {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_CHECK_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Check if frontend server is ready
function checkFrontendReady() {
  return new Promise((resolve) => {
    const req = http.get(FRONTEND_URL, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Wait for backend server to be ready
async function waitForBackend() {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const ready = await checkServerReady();
    if (ready) {
      return true;
    }
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }

  return false;
}

// Wait for both servers to be ready
async function waitForBothServers() {
  const startTime = Date.now();

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    const backendReady = await checkServerReady();
    const frontendReady = await checkFrontendReady();

    if (backendReady && frontendReady) {
      return true;
    }
    await new Promise(r => setTimeout(r, CHECK_INTERVAL));
  }

  return false;
}

// Open URL in default browser
function openBrowser(url) {
  const { exec } = require('child_process');

  switch (platform()) {
    case 'win32':
      exec(`start "" "${url}"`, (err) => {
        if (err) {
          printStatus('warn', 'Failed to open browser', style.dim(err.message));
        }
      });
      break;
    case 'darwin':
      exec(`open "${url}"`, (err) => {
        if (err) {
          printStatus('warn', 'Failed to open browser', style.dim(err.message));
        }
      });
      break;
    default: // Linux and others
      exec(`xdg-open "${url}"`, (err) => {
        if (err) {
          printStatus('warn', 'Failed to open browser', style.dim(err.message));
        }
      });
      break;
  }
}

// Get the dist folder path
function getDistPath() {
  const exeDir = getExeDir();

  const possiblePaths = [
    path.join(exeDir, 'dist'),
    path.join(exeDir, 'web'),
    path.join(__dirname, 'dist'),
    path.join(__dirname, '..', 'dist'),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, 'index.html'))) {
      return p;
    }
  }

  return path.join(exeDir, 'dist');
}

// Main launcher function
async function main() {
  // Clear screen and show banner
  console.clear();
  console.log(BANNER);
  
  // Center version number
  const versionText = `Version ${version}`;
  const padding = Math.max(0, Math.floor((67 - versionText.length) / 2));
  console.log(`${colors.dim}${' '.repeat(padding + 4)}${versionText}${colors.reset}`);
  console.log('');

  // Show configuration
  console.log(SECTION_START);
  console.log(`${colors.brightYellow}    │${colors.reset} ${style.header('Configuration')}                                                  ${colors.brightYellow}│${colors.reset}`);
  console.log(`${colors.brightYellow}    │${colors.reset}   Frontend: ${style.url(FRONTEND_URL)}                           ${colors.brightYellow}│${colors.reset}`);
  console.log(`${colors.brightYellow}    │${colors.reset}   Backend:  ${style.url(BACKEND_URL)}                           ${colors.brightYellow}│${colors.reset}`);
  console.log(SECTION_END);
  console.log('');

  let frontendServer = null;

  // Check if both servers are already running
  console.log(`    ${style.info('[..]')} Checking for running instances...`);
  await sleep(300); // Brief pause for visual effect

  const backendRunning = await checkServerReady();
  const frontendRunning = await checkFrontendReady();

  if (backendRunning && frontendRunning) {
    printStatus('ok', 'App is already running!');
    console.log('');
    printStatus('arrow', 'Opening browser...');
    openBrowser(FRONTEND_URL);
    console.log('');
    printBox([
      `${style.success('The app is now open in your browser.')}`,
      `${style.dim('You can close this window.')}`,
    ]);
    return;
  }
  printStatus('info', 'No existing instance found, starting fresh...');

  // Start the frontend static file server
  console.log('');
  console.log(DIVIDER);
  console.log(`    ${style.header('Starting Services')}`);
  console.log(DIVIDER);
  console.log('');

  printStatus('arrow', 'Locating frontend files...');
  const distPath = getDistPath();

  if (!fs.existsSync(distPath)) {
    printStatus('fail', 'Frontend files not found!');
    console.log('');
    printBox([
      `${style.error('Error:')} Frontend files not found`,
      `${style.dim('Path:')} ${distPath}`,
      '',
      'Make sure the "dist" folder is in the',
      'same directory as this launcher.',
      '',
      `${style.dim('Press Enter to exit...')}`,
    ]);
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(1));
    return;
  }
  printStatus('ok', 'Frontend files located');

  printStatus('arrow', 'Starting frontend server...');
  try {
    frontendServer = await startStaticServer(distPath);
  } catch (err) {
    printStatus('fail', 'Failed to start frontend server');
    console.log(`         ${style.error(err.message)}`);
    console.log('');
    console.log(`    ${style.dim('Press Enter to exit...')}`);
    process.stdin.resume();
    process.stdin.once('data', () => process.exit(1));
    return;
  }

  // Start the backend server
  const serverPath = getServerPath();
  printStatus('arrow', 'Starting backend server...', `(${path.basename(serverPath)})`);

  const serverProcess = spawn(serverPath, [], {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  let serverOutput = '';

  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  serverProcess.stderr.on('data', (data) => {
    serverOutput += data.toString();
  });

  serverProcess.on('error', (err) => {
    printStatus('fail', 'Failed to start backend server!');
    console.log('');
    printBox([
      `${style.error('Error:')} ${err.message}`,
      '',
      'Make sure standalone-server.exe is in',
      'the same folder as this launcher.',
      '',
      `${style.dim('Press Enter to exit...')}`,
    ]);

    process.stdin.resume();
    process.stdin.once('data', () => process.exit(1));
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`    ${style.warning('[!!]')} Server exited with code ${code}`);
      if (serverOutput) {
        console.log(`    ${style.dim('Server output:')} ${serverOutput.substring(0, 200)}`);
      }
    }
  });

  // Handle cleanup on exit
  const cleanup = () => {
    console.log('');
    console.log(DIVIDER);
    printStatus('arrow', 'Shutting down servers...');

    // Close frontend server
    if (frontendServer && typeof frontendServer.close === 'function') {
      frontendServer.close();
    }

    // Kill backend server
    if (serverProcess && !serverProcess.killed) {
      if (platform() === 'win32') {
        // On Windows, use taskkill to ensure child processes are killed
        spawn('taskkill', ['/pid', serverProcess.pid, '/f', '/t'], { stdio: 'ignore' });
      } else {
        serverProcess.kill('SIGTERM');
      }
    }

    console.log('');
    console.log(`    ${style.success('Goodbye!')} ${style.dim('Thanks for using Satisfactory Layout Tool')}`);
    console.log('');
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  // Windows-specific: Handle console close
  if (platform() === 'win32') {
    process.on('SIGHUP', cleanup);
  }

  // Wait for both servers to be ready
  console.log('');
  startSpinner('Waiting for servers to initialize...');

  const ready = await waitForBothServers();

  if (!ready) {
    stopSpinner(false, 'Servers failed to start within 30 seconds');
    console.log('');

    // Check which server failed
    const backendReady = await checkServerReady();
    const frontendReady = await checkFrontendReady();

    const errorLines = [`${style.error('Startup Failed')}`];
    if (!backendReady) {
      errorLines.push(`  ${style.error('x')} Backend (port ${BACKEND_PORT}) not responding`);
    }
    if (!frontendReady) {
      errorLines.push(`  ${style.error('x')} Frontend (port ${FRONTEND_PORT}) not responding`);
    }

    if (serverOutput) {
      errorLines.push('');
      errorLines.push(`${style.dim('Server output:')}`);
      errorLines.push(style.dim(serverOutput.substring(0, 150)));
    }

    errorLines.push('');
    errorLines.push(`${style.dim('Press Enter to exit...')}`);

    printBox(errorLines);

    process.stdin.resume();
    process.stdin.once('data', () => {
      cleanup();
    });
    return;
  }

  stopSpinner(true, 'All servers initialized successfully!');
  console.log('');

  printStatus('ok', 'Frontend server', style.dim(`port ${FRONTEND_PORT}`));
  printStatus('ok', 'Backend server', style.dim(`port ${BACKEND_PORT}`));

  console.log('');
  printStatus('arrow', 'Opening browser...');
  await sleep(200);

  // Open browser
  openBrowser(FRONTEND_URL);

  // Final success message
  console.log('');
  console.log(`${colors.brightGreen}    ╔═══════════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}                                                                   ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}   ${colors.bold}${colors.brightWhite}Satisfactory Layout Tool is now running!${colors.reset}                    ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}                                                                   ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}   ${colors.cyan}App URL:${colors.reset} ${style.url(FRONTEND_URL)}                              ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}                                                                   ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ╠═══════════════════════════════════════════════════════════════════╣${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}   ${colors.dim}Keep this window open while using the app.${colors.reset}                    ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ║${colors.reset}   ${colors.dim}Press${colors.reset} ${style.highlight('Ctrl+C')} ${colors.dim}or close this window to stop.${colors.reset}                ${colors.brightGreen}║${colors.reset}`);
  console.log(`${colors.brightGreen}    ╚═══════════════════════════════════════════════════════════════════╝${colors.reset}`);
  console.log('');

  // Keep the process running
  process.stdin.resume();
}

// Run the launcher
main().catch((err) => {
  console.error('Launcher error:', err);
  process.exit(1);
});
