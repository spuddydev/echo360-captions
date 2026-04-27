# Store listing copy

Reusable copy for the Chrome Web Store and addons.mozilla.org submission forms.

## Name

Echo360 Captions

## Short name

Echo360 CC

## Summary (≤132 chars, used by Chrome Web Store)

UWA Echo360 lectures expose transcripts, not captions. Adds a CC button that overlays the active transcript on the video player.

## Detailed description

UWA Echo360 lectures provide a transcript panel but no on-screen captions. That makes lectures hard to follow when you are watching at speed, in a noisy room, with the volume off, or simply prefer reading along.

**Echo360 Captions** adds a small CC button to the Echo360 player. When you turn it on, the active transcript line is rendered as a caption overlay directly on top of the video, exactly where you would expect captions to sit. Toggling it off removes the overlay instantly.

### Features

- Adds a captions toggle to the Echo360 player controls.
- Renders the currently spoken transcript line as a caption overlay.
- Follows the player into and out of fullscreen.
- Updates in lock-step with Echo360's own transcript highlighting.
- Works on dual-stream layouts.

### Privacy

This extension does not collect, transmit or store any data. It declares no permissions, requests no network access, and only runs on `echo360.net.au` pages. See [PRIVACY.md](https://github.com/spuddydev/echo360-captions/blob/main/PRIVACY.md).

### Source

Open source on GitHub: https://github.com/spuddydev/echo360-captions

## Categories

- Chrome Web Store: Accessibility
- AMO: Other (or Privacy and Security)

## Tags / keywords

echo360, captions, subtitles, transcript, lecture, accessibility, university, uwa

## Single purpose statement (Chrome Web Store)

The extension has one purpose: render the Echo360 transcript as on-player captions on `echo360.net.au`.

## Permissions justification (Chrome Web Store)

No optional or host permissions are declared. The `content_scripts.matches` field limits injection to `*://*.echo360.net.au/*`. No additional justification needed.

## Support email

hlisle@protonmail.com
