import { ITEMS } from '@/game/meta';

const pad = (n) => String(n).padStart(3, '0');

const SLOTS = [
  { key: '1', id: 'battery' },
  { key: '2', id: 'flare' },
  { key: '3', id: 'bandage' },
  { key: '4', id: 'key' },
  { key: '5', id: 'card' },
];

function Bar({ value, max, color, label }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="w-40">
      <div className="mb-1 flex justify-between text-[9px] uppercase tracking-[0.3em] text-[#7d776b]">
        <span>{label}</span>
        <span className="text-[#a49d90]">{Math.round(pct)}</span>
      </div>
      <div className="h-[3px] w-full bg-[#26241f]">
        <div className="h-full transition-all duration-200" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function Hud({ hud }) {
  const inv = hud.inv || {};
  return (
    <div className="pointer-events-none absolute inset-0 select-none font-mono text-[#e8e4da]">
      <div className="absolute left-5 top-4">
        <div className="text-[9px] uppercase tracking-[0.42em] text-[#857e71]">{hud.mapTag}</div>
        <div className="mt-1 text-2xl font-light tracking-[0.14em] text-[#f0ece2]">ROOM {pad(hud.room)}</div>
      </div>

      <div className="absolute right-5 top-4 text-right">
        <div className="text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Coins</div>
        <div className="text-lg text-[#d8b06a]">{hud.coins}</div>
        {hud.showPerf && (
          <div className="mt-2 space-y-0.5 text-[9px] tracking-[0.14em] text-[#6f8a72]">
            <div>{hud.fps} FPS</div>
            <div>{hud.creatureCount || 0} ACTIVE</div>
          </div>
        )}
      </div>

      {hud.message && (
        <div className="absolute left-1/2 top-16 w-[min(560px,80vw)] -translate-x-1/2 text-center">
          <p className="text-[11px] uppercase tracking-[0.22em] leading-relaxed text-[#cfc8b8] drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
            {hud.message}
          </p>
        </div>
      )}

      <div className="absolute bottom-5 left-5 space-y-3">
        <Bar value={hud.health} max={100} color="#a34a3a" label="Condition" />
        <Bar value={hud.battery} max={hud.maxBattery || 100} color="#c9a75a" label="Lantern" />
      </div>

      {hud.prompt && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 border border-[#38342d] bg-[#0b0b0a]/85 px-4 py-2 text-[10px] uppercase tracking-[0.26em] text-[#ded9ce]">
          {hud.prompt}
        </div>
      )}

      <div className="absolute bottom-5 right-5 flex items-end gap-3">
        {hud.lanternOn && (
          <span className="mb-1 text-[9px] uppercase tracking-[0.28em] text-[#c9a75a]">Lantern lit</span>
        )}
        {SLOTS.map((s) => {
          const n = inv[s.id] || 0;
          if (!n) return null;
          const item = ITEMS[s.id];
          return (
            <div key={s.id} className="flex flex-col items-center gap-1">
              <span className="text-[8px] tracking-[0.2em] text-[#5f594f]">{s.key}</span>
              <span className="border border-[#33302a] bg-[#111110]/80 px-2 py-1 text-[10px] tracking-[0.1em] text-[#b9b2a4]">
                {item ? item.name.slice(0, 6) : s.id} {n}
              </span>
            </div>
          );
        })}
      </div>

      {inv.lantern ? (
        <div className="absolute bottom-24 right-5 text-[9px] uppercase tracking-[0.24em] text-[#5f594f]">
          F — lantern · E — use · Tab — index
        </div>
      ) : null}
    </div>
  );
}