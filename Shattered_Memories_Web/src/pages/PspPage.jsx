import { useState } from 'react';
import { Link } from 'react-router-dom';
import { pspProjectFiles } from '@/game/pspProject';
import { makeZip, canvasToPng } from '@/lib/zip';
import { drawIcon, drawPic } from '@/game/pspArt';

const FILES = [
  ['Makefile', 'PSPSDK build rules, EBOOT.PBP target'],
  ['README.md', 'Compilation, controls, honest status notes'],
  ['src/main.c', 'Native renderer, room generation, creatures, controls'],
  ['assets/ICON0.PNG', '144 × 80 menu icon (generated on download)'],
  ['assets/PIC1.PNG', '480 × 272 menu artwork (generated on download)'],
];

export default function PspPage() {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const files = pspProjectFiles();
      const icon = await canvasToPng(144, 80, drawIcon);
      const pic = await canvasToPng(480, 272, drawPic);
      files.push({ name: 'Shattered_Memories_PSP/assets/ICON0.PNG', data: icon });
      files.push({ name: 'Shattered_Memories_PSP/assets/PIC1.PNG', data: pic });
      const zip = makeZip(files);
      const blob = new Blob([zip], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Shattered_Memories_PSP.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08080a] font-mono text-[#e8e4da]">
      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10">
        <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Second build</p>
        <h1 className="sm-title mt-2 text-4xl md:text-5xl">PSP Homebrew</h1>
        <p className="mt-4 max-w-2xl font-body text-[15px] leading-relaxed text-[#a09a8d]">
          A separate native C project for the Sony PSP: PSPSDK structure, GU rendering at 480 × 272
          in 16:9, procedural rooms, searchable furniture, hiding and creatures. Download the archive,
          build it with your toolchain, and copy the EBOOT to your memory stick.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button onClick={download} disabled={busy} className="sm-btn border-[#b06a3c] text-[#fff]">
            {busy ? 'Packaging…' : 'Download Shattered_Memories_PSP.zip'}
          </button>
          <a href={`${import.meta.env.BASE_URL}downloads/Shattered_Memories_PSP.zip`} download="Shattered_Memories_PSP.zip" className="sm-btn">
            Download packaged PSP ZIP
          </a>
          <Link to="/" className="sm-btn">
            Back to menu
          </Link>
        </div>

        <div className="sm-rule my-9" />

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Archive contents</p>
            <div className="space-y-2">
              {FILES.map(([name, note]) => (
                <div key={name} className="border-b border-[#1d1b17] pb-2">
                  <p className="text-[11px] text-[#d8b06a]">{name}</p>
                  <p className="text-[10px] text-[#6f6a5f]">{note}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Straight answers</p>
            <ul className="space-y-3 text-[11px] leading-relaxed text-[#8d867a]">
              <li>
                <b className="text-[#d8b06a]">No EBOOT.PBP is included.</b> A PBP can only be produced by a
                PSPSDK build environment, so the archive holds the complete project and Makefile instead.
              </li>
              <li>
                <b className="text-[#d8b06a]">Not run on hardware.</b> The source has not been compiled or
                tested here. Expect to fix small things in your toolchain.
              </li>
              <li>
                <b className="text-[#d8b06a]">Ad-hoc multiplayer is not implemented.</b> The README documents
                the intended approach as future work rather than pretending it works.
              </li>
              <li>
                <b className="text-[#d8b06a]">Reduced on purpose.</b> Gradient floors, one sprite atlas and
                fewer effects — the same gameplay loop, sized for the hardware.
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10">
          <p className="mb-3 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Controls</p>
          <div className="grid gap-x-8 gap-y-1 text-[11px] sm:grid-cols-2">
            {[
              ['Analog stick', 'Move and strafe'],
              ['L / R trigger', 'Look left and right'],
              ['Cross', 'Interact'],
              ['Circle', 'Hide / leave'],
              ['Square', 'Lantern'],
              ['Triangle', 'Index'],
              ['Select', 'FPS · RAM · battery'],
              ['Start', 'Pause'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#1d1b17] py-1.5">
                <span className="text-[#d8b06a]">{k}</span>
                <span className="text-[#7d776b]">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}