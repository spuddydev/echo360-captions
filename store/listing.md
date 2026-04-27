# Store listing copy

Reusable copy for the Chrome Web Store and addons.mozilla.org submission forms.

## Name

Echo360 Captions

## Short name

Echo360 CC

## Summary (≤132 chars, used by Chrome Web Store and AMO)

Echo360 shows lecture transcripts but not on-screen captions. Adds a CC button that overlays the active transcript on the video.

## Detailed description

Echo360 hosts lecture videos and shows a transcript panel beside the player, but it does not surface those transcripts as captions on the video itself. That makes lectures hard to follow when you are watching at speed, in a noisy room, with the volume off, or when reading along is simply easier than listening.

Echo360 Captions adds a small CC button to the Echo360 player. Toggle it on and the active transcript line is rendered as a caption overlay directly on top of the video, exactly where captions belong. Toggle it off and the overlay disappears. Captions follow the player into and out of fullscreen, and dual-stream layouts are handled.

The extension opens the Echo360 transcripts panel for you on load, since Echo360 only mounts the transcript text into the page once that panel is the active sidebar tab. If the panel ever ends up closed, just click the Transcripts button in the player controls again.

The extension only runs on echo360.net.au pages. It declares no permissions, makes no network requests, and does not collect, transmit or store any data. All processing happens locally in your browser using the transcript that Echo360 already renders on the page.

This was developed and tested against the University of Western Australia's Echo360 deployment. Echo360 is a general lecture-capture platform used at many institutions and the extension should work wherever the player and transcript layout match. If it does not work for your institution, please open an issue with a snippet of the relevant page markup so the selectors can be widened.

Source, issues and privacy policy: https://github.com/spuddydev/echo360-captions

## Notes to reviewer

Source code (matches the uploaded zip exactly): https://github.com/spuddydev/echo360-captions — MIT, no minification, no transpilation. Build: `npm install && npm run build` which calls `web-ext build`.

Scope: a single content script (`content.js`) and stylesheet (`content.css`) injected only on `*://*.echo360.net.au/*` via `content_scripts.matches`. No background script, no host or API permissions, no storage, no network requests, no analytics.

What it does: reads transcript text already in the DOM (the row in `.ReactVirtualized__Grid` flagged as the active line by Echo360) and renders that text in an absolutely positioned `<div>` overlay attached to the player element. A toggle button is injected into the existing player control cluster.

Testing requires logging in to any Echo360 instance and opening a lecture that has a transcript. The extension opens the transcripts panel for the user on bootstrap, but Echo360 lazily mounts the transcript DOM only once that tab has been the active sidebar tab at least once for the lecture. Development was on the University of Western Australia deployment (`echo360.net.au`). I do not have public test credentials to share, but the linked GitHub repo includes a description of the DOM markers used so the behaviour can be verified against captured fixtures. Happy to provide a recorded walkthrough on request.

### Data and privacy

This extension does not collect, transmit, store, or share any user data.

- No analytics, telemetry, error reporting or remote logging.
- No network requests of its own — the content script only reads DOM that Echo360 has already rendered.
- No cookies, localStorage, sessionStorage, IndexedDB or any other browser storage.
- No background script, no service worker, no popup, no options page.
- No host or API permissions are declared. The content script is scoped to `*://*.echo360.net.au/*` via `content_scripts.matches`.
- `browser_specific_settings.gecko.data_collection_permissions.required` is set to `["none"]` to declare this explicitly to Firefox.

All processing is purely DOM-side: the script reads transcript text already on the page and renders it back onto the same page as a caption overlay. The text never leaves the browser.

## Categories

- Chrome Web Store: Accessibility
- AMO: Other (or Privacy and Security)

## Tags / keywords

echo360, captions, subtitles, transcript, lecture, accessibility

## Single purpose statement (Chrome Web Store)

The extension has one purpose: render the Echo360 transcript as on-player captions on `echo360.net.au`.

## Permissions justification (Chrome Web Store)

No optional or host permissions are declared. The `content_scripts.matches` field limits injection to `*://*.echo360.net.au/*`. No additional justification needed.

## Support email

hlisle@protonmail.com
