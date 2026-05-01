# Build & Release Guide

## Prerequisites

- Node.js 20+
- Rust toolchain (1.77+)
- Tauri CLI: `npm install -g @tauri-apps/cli`

## Environment Setup

This project does not require any environment variables to build or run.
A `.env.example` file is included as a placeholder for future configuration.

## Local Development

```bash
npm install
npm run dev
```

This starts both the Rust backend (standalone HTTP server on port 5175) and
the Vite frontend (port 5174) concurrently. Open http://localhost:5174 in
your browser.

For the native Tauri shell instead of the browser-based dev server:

```bash
npm run tauri:dev
```

### Verifying your setup

After `npm install`, run `npm run build` — it should complete without errors
and produce `dist/`. If you have Rust installed, `npm run rust:build` should
produce `src-tauri/target/release/standalone-server.exe`.

If `npm run build` fails, check that you're on Node.js 20+ (`node --version`).
If `cargo build` fails, install Rust via [rustup.rs](https://rustup.rs/) and
restart your shell so `cargo` is on `PATH`.

## Building

### Production Build

```bash
npm run tauri:build
```

Output: `src-tauri/target/release/bundle/`
- Windows: `.msi` or `.exe` installer
- macOS: `.dmg`
- Linux: `.AppImage` or `.deb`

### Signed Build (enables auto-update)

The auto-updater requires the build to be signed with a Tauri signing key.

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = "path/to/your.key"
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = "your-password"
npm run tauri:build
```

The matching public key is committed in `src-tauri/tauri.conf.json` so that
clients can verify update signatures.

**The private signing key must never be committed.** It is gitignored at
`src-tauri/.tauri-signing-key`.

### Portable / Standalone Build (Windows)

```cmd
scripts\package-portable.bat
```

Output: `dist-portable/` — a folder containing the launcher, the standalone
Rust server, the frontend `dist/`, and license/attribution files. This build
runs in the user's default browser rather than embedding a WebView.

For macOS / Linux, use `scripts/package-portable.sh` instead.

### Cross-platform Build

```bash
npm run build:all
```

Runs `scripts/build-all-platforms.js`, which produces native installers for
Windows, macOS, and Linux into `dist-releases/`.

## Version Bumping

Update these four files together so they match:

- `package.json` → `"version": "X.X.X"`
- `src-tauri/tauri.conf.json` → `"version": "X.X.X"`
- `src-tauri/Cargo.toml` → `version = "X.X.X"`
- `src/constants/version.ts` → `APP_VERSION`

Also add an entry to `CHANGELOG.md` and (optionally) `src/data/releases.json`
for the in-app "What's New" dialog.

## Releases

### Tag-based (GitHub Actions)

```bash
git tag v2.1.0
git push origin v2.1.0
```

The release workflow (`.github/workflows/release.yml`) builds for all
platforms and publishes a draft release on GitHub.

### Manual

```bash
gh workflow run release.yml -f version=v2.1.0
```

Then edit the draft release on GitHub, add release notes, and publish.

Users with the app installed will receive update notifications automatically
once the matching `latest.json` is uploaded as a release asset.

## Distribution

Releases are distributed through GitHub Releases. The `latest.json` manifest
referenced by `tauri.conf.json` must be uploaded alongside the platform
installers for the auto-updater to pick up new versions.
