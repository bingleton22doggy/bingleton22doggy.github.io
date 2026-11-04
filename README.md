# SHATTERED MEMORIES
### Complete Project Documentation

**Platforms:** Web Browser / Sony PSP  
**Project Type:** Standalone Horror Game  
**Base44 Dependency:** Removed

---

# 1. PROJECT OVERVIEW

Shattered Memories is a horror game project with two separate versions:

- **Web Version:** A browser-based version that can run independently without Base44.
- **PSP Version:** A separate homebrew version designed for the PlayStation Portable.

Both versions are included in the full project package.

The web version also includes a download option for the PSP version.

# 2. PROJECT STRUCTURE

The complete project should contain the following:

```text
ShatteredMemories/
│
├── README.md
│
├── Web/
│   ├── package.json
│   ├── index.html
│   ├── src/
│   ├── public/
│   │   └── downloads/
│   │       └── ShatteredMemories_PSP.zip
│   └── ...
│
├── PSP/
│   ├── Makefile
│   ├── README.md
│   ├── main.c
│   ├── assets/
│   └── ...
│
└── Downloads/
    ├── ShatteredMemories_Web.zip
    └── ShatteredMemories_PSP.zip
```

*Folder names may differ depending on the exported package.*

# 3. WEB VERSION

The web version is designed to operate independently of Base44.

### Requirements

- Node.js
- npm
- A modern web browser

### Installation

1. Extract the complete project ZIP.
2. Open a terminal in the Web folder.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open the local address displayed in the terminal.

### Production Build

To create an optimized production version:

```bash
npm run build
```

The generated website will normally be placed inside:

```text
dist/
```

The contents of this folder can be deployed to a static web host.

### PSP Download

The web version includes a PSP download option.

The downloadable PSP ZIP should be located at:

```text
public/downloads/ShatteredMemories_PSP.zip
```

The website should link to this file using a relative path:

```text
/downloads/ShatteredMemories_PSP.zip
```

Make sure the PSP ZIP is included before building the production website.

# 4. PSP VERSION

The PSP version is a separate homebrew project.

### Requirements

- Sony PSP (1000 supported)
- PSP Custom Firmware (for homebrew installation)
- PSPSDK development environment
- PSP-compatible assets

### Compiling

Open a terminal inside the PSP source directory.

Run:

```bash
make
```

If compilation succeeds, the generated executable should be:

```text
EBOOT.PBP
```

### PSP Installation

Once a valid EBOOT.PBP has been compiled:

1. Connect the PSP memory stick to a computer.
2. Open the `PSP/GAME/` directory.
3. Create a folder named `ShatteredMemories`.
4. Place `EBOOT.PBP` inside that folder.

The final structure should look like:

```text
PSP/
└── GAME/
    └── ShatteredMemories/
        └── EBOOT.PBP
```

Disconnect the memory stick safely.

The game should appear under Game > Memory Stick on the PSP.

**Important:** The source project is not itself an installable PSP game. A successfully compiled EBOOT.PBP is required.

# 5. FULL PROJECT EXPORT

The full ZIP is intended to contain:

- Complete web source code.
- Complete PSP source code.
- Web dependencies manifest.
- PSP Makefile.
- PSP assets.
- PSP downloadable ZIP.
- Project documentation.

The full ZIP should preserve both versions as separate projects.

Do not remove the PSP download archive from the web version's `public/downloads` directory.

# 6. BASE44 INDEPENDENCE

The web version should not require:

- Base44 authentication.
- Base44 hosting.
- Base44 SDK services.
- Base44-specific routing.
- Base44 account access.

Browser functionality should operate independently.

Game saves should use browser-local storage where supported.

# 7. TROUBLESHOOTING

### Web version will not start

Try:

```bash
npm install
npm run dev
```

Check that Node.js and npm are installed.

### PSP ZIP download does not work

Check that this file exists:

```text
public/downloads/ShatteredMemories_PSP.zip
```

Check that the website's download link points to the correct relative path.

### PSP game does not appear

Check that:

- The PSP has compatible custom firmware.
- The file is named `EBOOT.PBP`.
- The folder is inside `PSP/GAME/`.
- The executable was successfully compiled for the PSP.

### PSP compilation fails

Check that PSPSDK is installed and configured correctly.

Review compiler errors and missing asset references.

# 8. IMPORTANT NOTES

- The web and PSP versions are separate builds.
- Changes to one version do not automatically update the other.
- The PSP version requires its own compilation process.
- The web version can be hosted independently.
- The full project ZIP should preserve all source files and assets.
- Never distribute an uncompiled PSP source folder as though it contains a working EBOOT.PBP.

---

**SHATTERED MEMORIES**

Complete Web + PSP Project

Standalone project documentation.
