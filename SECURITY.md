# Security Policy

## Supported Versions

Only the latest stable release receives security fixes. Closed-beta builds
(`2.0.0-beta.*`) are no longer supported — please upgrade to the open-source
2.0.0 release or later.

| Version       | Supported          |
| ------------- | ------------------ |
| 2.0.0+        | ✅ Yes             |
| 2.0.0-beta.\* | ❌ No (legacy)     |
| < 2.0         | ❌ No              |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub
issues, discussions, or social media.**

Instead, report them privately by emailing:

> **security@handleconsolidated.com**

Or use [GitHub's private vulnerability reporting](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/security/advisories/new)
on the repo.

### What to include

To help us respond quickly, please include as much of the following as you
can:

- A description of the issue and its potential impact
- Steps to reproduce, including a minimal proof-of-concept if possible
- The affected version(s) and platform(s)
- Whether the issue is already public anywhere
- Your name and contact info if you'd like credit in the advisory

### What to expect

- **Acknowledgement** within 72 hours
- **Initial triage** within 7 days, including a severity assessment
- **Status updates** at least every 14 days while we work on a fix
- **Credit** in the security advisory and release notes (unless you'd
  prefer to remain anonymous)

We follow a coordinated disclosure model. We ask that you give us a
reasonable amount of time to develop and ship a fix before any public
disclosure. For most issues, 90 days is the upper bound.

## Scope

### In scope

- The desktop application (Tauri build)
- The standalone HTTP server (`standalone-server.exe`)
- The portable launcher
- The auto-update mechanism (signature verification, update endpoint)
- Save file parsing and migration (potential malicious-input issues)
- Any code in this repository

### Out of scope

- Vulnerabilities in third-party dependencies — please report those
  upstream. We will update our dependency on the patched version once
  available.
- Issues that require physical access to the user's machine
- Self-XSS or social-engineering attacks against individual users
- Theoretical issues without a working proof-of-concept

## Hall of Fame

We maintain a list of contributors who have helped improve the security of
this project in our security advisories. Thank you for keeping the project
and its users safe!
