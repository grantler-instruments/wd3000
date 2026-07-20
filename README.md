# WD3000

Desktop performer and protocol debugger for MIDI, OSC, TUIO, Art-Net, and MQTT. Built with Tauri, React, and TypeScript.

**Site:** https://grantler-instruments.github.io/wd3000/  
**Web app:** https://grantler-instruments.github.io/wd3000/app/  
**Privacy policy:** https://grantler-instruments.github.io/wd3000/privacy  
**Downloads:** https://github.com/grantler-instruments/wd3000/releases/latest

[![CI](https://github.com/grantler-instruments/wd3000/actions/workflows/ci.yml/badge.svg)](https://github.com/grantler-instruments/wd3000/actions/workflows/ci.yml)

## Features

- **Performer** — playable UI, phone sensors, and MediaPipe tracking
- **Debugger** — inspect and compose MIDI, OSC, TUIO, Art-Net, and MQTT traffic
- **Free desktop** — open source builds for macOS, Windows, and Linux

## Development

```bash
npm install
npm run tauri dev
```

| Command | What |
| --- | --- |
| `npm run dev` | Vite frontend only (http://localhost:1420/wd3000/app/) |
| `npm run tauri dev` | Desktop app |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright e2e |
| `npm run website:dev` | Marketing site (http://localhost:5174/wd3000/) |
| `npm run build:pages` | Marketing + app → `site/` for GitHub Pages |

## GitHub Pages

CI deploys `site/` after a successful run on `main`:

| URL | What |
| --- | --- |
| `/wd3000/` | Marketing site (`website/`) |
| `/wd3000/app/` | Web build of the React frontend |
| `/wd3000/privacy` | Privacy policy |

Enable **Settings → Pages → Source: GitHub Actions** on the repo. Desktop installers still ship via GitHub Releases (`npm run` tag → Release workflow).

## Marketing site

The landing page lives in [`website/`](website/) (separate from the app frontend in `src/`). It uses React, MUI, Zustand, and the Grantler dark theme.

```bash
cd website && npm install
npm run website:dev
```

## Support

If you find WD3000 useful, you can support development:

[![Buy Me A Coffee](https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png)](https://buymeacoffee.com/thomasgeissl)

## License

This project is licensed under the [GNU Lesser General Public License v3.0](LICENSE) (LGPL-3.0).

Copyright (C) 2026 Grantler Instruments

You are free to use, modify, and distribute this software under the terms of the LGPL-3.0. If you distribute a modified version of this project, or use it as a library in a larger application, the LGPL requires that recipients can access and modify the LGPL-covered portions of the software. See the [LICENSE](LICENSE) file for the full text.
