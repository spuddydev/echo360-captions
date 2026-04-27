# Echo360 Captions

A small Firefox and Chrome extension that turns UWA's Echo360 lecture transcripts into on-player closed captions.

UWA's Echo360 player exposes a transcript panel but does not surface those transcripts as captions on the video itself. This extension adds a `CC` button to the Echo360 controls that overlays the active transcript line on top of the player, so you can read along without splitting your attention between the panel and the video.

## What it does

- Activates only on `*.echo360.net.au`.
- Watches the transcript grid for the currently spoken line.
- Adds a `CC` toggle at the start of the player's right-hand control cluster.
- When toggled on, renders the active transcript text as an overlay inside the player.
- Follows the player into and out of fullscreen.
- Works on dual-stream layouts.

## Install (development)

### Firefox

1. Visit `about:debugging#/runtime/this-firefox`.
2. Choose "Load Temporary Add-on".
3. Pick `extension/manifest.json`.

### Chrome / Chromium / Edge

1. Visit `chrome://extensions`.
2. Enable Developer mode.
3. Choose "Load unpacked" and select the `extension/` folder.

## Project layout

```
extension/      Browser extension source (manifest, content script, styles, icons)
store/          Store-listing copy for AMO and the Chrome Web Store
.github/        Issue templates, PR template, CI workflow, dependabot config
```

## Development

```sh
npm install
npm run lint        # eslint over the extension source
npm run format      # prettier write
npm run web-ext     # web-ext lint over the extension folder
npm run build       # produces a packaged zip in dist/
```

Pre-commit hooks run lint and format on staged files via husky and lint-staged.

## Publishing

Store-listing copy and submission notes live in [`store/listing.md`](store/listing.md). The privacy policy is in [`PRIVACY.md`](PRIVACY.md). Release notes go in [`CHANGELOG.md`](CHANGELOG.md).

### Bump the version

1. Edit `version` in `extension/manifest.json` and `package.json`.
2. Move `Unreleased` entries in `CHANGELOG.md` under a new dated heading.
3. Commit, tag (`git tag vX.Y.Z`), push (`git push --tags`).

### Build the package

```sh
npm run build
# → dist/echo360_captions-X.Y.Z.zip
```

### Submit to the Chrome Web Store

1. Sign in at <https://chrome.google.com/webstore/devconsole>.
2. New item → upload `dist/echo360_captions-X.Y.Z.zip`.
3. Paste the description, single-purpose statement and permissions justification from `store/listing.md`.
4. Upload the 128px icon and any promotional tiles.
5. Set distribution to public or unlisted. Submit for review.

### Submit to addons.mozilla.org

1. Sign in at <https://addons.mozilla.org/developers/>.
2. Submit a new add-on → upload `dist/echo360_captions-X.Y.Z.zip`.
3. Paste the summary and detailed description from `store/listing.md`.
4. Source code is hosted publicly so no source upload is required for review.

## Privacy

This extension makes no network requests, declares no permissions, and only runs on `echo360.net.au`. See [PRIVACY.md](PRIVACY.md).

## Notes

- Manifest V3, cross-browser (Firefox 115+, Chromium-based browsers).
- Transcript updates are batched into a single `requestAnimationFrame` per tick, so heavy DOM churn does not flood the overlay.

## Licence

[MIT](LICENSE).
