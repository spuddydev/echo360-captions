# Changelog

All notable changes to this project will be documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.2.0] - 2026-04-27

### Added

- Auto-opens the Echo360 transcripts panel on page load so the transcript DOM is mounted and captions work without an extra click. Re-opens the panel if you toggle captions on after closing it.

## [0.1.1] - 2026-04-27

### Changed

- Bumped Firefox strict minimum version to 140 and Android to 142 so the gecko data collection permissions field is accepted without warnings.

## [0.1.0] - 2026-04-27

### Added

- Closed-caption overlay rendered from the active Echo360 transcript line.
- Toggle button injected at the start of the player's right control cluster.
- Cross-browser Manifest V3 support, scoped to `*.echo360.net.au`.
- Captions follow the player into and out of fullscreen.
- Icons at 16, 32, 48, 96 and 128 pixels.

[Unreleased]: https://github.com/spuddydev/echo360-captions/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/spuddydev/echo360-captions/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/spuddydev/echo360-captions/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/spuddydev/echo360-captions/releases/tag/v0.1.0
