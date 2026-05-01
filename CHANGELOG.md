# Changelog

All notable changes to the Satisfactory Layout Tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-05-01

### Changed
- **Open-sourced under AGPL-3.0-or-later** with attribution-preservation additional terms.
- Removed the closed beta system: no beta keys, no login, no Supabase backend.
- Removed PostHog analytics, session recording, and the "Privacy" settings panel section.
- Renamed portable packaging scripts (`package-beta.*` → `package-portable.*`) and output dir (`dist-beta/` → `dist-portable/`).
- Replaced the in-distribution "Proprietary Beta Test Agreement" with the real `LICENSE`, `docs/legal/AGPL-3.0.txt`, `docs/legal/ADDITIONAL_TERMS.md`, and `NOTICE` files.
- Updated all GitHub repo references to the public `HandleConsolidated/nexus-satisfactory-layout-tool` repo.

### Added
- `LICENSE`, `docs/legal/AGPL-3.0.txt`, `docs/legal/ADDITIONAL_TERMS.md`, `NOTICE` files at repo root.
- `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md` at repo root.
- README Quick Start section for users, builders, and contributors.

### Removed
- `src/services/supabase.ts`, `src/services/posthog.ts` and the entire `services/` directory.
- `src/hooks/useBetaKey.ts`, `src/hooks/useAnalytics.ts`.
- `src/components/UI/BetaKeyGate.tsx`, `src/components/UI/BetaAgreementModal.tsx`.
- `@supabase/supabase-js` and `posthog-js` dependencies (47 transitive packages dropped).
- Internal documentation and research notes (`CLAUDE.md`, `GEMINI.md`, `BETA_*.md`, `docs/plans/`, `project_systems/`, `supabase/`).

## [2.0.0-beta.5] - 2026-02-04

### Fixed
- **Issue(s) #1-4**: Building label no longer rotates when you rotate the building, Splitter drag area increased, Grid snapping sensitivity increased, Submenus not being clickable/closing due to interaction below it. (**Shoutout to Maibaum68 & Felzow47!**)
- **Critical: Canvas drag FPS**: Fixed drop from 60fps to 10fps while dragging
- **Critical: Mouse hover performance**: Fixed FPS drop from 61fps to 20fps on hover
- **Zoom/scroll wheel lag**: Eliminated lag during zoom operations
- **Viewport culling issues**: Fixed grid rendering during pan
- **Pipe curves**: Now uses tight elbows instead of long bezier curves
- **Delete key**: Now works for railways, conveyors, and pipes (was broken)
- **Resizable side panels**: Fixed drag to resize Building Palette and Properties Panel
- **Miners showing "Idle" in production panel**: Now correctly detects extractedResourceId for extraction buildings
- **Chevron direction on ports**: Fixed backwards chevrons on all port types

### Added
- **Comprehensive production simulation system**: Full implementation of Satisfactory-style production tracking
  - Real-time material flow calculations with push/pull analysis
  - Fluid vs solid material separation
  - Station sources (train stations as material inputs)
  - Storage accumulation tracking with fill time estimation
  - Bottleneck detection and severity classification
- **Power system**: Complete powerline drawing and power simulation
  - Draw powerlines between buildings and power poles
  - Power consumption vs generation tracking in Production Panel
  - L-shaped routing toggle button in toolbar for cleaner layouts
- **Production Panel (UI)**: Complete factory overview panel
  - Factory health score with visual indicator
  - Power consumption vs generation tracking
  - Fluid summary section with production/consumption/net flow
  - Station sources section for train station inputs
  - Storage accumulation warnings with fill time estimates
  - Building-by-building production status view
  - Aggregate inputs/outputs view mode
  - Issues/bottlenecks section with severity badges
  - **Draggable panel** - can be moved freely when unpinned
  - Ultra-compact design for minimal screen intrusion
  - High z-index (100) to stay above other UI elements
- **Production overlays on canvas**: Visual indicators for production status
  - Building production badges showing efficiency percentages
  - Conveyor flow rate overlays (items/min)
  - Pipeline flow rate overlays with fluid type indicators
  - Bottleneck highlighting with red glow effects
  - LOD-aware rendering for performance
- **Miner/extractor resource extraction**: Extraction buildings now tracked properly
  - Mining output based on selected resource type
  - Clock speed affects output rate
  - Proper status display in production panel (not showing "Idle" anymore)
- **Conveyor belt animations**: Visual flow animations on conveyor belts
  - Performance-mode aware (disabled in performance mode)
  - Directional flow indication
- **Error boundary**: Graceful crash recovery instead of blank screen
- **Recipe selection system**: RecipeDropdown for choosing building recipes
- **Enhanced train station visuals**: Detailed tracks, platforms, cargo areas

### Changed
- **Input/output port chevrons**: Fixed direction to correctly show material flow
  - Front edge points UP (away from building)
  - Back edge points DOWN (away from building)
  - Left/Right edges point outward correctly
  - Input ports have chevrons pointing INTO building
  - Output ports have chevrons pointing OUT OF building
- **Grid snapping**: Changed from 0.5m to 4m to match visible grid lines
  - Only snaps when within 35% of grid cell (was always snapping)
  - More intuitive placement behavior
- **Fluid overlay badges**: Redesigned for better readability
  - Proper vertical stacking layout
  - Fluid type indicator with icon
  - Flow rate prominently displayed
  - Utilization bar at bottom
  - Reduced font sizes for balance
- **Rust viewport system**: Integrated for smoother dragging


---

## [2.0.0-beta.4] - 2026-02-04

### Added
- **Powerline visibility toggle**: Three display modes accessible in Settings panel
  - Show (full visibility)
  - Semi-transparent (30% opacity)
  - Hide (completely hidden)
- **Powerline right-angle routing**: L-shaped routing mode for cleaner power layouts
  - Direct mode (straight lines) or Right-Angle mode (L-shaped paths)
  - Control points stored for proper path rendering
- **Building height blocking**: Tall buildings now block placement on floors above
  - Calculates floor span based on building height (e.g., 100m building spans 25 floors)
  - Visual feedback with "Blocked by [Building Name] from floor X" message
  - Prevents both drag-and-drop and click-to-place on blocked areas
  - Tall buildings from lower floors now appear as transparent outlines on higher floors

### Changed
- **Train station dimensions**: Corrected width/height to match Satisfactory game
  - Width: 16m (short left-to-right), Height: 34m (deep along track)
  - Railway points repositioned: track runs left-to-right through stations
  - Conveyor/pipe connections on freight platforms moved to back side
  - Applies to: Train Station, Freight Platform, Fluid Freight Platform, Empty Platform
- **Grid snapping sensitivity**: Increased threshold to 50% for more reliable snapping
  - Objects now snap when within half a grid cell of a grid line

### Fixed
- **Conveyor belt nodes not visible**: Fixed poles disappearing after drawing when Rust backend active
  - Viewport system now uses frontend store data for conveyor poles instead of Rust spatial query
  - Poles created during drawing are now immediately visible and selectable
- **Powerline connection snapping**: Now correctly uses connection point world position instead of building center
- **Powerline rotation bug**: Rotating buildings now properly updates powerline endpoint positions
- **Railway track selection**: Added invisible hit area in the interactive layer for click detection
- **Railway preview curving**: Preview now uses the same curve calculation as final rendering, ensuring accurate previews

---

## [2.0.0-beta.3] - 2026-02-02

### Added
- **Release notes management system**: JSON-based release notes with easy update workflow
  - Release data stored in `src/data/releases.json` for easy editing
  - Script `scripts/add-release.js` for adding new releases via CLI
  - npm script: `npm run add-release` for quick additions
  - Release Notes panel now shows all historical releases (expandable)
- **Conveyor belt endpoint nodes**: Clickable "Free End" indicators for unconnected belt ends
  - Orange dashed circles with pulse animation when conveyor tool is active
  - Click to continue drawing from an endpoint
  - Click to connect two unconnected belt ends together
  - Labels appear at high zoom: "Free End", "Click to continue"
  - New files: `endpointDetection.ts`, `EndpointNodeShape.tsx`
- **Power connections for train stations**: All station types now have power input connections
  - Train Station: 50 MW power consumption
  - Freight Platform: 50 MW power consumption (plus existing cargo in/out)
  - Fluid Freight Platform: 50 MW power consumption (plus existing fluid in/out)
- **Power pole visual enhancements**: Game-accurate industrial design
  - Lightning bolt icon at top of each pole
  - Connection capacity badge showing current/max (e.g., "2/4")
  - Power status ring (green = connected, gray = isolated)
  - Tier-based visual differences (Mk1/Mk2/Mk3/Tower with different heights and insulator colors)
  - FICSIT orange metallic accents
- **Powerline calculator architecture**: Comprehensive design document for future power flow calculations
  - PowerNetworkGraph, PowerNode, PowerEdge data structures
  - DFS/BFS connected component detection algorithm
  - 5-phase implementation roadmap with Rust backend integration plan

### Changed
- **Building colors**: Complete overhaul to match Satisfactory's industrial aesthetic
  - Production buildings (smelters, constructors): Industrial grays/blues
  - Logistics (conveyors, storage): Neutral steel colors
  - Power (generators): Subtle amber/yellow tones
  - Extractors/miners: Earthy brown/rust tones
  - Colors now organized logically by category instead of random assignment
- **Building label fonts**: Replaced shadow effects with bold modern font styling
  - Uses Inter/system fonts with bold weight for better readability
  - Simpler, cleaner text rendering in all quality modes
  - Properly respects performance mode settings
- **Connection point colors**: Now match Satisfactory game accurately
  - Inputs = Orange (#FA9549) - matches game's manifold symbols
  - Outputs = Green (#4a7c59) - matches game's output arrows
  - Bidirectional = Teal (#7CD2B9)
  - Added inner glow effects and double-layered arrow indicators
- **Floor selector**: Repositioned and restyled
  - Now located next to fullscreen toggle button
  - Compact styling integrated with toolbar aesthetic
  - Vertical dividers for visual separation
- **Railway rendering**: Two-layer system for tracks through buildings
  - Under layer (ballast) renders before buildings at 60% opacity
  - Over layer (rails/ties) renders after buildings
  - Creates visual effect of tracks running through train stations

### Fixed
- **Critical: Sticky notes deleting while typing**: Keyboard handler now properly ignores Delete/Backspace when focus is in text input fields
- **Sticky notes glass blur bug**: Editing textarea now uses the note's actual color instead of glassmorphism styling
- **Connection point arrow directions**: Arrows now correctly rotate with buildings, showing proper flow direction at all rotations
- **Context menu submenu gap**: Added hover bridge zone to prevent submenus from closing when navigating to them (affects "Add Building" and "Current Floor" submenus)
- **Powerline visibility**: Fixed ID format mismatch preventing powerlines from rendering
  - `getPoleData()` now correctly parses `power-anchor-{buildingId}-{powerPointId}` format
  - Powerlines now properly render between buildings after drawing

---

## [2.0.0-beta.2] - 2026-01-13

### Added
- **Auto-update system**: Automatic update checking and installation via Tauri updater plugin
  - Checks for updates on startup (production builds only)
  - "Check for Updates" menu item in Help menu
  - Download progress indicator with percentage and size
  - Automatic app relaunch after update installation
- **File size validation**: Layout imports now validate file size before processing
  - 50 MB maximum file size limit
  - User-friendly error messages for oversized and empty files
  - Prevents memory issues from excessively large files
- **Update notification UI**: Non-intrusive toast notification for available updates
  - Shows version information and release notes
  - Download progress bar with real-time updates
  - Options to update now or defer

### Changed
- **Help menu**: Added "Check for Updates" option with loading indicator
- **CSP configuration**: Updated to allow connections to GitHub API for update checks

### Fixed
- **Security**: Replaced `eval()` with safer `Function` constructor in tauriHelper.ts
- **Security**: Added `noopener,noreferrer` to all external `window.open()` calls in MenuBar
- **URLs**: Fixed placeholder GitHub URLs in FeedbackButton and MenuBar components
- **About dialog**: Now displays dynamic version from APP_VERSION constant instead of hardcoded value
- **Repository URL**: Fixed Cargo.toml repository URL to match actual GitHub repository
- **Dependencies**: Updated npm packages to fix 5 security vulnerabilities

### Security
- Created MIT LICENSE file at project root
- Added version.ts for centralized version management
- Improved external link security with proper rel attributes
- Removed eval() usage which required unsafe-eval CSP directive

---

## [2.0.0-beta.1] - 2026-01-12

### Added
- **Multi-floor support**: Design factories across multiple vertical floors (z-levels) with 4-meter spacing
- **Railway system**: Complete railway drawing with automatic curve generation, intersection detection, and train station snapping
- **Conveyor belt system**: Draw conveyor belts with smooth curves, automatic merging, and belt tier selection
- **Pipe system**: Fluid pipeline drawing with support for multiple fluid types and automatic routing
- **Building palette**: Comprehensive building library organized by category
- **Properties panel**: Edit selected building properties, connections, and metadata
- **Sticky notes**: Add annotations to your layout with customizable colors
- **Keyboard shortcuts**: Efficient workflow with customizable hotkeys
- **Undo/Redo**: Full history support for all operations
- **Save/Load**: Export and import layouts as JSON files
- **Dark theme**: Modern dark UI optimized for extended use

### Performance
- **Rust backend**: High-performance calculations using Rust with SIMD optimizations
- **GPU acceleration**: WebGPU-based rendering for smooth canvas interactions
- **Spatial indexing**: R-tree based spatial queries for efficient intersection detection
- **Viewport culling**: Only render visible elements for improved performance with large layouts

### Technical
- **Tauri 2.7**: Native desktop application with minimal footprint
- **React 19**: Modern React with concurrent features
- **Konva canvas**: Hardware-accelerated 2D canvas rendering
- **Zustand state management**: Predictable state with optimized selectors

### Known Issues
- Code signing not yet implemented (security warnings on first launch)
- Some tests are skipped pending feature completion
- Railway hover behavior may need refinement in complex layouts

### Platform Support
- Windows 10/11 (x64)
- macOS 12+ (Intel and Apple Silicon)
- Linux (x64) - Ubuntu 22.04+, Fedora, and other major distributions

---

## [Unreleased]

### Planned Features
- Code signing for trusted installation
- Production calculator integration
- Blueprint sharing and import
- Advanced analytics dashboard
- Cloud sync for layouts

---

## Version History

| Version | Date | Type |
|---------|------|------|
| 2.0.0 | 2026-05-01 | Open-source release (AGPL-3.0) |
| 2.0.0-beta.5 | 2026-02-04 | Closed beta |
| 2.0.0-beta.4 | 2026-02-04 | Closed beta |
| 2.0.0-beta.3 | 2026-02-02 | Closed beta |
| 2.0.0-beta.2 | 2026-01-13 | Closed beta |
| 2.0.0-beta.1 | 2026-01-12 | Closed beta |

---

## Upgrade Notes

### From Previous Versions
2.0.0 is the first public open-source release. Closed-beta builds are
backward-compatible with this version's save format. The beta key entry
screen has been removed; the app now launches directly to the canvas.

### Save File Compatibility
Save files from this version may not be compatible with future releases as the format stabilizes. We recommend keeping backups of important layouts.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to this project.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
