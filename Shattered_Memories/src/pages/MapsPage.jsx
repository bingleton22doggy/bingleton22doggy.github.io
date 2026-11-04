import { Link } from 'react-router-dom';
import { MAPS } from '@/game/meta';
import { useProgress, updateProgress } from '@/game/progress';

export default function MapsPage() {
  const p = useProgress();
  const unlocked = p.unlocks.maps || [];

  const unlock = (m) => {
    if (unlocked.includes(m.id) || p.coins < m.cost) return;
    updateProgress((s) => ({ ...s, coins: s.coins - m.cost, unlocks: { ...s.unlocks, maps: [...s.unlocks.maps, m.id] } }));
  };

  return (
    <div className="min-h-screen bg-[#08080a] font-mono text-[#e8e4da]">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Descent routes</p>
            <h1 className="sm-title mt-2 text-4xl md:text-5xl">Maps</h1>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#7d776b]">Coins</p>
            <p className="text-2xl text-[#d8b06a]">{p.coins}</p>
          </div>
        </div>

        <div className="sm-rule my-8" />

        <div className="space-y-3">
          {MAPS.map((m) => {
            const isUnlocked = unlocked.includes(m.id);
            const selected = (p.mapId || 'basement') === m.id;
            return (
              <div
                key={m.id}
                className={`sm-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between ${
                  selected ? 'border-[#b06a3c]' : ''
                }`}
              >
                <div className="max-w-xl">
                  <div className="flex items-baseline gap-3">
                    <h3 className="font-body text-2xl text-[#f0ece2]">{m.name}</h3>
                    <span className="text-[9px] uppercase tracking-[0.24em] text-[#7d776b]">{m.tag}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#8d867a]">{m.blurb}</p>
                  <p className="mt-2 text-[9px] uppercase tracking-[0.2em] text-[#5f594f]">
                    Entities: {m.creatures.length} · layout random each room
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {isUnlocked ? (
                    <button
                      onClick={() => updateProgress((s) => ({ ...s, mapId: m.id }))}
                      disabled={selected}
                      className="sm-btn"
                    >
                      {selected ? 'Active route' : 'Select'}
                    </button>
                  ) : (
                    <button onClick={() => unlock(m)} disabled={p.coins < m.cost} className="sm-btn">
                      {p.coins >= m.cost ? `Unlock · ${m.cost}c` : `${m.cost}c needed`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex gap-3">
          <Link to="/" className="sm-btn">
            Back to menu
          </Link>
          <Link to="/play" className="sm-btn">
            Descend now
          </Link>
        </div>
      </div>
    </div>
  );
}