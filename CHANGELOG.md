# Changelog

All notable changes to this project will be documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.4.1] - 2026-09-21

### Fixed

- The minus and plus now appear only once the pointer is close to the captions, instead of well before you are anywhere near them.
- Pressing one no longer leaves the pair on screen after the pointer has moved away.
- They now go when the player hides its own controls, and after a few seconds of you not using them.
- A gap in the speech no longer takes them away while you are reaching for them. The captions still go, as before.
- They no longer creep out from under the pointer as the text grows or shrinks, so you can hold one down or press it over and over and every press lands.

## [0.4.0] - 2026-09-21

### Added

- Drag the captions anywhere on the video. They stay where you put them for the rest of the lecture and go back to their usual spot next time.
- Make the captions bigger or smaller. Move the pointer near them and a minus and plus pair appears just below. The size you pick is remembered for the next lecture, the same way the on and off setting already is.

## [0.3.0] - 2026-05-08

### Added

- The captions toggle now remembers its state across reloads and lectures. Turn captions on once and they stay on the next time you open a lecture; turn them off and they stay off until you toggle again.

## [0.2.1] - 2026-04-27

### Changed

- Tighten the content script match pattern to https only so the Chrome Web Store does not flag the listing for an in-depth host permission review.
- New extension icon artwork at all five sizes.

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

[Unreleased]: https://github.com/spuddydev/echo360-captions/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/spuddydev/echo360-captions/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/spuddydev/echo360-captions/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/spuddydev/echo360-captions/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/spuddydev/echo360-captions/compare/v0.1.1...v0.2.0
[0.1.1]: https://github.com/spuddydev/echo360-captions/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/spuddydev/echo360-captions/releases/tag/v0.1.0
