# Echo360 Captions

Turns Echo360 lecture transcripts into on-player closed captions.

Echo360 shows transcripts in a side panel but does not surface them as captions on the video. This extension adds a small `CC` button to the player. Toggle it on and the active transcript line appears as a caption overlay on top of the video, exactly where you would expect captions to sit.

## Install

<!-- TODO: replace with the AMO and Chrome Web Store links once published. -->

- **Firefox**: _coming soon._
- **Chrome / Edge**: _coming soon._

## Features

- Adds a captions toggle to the Echo360 player controls.
- Renders the currently spoken transcript line as a caption overlay.
- Follows the player into and out of fullscreen.
- Updates in lock-step with Echo360's own transcript highlighting.
- Works on dual-stream layouts.
- Auto-opens the transcripts panel on load so captions work without an extra click.
- Only runs on `echo360.net.au`.

## Usage

Click the new **CC** button at the start of the right-hand cluster of player controls to toggle captions on or off. The extension opens the transcripts panel for you on load; if for any reason it isn't open, click the **Transcripts** button in the player controls.

## Compatibility

This was developed and tested against the University of Western Australia's Echo360 deployment. Echo360 is a general lecture-capture platform used at many institutions and the extension should work wherever the player and transcript layout match. If it does not work on your institution's deployment, please open an issue with a snippet of the relevant page markup so the selectors can be widened.

## Privacy

The extension makes no network requests, declares no permissions, and only runs on `echo360.net.au`. It does not collect, transmit or store any data. Full policy in [PRIVACY.md](PRIVACY.md).

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for the development setup. The project uses ESLint, Prettier and `web-ext` to keep the source tidy.

## Licence

[MIT](LICENSE).
