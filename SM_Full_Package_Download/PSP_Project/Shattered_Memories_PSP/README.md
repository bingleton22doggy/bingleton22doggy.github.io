# SHATTERED MEMORIES — Sony PSP homebrew build

A native C implementation of the Shattered Memories hallway loop for the
Sony PSP, built against PSPSDK. This is a separate native project, not the
browser game wrapped in an archive.

## What this build is

* 480 x 272 output, 16:9, rendered through the GU (sceGu*).
* Raycast corridors: one textured wall column per screen column, DDA against
  a tile grid, per-column distance buffer.
* Procedural rooms: recursive-backtracker maze, braided loops, widened pockets,
  a hidden brown-door room, extra furniture, and locked exits with keys.
* Procedural textures generated at boot into 8-bit (T8) paletted textures.
  No PNG/TM2 assets are required except the EBOOT artwork.
* Searchable footlockers, desks, dressers and cabinets; hideable beds; coins;
  lantern with battery.
* Open a brown door with CROSS to enter its furnished side room. Open a cabinet
  or bed and press CROSS again to hide; CIRCLE lets you leave the hiding place.
* Faster creatures respect walls and furniture. A generated low rumble grows
  louder as one approaches; close encounters trigger a centered visual scare.
* Creatures have per-type warning messages, pursuit and a lethal proximity check.
* SELECT toggles the performance overlay: FPS, free RAM (sceKernelTotalFreeMemSize)
  and battery percentage (scePowerGetBatteryLifePercent). These are read from
  the hardware; nothing is hard-coded.

## What is simplified compared with the browser build

The PSP has no depth-tested billboard pipeline here, so:

* Floor and ceiling are gradient quads rather than per-pixel floor casting.
* Sprites are a single 128x128 paletted atlas (cabinet / chest / creature / coin)
  drawn as alpha-tested billboards.
* One creature type set of four silhouettes, no per-frame skeletal animation.
* Particles and screen distortion are reduced; the jumpscare is a brief 2D face
  flash rather than a full-screen animated creature model.
* The shop and the field index are not yet implemented on the PSP; the browser
  build is the reference for those systems.

These are deliberate reductions for memory and fill rate, not missing features
hidden behind a placeholder.

## Controls

| Input | Action |
| --- | --- |
| Analog stick | Move / strafe |
| L trigger | Look left |
| R trigger | Look right |
| Cross | Interact, open, search, hide |
| Circle | Leave hiding place |
| Square | Lantern |
| Triangle | Index counter |
| Select | Performance overlay |
| Start | Pause |

## Building

You need a working PSPSDK toolchain (psp-gcc, psp-config).

    export PSPDEV=/usr/local/pspdev
    export PATH=$PATH:$PSPDEV/bin
    make

The result is EBOOT.PBP in the project root, plus
ShatteredMemories.prx. Copy EBOOT.PBP into

    ms0:/PSP/GAME/ShatteredMemories/EBOOT.PBP

## Status

The source in this archive has not been compiled or run against hardware or an
emulator as part of this delivery. It is written for PSPSDK and the GU API, and
the calls used are the standard ones, but you must build it with your toolchain
and expect to fix small issues. No EBOOT.PBP is included because it can only be
produced by a PSP build environment.

## Ad-hoc multiplayer

PSP ad-hoc multiplayer is **not implemented**. The requirement is recorded here
as future work: the intended approach is sceNetAdhoc + sceNetAdhocMatching,
synchronising player position and heading at ~10 Hz, with one additional
low-poly player billboard drawn from a shared atlas quadrant. It is not present
in this source and must not be described as working.
