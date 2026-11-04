# SHATTERED MEMORIES

A standalone browser survival-horror game plus a separate native PSP homebrew project. **Base44 is not required.** The browser game stores progress in the player's browser using `localStorage`; there is no sign-in or game server.

## Web version

The complete browser-game source is in this project. Requirements: Node.js 20.19+ and npm.

```sh
npm install
npm run dev
```

Open the local address printed by Vite. To create a static web build:

```sh
npm run build
```

The finished website is written to `dist/`. Upload the contents of that folder to any static web host, or run a local static server from that folder. The game uses hash-based navigation so its page routes work on static hosting. It does not need Base44 or a backend.

The **Download web project** link in the home-page footer downloads the browser source project ZIP. The ZIP is source code, not a precompiled website; install the npm packages and run the commands above to launch or build it.

## PSP homebrew

The PSP build is a separate C project in `psp/` and can also be downloaded from the in-game **PSP Homebrew** page. The PSP page has a browser-generated ZIP button and a direct packaged ZIP link. Both work without a server-side function.

Build requirements: a working PSPSDK toolchain (`psp-gcc`, `psp-config`).

```sh
export PSPDEV=/usr/local/pspdev
export PATH="$PATH:$PSPDEV/bin"
cd psp
make
```

The build produces `EBOOT.PBP` (and the PRX output) in the PSP project folder. Copy the EBOOT to:

`ms0:/PSP/GAME/ShatteredMemories/EBOOT.PBP`

The native PSP source is included, but the EBOOT has not been compiled or hardware-tested in this delivery environment because PSPSDK is not installed. See `psp/README.md` for controls and implementation limits.

## Included

- `src/game/`: browser renderer, procedural room generation, textures, sprites, audio and progression.
- `src/pages/`: browser game, shop, maps, field index, settings and download pages.
- `psp/`: native PSP source, Makefile and artwork.
- `public/downloads/`: downloadable web-source and PSP ZIP archives.

## Notes

- Game progress is stored locally in the browser. Clearing site data clears that local save.
- Web fonts are loaded from Google Fonts when online; the game itself does not require a Base44 service.
- The PSP build is intentionally simplified for PSP hardware. Its README lists systems that are not present in the native port.
