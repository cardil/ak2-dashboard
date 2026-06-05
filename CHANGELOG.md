# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-06-05

### Added
- Full SvelteKit frontend replacing static HTML pages, with E2E tests (#2)
- Extended C API surface for printer status, controls, and file management (#2)
- High-FPS webcam streaming via threaded implementation (#1)
- Z-offset stored per leveling slot (#7)
- Bed mesh 3D visualization using ECharts GL (#2)
- Print history tracking (#2)
- Configuration profile management (save/load leveling slots) (#2)
- Per-file license separation: Apache 2.0 for frontend, GPL-2.0 for C backend (#19)
- SSH and reboot API endpoints
- Config file (`webserver.json`) support
- Printer model auto-detection (Plus and Max variants)
- Log viewer with clear log button
- Power-off button for printer control
- Uptime in `/api/info.json`

### Changed
- Replaced MUSL with glibc for ARM cross-compilation
- Compact card titles and improved leveling page layout (#9)
- CI build caching via ghcr.io registry (#3)
- Removed dead C backend code (deprecated endpoints) (#8)

### Fixed
- Leveling page overflow (#9)
- Grid size change and initialization bugs
- RGB channel order in webcam page
- Model detection for Kobra 2 Plus and Max

### Removed
- Static HTML web pages (replaced by SvelteKit SPA)
- Deprecated API paths

---

*This project is a fork of [ACK2-Webserver](https://github.com/AGG2017/ACK2-Webserver) by @AGG2017.*
*Original firmware tools by ultimateshadsform.*

[Unreleased]: https://github.com/cardil/ak2-dashboard/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/cardil/ak2-dashboard/releases/tag/v1.0.0
