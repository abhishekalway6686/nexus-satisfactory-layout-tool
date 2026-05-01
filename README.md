<div align="center">

# neXus Satisfactory Layout Tool

**A high-performance, multi-floor factory layout planner for the game *Satisfactory*.**

Design entire factories with conveyors, pipes, railways, powerlines, and a
full production simulation — on a fast 2D canvas backed by a native Rust core.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_2-24C8DB.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.77+-CE422B.svg)](https://www.rust-lang.org)

[**Download**](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/releases/latest) ·
[Quick Start](#-quick-start) ·
[Features](#-features) ·
[Build from source](#%EF%B8%8F-i-want-to-build-it-myself) ·
[Contributing](CONTRIBUTING.md) ·
[License](#-license)

</div>

---

## ❤️ Support the Project

If this tool saves you time, please consider supporting development:

<div align="center">

### [☕ Donate via Stripe](https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00)

</div>

Other ways to help — all of them free:

- ⭐ Star the repo
- 🐛 [Report bugs](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/issues/new?template=bug_report.md)
  and [request features](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/issues/new?template=feature_request.md)
- 🤝 [Contribute code](CONTRIBUTING.md)

---

## 🚀 Quick Start

### 🎮 I just want to use it

1. Go to the **[Releases page](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/releases/latest)**
2. Download the installer for your OS, or grab the portable Windows zip
3. Run it. No account, no key, nothing to configure.

Detailed install steps — including macOS Gatekeeper, Linux dependencies, and
the portable build — are in **[docs/INSTALL.md](docs/INSTALL.md)**.

### 🛠️ I want to build it myself

You need [Node.js 20+](https://nodejs.org/) and [Rust 1.77+](https://rustup.rs/).

```bash
git clone https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool.git
cd nexus-satisfactory-layout-tool
npm install
npm run dev
```

Then open <http://localhost:5174>. Hot-reload works on both the frontend and
the Rust backend. To produce a release installer:

```bash
npm run tauri:build
```

Full build matrix (portable, cross-platform, signed releases) in
**[docs/BUILD.md](docs/BUILD.md)**.

### 🤝 I want to contribute

PRs are welcome — read **[CONTRIBUTING.md](CONTRIBUTING.md)** first. The
codebase is AGPL-3.0 with an attribution-preservation clause; see the
[License](#-license) section.

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

#### 🏗️ Building & Design
- Full Satisfactory building palette with typed I/O ports
- Foundations, walls, and railings for architectural placement
- Multi-floor layouts with 4 m vertical spacing
- Sticky notes for annotation
- Full undo / redo with 50-step history
- Versioned save / load (`.slt` format)

#### 🚂 Logistics
- Conveyors with auto-curves and intersection-merge
- Multi-tier conveyor lifts
- Fluid pipelines with floor-connection supports
- Railways with node snapping and station alignment
- Truck path planning

</td>
<td width="50%" valign="top">

#### ⚡ Power
- Drawable powerlines with dedicated power poles
- Direct or right-angle (L-shaped) routing modes
- Real-time power consumption vs generation tracking

#### 📊 Production Simulation
- Real-time material flow analysis
- Bottleneck detection with severity classification
- Clock-speed and recipe modeling
- Storage accumulation tracking
- Per-building efficiency badges

#### 🏎️ Performance
- GPU-accelerated geometry math (`wgpu`) with CPU fallback
- R-tree spatial indexing for viewport culling
- Native Rust backend handles heavy compute

</td>
</tr>
</table>

---

## 🧱 Tech Stack

| Layer       | Technology                                                    |
| ----------- | ------------------------------------------------------------- |
| Frontend    | React 19, TypeScript, Konva (2D canvas), Zustand, Tailwind CSS |
| Backend     | Rust (Tauri for desktop, Axum HTTP server for portable build) |
| Compute     | `wgpu` (GPU), `rayon`, `nalgebra`, `rstar`                    |
| Build tools | Vite 5, Tauri 2, Cargo, ESLint                                |

### Project Layout

```
src/             React/TypeScript frontend
  components/    UI (Canvas, Buildings, Conveyors, Pipes, …)
  store/         Zustand state management
  logic/         Domain logic (production sim, network analysis)

src-tauri/       Rust backend
  src/commands/  Tauri commands (geometry, spatial, save/load, GPU)
  src/standalone_main.rs  Standalone HTTP server binary

launcher/        Node.js launcher for the portable distribution
scripts/         Build & packaging automation
docs/            User-facing documentation
```

For deeper architecture notes, see
[`src-tauri/STANDALONE_SERVER_README.md`](src-tauri/STANDALONE_SERVER_README.md)
and [`src-tauri/STANDALONE_MIGRATION.md`](src-tauri/STANDALONE_MIGRATION.md).

---

## 📜 License

This project is licensed under the **GNU Affero General Public License v3.0
or later** (AGPL-3.0-or-later), with **additional terms** under Section 7
of that license requiring preservation of:

1. Author attribution (Austin Handle / Officer ASH)
2. The author's social media handle
3. The in-app donation/support link

| File                                                              | What it is                                |
| ----------------------------------------------------------------- | ----------------------------------------- |
| [LICENSE](LICENSE)                                                | License header and pointers               |
| [docs/legal/AGPL-3.0.txt](docs/legal/AGPL-3.0.txt)               | Full canonical AGPL-3.0 text              |
| [docs/legal/ADDITIONAL_TERMS.md](docs/legal/ADDITIONAL_TERMS.md) | Section 7 attribution-preservation terms |
| [NOTICE](NOTICE)                                                  | Attribution and third-party notices       |

**In plain English:** you can use, modify, contribute to, and self-host this
software freely. You **cannot** strip out the author credits, remove the
donation link, or rebrand-and-redistribute as your own product. If you host
a modified version as a network service, you must make your source available
under the AGPL-3.0.

---

## 🙏 Acknowledgments

*Satisfactory* is a trademark of **Coffee Stain Studios**. This project is
a fan-made tool and is not affiliated with, endorsed by, or sponsored by
Coffee Stain Studios.

---

<div align="center">

Created and maintained by **Austin Handle** — [@Officer_ASH on X](https://x.com/Officer_ASH)
&nbsp;·&nbsp; [TikTok](https://www.tiktok.com/@officer.ash)
&nbsp;·&nbsp; [Instagram](https://www.instagram.com/officer.ash)

Copyright © 2026 Austin Handle (Officer ASH). All rights reserved except as
expressly granted by the AGPL-3.0 and accompanying additional terms.

</div>
