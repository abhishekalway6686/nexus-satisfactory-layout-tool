# Contributing

Thanks for your interest in contributing to neXus Satisfactory Layout Tool!
This document covers how to set up your environment, the workflow for
proposing changes, and the standards we hold code to.

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By
participating, you are expected to uphold it. Please report unacceptable
behavior to the contact listed in [SECURITY.md](SECURITY.md).

## License & Attribution

This project is licensed under **AGPL-3.0-or-later** with **additional
terms** (see [LICENSE](LICENSE), [docs/legal/AGPL-3.0.txt](docs/legal/AGPL-3.0.txt),
and [docs/legal/ADDITIONAL_TERMS.md](docs/legal/ADDITIONAL_TERMS.md)) requiring
preservation of author attribution and the in-app donation link.

By submitting a contribution, you agree that:

1. Your contribution will be licensed under the same AGPL-3.0-or-later +
   additional terms as the rest of the project.
2. You have the right to license the contribution under those terms (i.e.,
   you wrote it, or you have permission from the copyright holder).
3. You will not remove or modify the author attribution, social handles, or
   donation link in any PR you submit.

We do not require a separate CLA. Submitting a PR is your agreement to the
above.

## Development Setup

### Prerequisites

- **Node.js** 20 or later
- **Rust** 1.77 or later (install via [rustup](https://rustup.rs/))
- **Git**
- Windows, macOS, or Linux (Windows is the most-tested platform)

### Local setup

```bash
git clone https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool.git
cd nexus-satisfactory-layout-tool
npm install
npm run dev
```

Open <http://localhost:5174>. Both the Rust backend (port 5175) and the
Vite frontend hot-reload on save.

For the native Tauri shell:

```bash
npm run tauri:dev
```

### Verifying your build

```bash
npm run build         # frontend
npm run rust:build    # Rust standalone server
npm run tauri:build   # full native installer
```

If any of these fail on a clean clone, please open an issue with the full
output.

## Workflow

1. **Open an issue first** for any non-trivial change. This avoids wasted
   effort on changes that don't fit the project direction.
2. **Fork the repo** and create a branch off `main`. Use a descriptive
   branch name like `fix/conveyor-curve-snap` or `feat/blueprint-import`.
3. **Make your changes**. Keep PRs focused — one logical change per PR.
4. **Test locally**:
   - `npm run lint` should pass
   - `npm run build` should succeed
   - `npm run rust:build` should succeed if you touched Rust code
   - Manually test the affected feature in the browser
5. **Commit** with a clear message describing the *why*, not just the what.
6. **Open a PR** against `main` with:
   - A description of what changed and why
   - A link to the issue it closes (if applicable)
   - Screenshots or screen recordings for UI changes
   - Notes on anything reviewers should pay extra attention to

## Code Standards

### TypeScript / React

- Use functional components and hooks. No class components except
  `ErrorBoundary`.
- State management goes through the Zustand store (`src/store/layoutStore.ts`).
- Prefer composition over prop drilling. Use `useShallow` for store selectors.
- Keep components focused — split when a single component exceeds ~300 lines.
- Avoid `any` — use proper types from `src/types/index.ts`.

### Rust

- Run `cargo fmt` before committing.
- Run `cargo clippy` and address all warnings on changed code.
- Keep Tauri commands thin — heavy logic belongs in the corresponding
  module under `src-tauri/src/`.

### Style

- ESLint config is in `eslint.config.js`. Use 2-space indentation.
- Don't add comments that just restate what code does. Comment the *why*
  for non-obvious decisions.
- Don't add features beyond what the issue/PR scope requires.

## Branch Strategy

- **`main`** — current stable code. PRs target this branch.
- **No long-lived feature branches** in the main repo. Use your fork.
- Releases are cut from `main` via tagged releases; see [docs/BUILD.md](docs/BUILD.md).

## What Makes a Good PR

- **Small and focused** — easier to review, faster to merge.
- **Tests where reasonable** — not every UI tweak needs a test, but logic
  changes (production sim, pathfinding, save-file migration) should.
- **No drive-by refactors** — if you spot something to clean up, open a
  separate issue or PR.
- **Working build** — run `npm run build` and `npm run rust:build` before
  pushing. CI will catch failures, but local verification saves a round trip.

## What We Probably Won't Merge

- PRs that remove or modify author attribution, social handles, or the
  donation link (this is a license violation, not a style preference).
- Massive rewrites of core systems without prior discussion in an issue.
- Telemetry, analytics, or "phone home" features without a strong
  privacy-first design and explicit user consent.
- Closed-source dependencies or private network calls.

## Getting Help

- **Bugs** → open an issue using the bug report template
- **Feature ideas** → open an issue using the feature request template
- **Security issues** → see [SECURITY.md](SECURITY.md), do **not** open a
  public issue

## Releases

Maintainers cut releases following the process in [docs/BUILD.md](docs/BUILD.md).
Contributors don't need to do anything release-specific — just land your
PR on `main` and it'll be in the next tagged version.

---

Thanks for helping make this tool better! 🏭
