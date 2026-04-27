# Echo360 Captions

A small Firefox and Chrome extension that turns the live Echo360 transcript into on-player subtitles.

## What it does

- Activates only on `*.echo360.net.au`.
- Watches the transcript grid for the currently spoken line (the row marked with the "status filled" icon).
- Adds a `CC` toggle inside the player's media control bar.
- When toggled on, renders the active transcript text as an overlay inside the media player.

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
extension/      Browser extension source (manifest, content script, styles)
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

## Notes

- Manifest V3, cross-browser (Firefox 115+, Chromium-based browsers).
- Updates are batched into a single `requestAnimationFrame` per tick, so heavy transcript churn does not flood the DOM.
- Icons are not yet bundled. Add PNGs and reference them from `manifest.json` when you have artwork.

## Licence

[MIT](LICENSE).
