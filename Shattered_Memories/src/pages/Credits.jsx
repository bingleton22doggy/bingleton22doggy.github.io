import { Link } from 'react-router-dom';

const CONTROLS = [
  ['W A S D', 'Move through the hallway'],
  ['Mouse', 'Look (click the screen to capture)'],
  ['Shift', 'Sprint — loud'],
  ['E', 'Interact · search · hide'],
  ['F', 'Lantern on / off'],
  ['1 – 5', 'Battery · flare · bandage · key · card'],
  ['Tab', 'Field index'],
  ['Esc', 'Pause'],
  ['P', 'Performance readout'],
];

export default function Credits() {
  return (
    <div className="min-h-screen bg-[#08080a] font-mono text-[#e8e4da]">
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
        <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Behind the door</p>
        <h1 className="sm-title mt-2 text-4xl md:text-5xl">Credits</h1>
        <div className="sm-rule my-8" />

        <p className="max-w-prose font-body text-[15px] leading-relaxed text-[#a09a8d]">
          Shattered Memories is an original procedural survival horror game. Every hallway is generated
          the moment you step into it: the maze, the furniture, the lighting, the containers, the lock on
          the door, and the thing that comes looking for you.
        </p>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Controls</p>
            <div className="space-y-2">
              {CONTROLS.map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 border-b border-[#1d1b17] pb-1.5">
                  <span className="text-[10px] uppercase tracking-[0.14em] text-[#d8b06a]">{k}</span>
                  <span className="text-right text-[10px] text-[#7d776b]">{v}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Built with</p>
            <ul className="space-y-2 text-[11px] leading-relaxed text-[#7d776b]">
              <li>Raycasting renderer written from scratch — walls, floor and ceiling cast per pixel.</li>
              <li>Every texture and creature modelled procedurally at load time. No image assets.</li>
              <li>Sound synthesised live with the Web Audio API.</li>
              <li>A native PSP homebrew companion build is available from the main menu.</li>
            </ul>
          </div>
        </div>

        <div className="sm-rule my-10" />
        <p className="text-[10px] uppercase tracking-[0.24em] text-[#4f4a42]">
          Dedicated to everyone who kept walking into the hallway.
        </p>

        <div className="mt-10 flex gap-3">
          <Link to="/" className="sm-btn">
            Back to menu
          </Link>
          <Link to="/play" className="sm-btn">
            Descend
          </Link>
        </div>
      </div>
    </div>
  );
}