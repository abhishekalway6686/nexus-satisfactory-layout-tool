<div align="center">

# neXus Satisfactory Layout Tool

**A high-performance, multi-floor factory layout planner for *Satisfactory*.**

Conveyors, pipes, railways, powerlines, foundations, and a full production
simulation — on a fast 2D canvas backed by a native Rust core.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built_with-Tauri_2-24C8DB.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.77+-CE422B.svg)](https://www.rust-lang.org)

[**⬇ Download**](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/releases/latest)
&nbsp;·&nbsp; [💬 Subreddit](https://www.reddit.com/r/NexusSatisfactoryTool/)
&nbsp;·&nbsp; [Features](#-features)
&nbsp;·&nbsp; [Build](#-build-from-source)
&nbsp;·&nbsp; [Contribute](CONTRIBUTING.md)
&nbsp;·&nbsp; [License](#-license)

</div>

---

## ❤️ Support the Project

If this tool saves you time, please consider supporting development:

<div align="center">

### ☕ &nbsp;[Donate via Stripe](https://donate.stripe.com/3cI9ATg8l6i9gPP88t5EY00)

💬 [Join the subreddit](https://www.reddit.com/r/NexusSatisfactoryTool/) &nbsp;·&nbsp;
⭐ Star the repo &nbsp;·&nbsp;
🐛 [Report a bug](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/issues/new?template=bug_report.md) &nbsp;·&nbsp;
💡 [Suggest a feature](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/issues/new?template=feature_request.md) &nbsp;·&nbsp;
🤝 [Contribute](CONTRIBUTING.md)

</div>

---

## 🚀 Get Started

<table>
<tr>
<td width="50%" valign="top">

### 🎮 &nbsp;Use it

[**Download v2.0.0**](https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool/releases/latest)

| Platform | Pick                       |
| -------- | -------------------------- |
| Windows  | `.exe` installer or portable `.zip` |
| macOS    | `.dmg`                     |
| Linux    | `.AppImage` / `.deb` / `.rpm` |

No account, no key, nothing to configure. Full install guide → [docs/INSTALL.md](docs/INSTALL.md)

</td>
<td width="50%" valign="top">

### 🛠️ &nbsp;Build it

```bash
git clone https://github.com/HandleConsolidated/nexus-satisfactory-layout-tool.git
cd nexus-satisfactory-layout-tool
npm install
npm run dev
```

Open <http://localhost:5174>. Hot-reload on both frontend and Rust backend.

Requires [Node 20+](https://nodejs.org/) and [Rust 1.77+](https://rustup.rs/). Full build guide → [docs/BUILD.md](docs/BUILD.md)

</td>
</tr>
</table>

---

## ✨ Features

<table>
<tr>
<td width="50%" valign="top">

#### 🏗️ Building & Design
- Full Satisfactory building palette with typed I/O ports
- Foundations, walls, railings
- Multi-floor layouts (4 m vertical spacing)
- Sticky notes
- 50-step undo / redo
- Versioned save / load (`.slt`)

#### 🚂 Logistics
- Conveyors with auto-curves and intersection-merge
- Multi-tier conveyor lifts
- Fluid pipelines with floor-connection supports
- Railways with node snapping and station alignment
- Truck path planning

</td>
<td width="50%" valign="top">

#### ⚡ Power
- Drawable powerlines + dedicated power poles
- Direct or right-angle (L-shaped) routing
- Real-time consumption vs generation tracking

#### 📊 Production Simulation
- Real-time material flow analysis
- Bottleneck detection with severity classification
- Clock-speed and recipe modeling
- Storage accumulation tracking
- Per-building efficiency badges

#### 🏎️ Performance
- GPU-accelerated geometry math (`wgpu`) with CPU fallback
- R-tree spatial indexing for viewport culling
- Native Rust backend for heavy compute

</td>
</tr>
</table>

---

## 🧱 Stack

| Layer       | Tech                                                          |
| ----------- | ------------------------------------------------------------- |
| Frontend    | React 19 · TypeScript · Konva · Zustand · Tailwind            |
| Backend     | Rust · Tauri 2 (desktop) · Axum (portable HTTP server)        |
| Compute     | `wgpu` · `rayon` · `nalgebra` · `rstar`                       |

```
src/             React/TypeScript frontend (components/, store/, logic/)
src-tauri/       Rust backend (commands/, standalone_main.rs)
launcher/        Node.js launcher for portable build
scripts/         Build & packaging automation
docs/            User-facing documentation
```

Architecture notes: [`src-tauri/STANDALONE_SERVER_README.md`](src-tauri/STANDALONE_SERVER_README.md), [`src-tauri/STANDALONE_MIGRATION.md`](src-tauri/STANDALONE_MIGRATION.md)

---

## 📜 License

**AGPL-3.0-or-later** with **Section 7 additional terms** preserving author
attribution and the in-app donation link.

| File                                                              | What                                       |
| ----------------------------------------------------------------- | ------------------------------------------ |
| [LICENSE](LICENSE)                                                | License header + pointers                  |
| [docs/legal/AGPL-3.0.txt](docs/legal/AGPL-3.0.txt)                | Canonical AGPL-3.0                         |
| [docs/legal/ADDITIONAL_TERMS.md](docs/legal/ADDITIONAL_TERMS.md)  | Section 7 attribution-preservation terms   |
| [NOTICE](NOTICE)                                                  | Attribution and third-party notices        |

**In plain English:** use, modify, contribute, and self-host freely. You
**cannot** strip credits, remove the donation link, or rebrand-and-redistribute.
Network-hosted modifications must publish their source under AGPL-3.0.

---

*Satisfactory* is a trademark of **Coffee Stain Studios**. This is a fan-made
tool, not affiliated with, endorsed by, or sponsored by Coffee Stain Studios.

<div align="center">

Created and maintained by **Austin Handle** — [@Officer_ASH](https://x.com/Officer_ASH)
&nbsp;·&nbsp; [TikTok](https://www.tiktok.com/@officer.ash)
&nbsp;·&nbsp; [Instagram](https://www.instagram.com/officer.ash)

Copyright © 2026 Austin Handle (Officer ASH).

</div>
