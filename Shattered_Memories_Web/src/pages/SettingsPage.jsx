import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress, updateProgress, resetProgress } from '@/game/progress';

export default function SettingsPage() {
  const p = useProgress();
  const [confirming, setConfirming] = useState(false);

  const set = (patch) =>
    updateProgress((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  return (
    <div className="min-h-screen bg-[#08080a] font-mono text-[#e8e4da]">
      <div className="mx-auto max-w-3xl px-6 py-10 md:px-10">
        <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Preferences</p>
        <h1 className="sm-title mt-2 text-4xl md:text-5xl">Settings</h1>
        <div className="sm-rule my-8" />

        <div className="space-y-8">
          <Row label="Volume" hint={`${Math.round(p.settings.volume * 100)}%`}>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={p.settings.volume}
              onChange={(e) => set({ volume: Number(e.target.value) })}
              className="w-full accent-[#b06a3c]"
            />
          </Row>

          <Row label="Look sensitivity" hint={`${p.settings.sensitivity.toFixed(1)}×`}>
            <input
              type="range"
              min="0.4"
              max="2.4"
              step="0.1"
              value={p.settings.sensitivity}
              onChange={(e) => set({ sensitivity: Number(e.target.value) })}
              className="w-full accent-[#b06a3c]"
            />
          </Row>

          <Row label="Render detail" hint="Applies on the next descent">
            <div className="flex gap-2">
              {['low', 'medium', 'high'].map((q) => (
                <button
                  key={q}
                  onClick={() => set({ quality: q })}
                  className={`sm-btn ${p.settings.quality === q ? 'border-[#b06a3c] text-[#fff]' : ''}`}
                >
                  {q}
                </button>
              ))}
            </div>
          </Row>

          <Row label="Performance readout" hint="P in game">
            <button onClick={() => set({ showPerf: !p.settings.showPerf })} className="sm-btn">
              {p.settings.showPerf ? 'On' : 'Off'}
            </button>
          </Row>

          <Row label="Record" hint="Local to this browser">
            <div className="grid grid-cols-2 gap-3 text-[10px] uppercase tracking-[0.2em] text-[#8d867a]">
              <span>Deepest room <b className="text-[#d8b06a]">{String(p.bestRoom).padStart(3, '0')}</b></span>
              <span>Runs <b className="text-[#d8b06a]">{p.runs}</b></span>
              <span>Deaths <b className="text-[#d8b06a]">{p.deaths}</b></span>
              <span>Index <b className="text-[#d8b06a]">{Object.keys(p.index).length}</b></span>
            </div>
          </Row>

          <div className="border border-[#3a2420] p-5">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#8a3a2c]">Danger zone</p>
            <p className="mt-2 text-[11px] leading-relaxed text-[#8d867a]">
              Wipes coins, unlocked maps, upgrades and every recovered index entry.
            </p>
            {confirming ? (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    resetProgress();
                    setConfirming(false);
                  }}
                  className="sm-btn border-[#8a3a2c] text-[#e0a08a]"
                >
                  Yes, erase everything
                </button>
                <button onClick={() => setConfirming(false)} className="sm-btn">
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirming(true)} className="sm-btn mt-4">
                Reset progress
              </button>
            )}
          </div>
        </div>

        <div className="mt-12">
          <Link to="/" className="sm-btn">
            Back to menu
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, hint, children }) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-body text-lg text-[#e9e5da]">{label}</p>
        <p className="text-[9px] uppercase tracking-[0.24em] text-[#6f6a5f]">{hint}</p>
      </div>
      {children}
    </div>
  );
}