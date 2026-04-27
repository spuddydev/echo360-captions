# Privacy Policy

**Echo360 Captions** does not collect, transmit, or store any personal data.

## What the extension does

The content script runs only on `*.echo360.net.au` pages. It reads the transcript text that Echo360 already renders in the page DOM and displays the active line as a caption overlay on the video player. All processing happens locally in your browser.

## What it does not do

- It makes no network requests of its own.
- It does not communicate with the developer or any third party.
- It does not use cookies, local storage, IndexedDB, analytics or telemetry.
- It does not read or modify content on any site outside echo360.net.au.

## Permissions

The extension declares no `permissions` in its manifest. The content script is injected only on hosts that match `https://*.echo360.net.au/*`, as specified in `content_scripts.matches`.

## Contact

For questions about this policy, open an issue at <https://github.com/spuddydev/echo360-captions/issues> or email **hlisle@protonmail.com**.

Last updated: 2026-04-27.
