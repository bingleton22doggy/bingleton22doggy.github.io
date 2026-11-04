import { Link } from 'react-router-dom';
import DownloadEverything from '@/components/DownloadEverything';
import { useProgress } from '@/game/progress';
import { mapById } from '@/game/meta';

const MENU = [
  { to: '/play', label: 'Enter the Halls', note: 'New descent' },
  { to: '/shop', label: 'Shop', note: 'Spend coins' },
  { to: '/maps', label: 'Maps', note: 'Choose a level' },
  { to: '/field-index', label: 'Field Index', note: 'What you have learned' },
  { to: '/settings', label: 'Settings', note: 'Volume and video' },
  { to: '/credits', label: 'Credits', note: 'Who built this' },
];

export default function Home() {
  const p = useProgress();
  const hasRun = !!(p.run && p.run.room > 0);
  const map = mapById((p.run && p.run.map) || 'basement');

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070708] text-[#e8e4da] font-mono">
      <div className="pointer-events-none absolute inset-0 sm-fog" />
      <div className="pointer-events-none absolute inset-0 sm-grain" />
      <div className="pointer-events-none absolute inset-0 sm-vignette" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-8 md:px-12">
        <header className="flex items-start justify-between gap-6 text-[11px] uppercase tracking-[0.35em] text-[#8d867a]">
          <span>Procedural Survival Horror</span>
          <span className="hidden md:block">Build 0.9 · No signal</span>
        </header>

        <main className="flex flex-1 flex-col justify-center py-16">
          <div className="mb-10">
            <p className="mb-4 text-[11px] uppercase tracking-[0.5em] text-[#b06a3c]">Descent record</p>
            <h1 className="sm-title select-none text-5xl leading-[0.95] tracking-tight md:text-7xl">
              Shattered
              <br />
              Memories
            </h1>
            <p className="mt-6 max-w-lg font-body text-[15px] leading-relaxed text-[#a09a8d]">
              Numbered doors. Hallways that are never the same twice. Something large moving in the
              corridor behind you, and a cabinet that might be close enough.
            </p>
          </div>

          <nav className="max-w-xl">
            {hasRun && (
              <Link
                to="/play?continue=1"
                className="group mb-1 flex items-baseline justify-between border-t border-[#2a2722] py-4 transition-colors hover:border-[#b06a3c]"
              >
                <span className="flex items-baseline gap-4">
                  <span className="w-6 text-[10px] tracking-widest text-[#b06a3c]">↺</span>
                  <span className="font-body text-xl text-[#f0ece2] group-hover:text-white">Continue</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#7d776b]">
                  Room {String(p.run.room).padStart(3, '0')} · {map.name}
                </span>
              </Link>
            )}
            {MENU.map((m, i) => (
              <Link
                key={m.to}
                to={m.to}
                className="group flex items-baseline justify-between border-t border-[#2a2722] py-4 transition-colors hover:border-[#b06a3c]"
              >
                <span className="flex items-baseline gap-4">
                  <span className="w-6 text-[10px] tracking-widest text-[#5f594f] group-hover:text-[#b06a3c]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-body text-xl text-[#ded9ce] transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white">
                    {m.label}
                  </span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.25em] text-[#7d776b] opacity-70">
                  {m.note}
                </span>
              </Link>
            ))}
          </nav>
        </main>

        <footer className="flex flex-wrap items-end justify-between gap-6 border-t border-[#22201c] pt-5 text-[10px] uppercase tracking-[0.28em] text-[#7d776b]">
          <div className="flex flex-wrap gap-8">
            <span>
              Coins <b className="ml-2 font-normal text-[#d8b06a]">{p.coins}</b>
            </span>
            <span>
              Deepest room <b className="ml-2 font-normal text-[#d8b06a]">{String(p.bestRoom).padStart(3, '0')}</b>
            </span>
            <span>
              Recovered <b className="ml-2 font-normal text-[#d8b06a]">{Object.keys(p.index).length}</b>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <DownloadEverything className="uppercase tracking-[0.28em] text-[#b06a3c] transition-colors hover:text-white" />
            <Link to="/psp" className="transition-colors hover:text-[#b06a3c]">
              PSP homebrew build →
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}