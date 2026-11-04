import { useState } from 'react';
import { CREATURES, OBJECT_INDEX } from '@/game/meta';

export default function IndexPanel({ progress, onClose, embedded = false }) {
  const found = progress.index || {};
  const creatures = Object.values(CREATURES);
  const [sel, setSel] = useState(() => {
    const first = creatures.find((c) => found[c.id]);
    return first ? first.id : 'none';
  });
  const entry = creatures.find((c) => c.id === sel);
  const objEntries = OBJECT_INDEX.filter((o) => found[o.id]);
  const selectedObj = OBJECT_INDEX.find((o) => o.id === sel && found[o.id]);
  const discoveredCreatures = creatures.filter((c) => found[c.id]);

  return (
    <div className={embedded ? '' : 'absolute inset-0 overflow-y-auto bg-[#08080a]/96'}>
      <div className={embedded ? '' : 'mx-auto max-w-6xl px-6 py-10 md:px-10'}>
        {!embedded && (
          <div className="mb-8 flex items-start justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Recovered</p>
              <h1 className="sm-title mt-2 text-4xl">Field Index</h1>
              <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-[#7d776b]">
                {Object.keys(found).length} entries recovered
              </p>
            </div>
            {onClose && (
              <button onClick={onClose} className="sm-btn">
                Close
              </button>
            )}
          </div>
        )}

        <div className="grid gap-8 md:grid-cols-[300px_1fr]">
          <div>
            <p className="mb-3 border-b border-[#26231e] pb-2 text-[9px] uppercase tracking-[0.3em] text-[#857e71]">Entities</p>
            <div className="space-y-1">
              {creatures.map((c) => {
                const known = !!found[c.id];
                return (
                  <button
                    key={c.id}
                    onClick={() => known && setSel(c.id)}
                    className={`flex w-full items-baseline justify-between gap-3 border-l-2 py-1.5 pl-3 text-left transition-colors ${
                      sel === c.id ? 'border-[#b06a3c] text-[#f0ece2]' : 'border-transparent text-[#7d776b] hover:text-[#b9b2a4]'
                    } ${known ? '' : 'cursor-default opacity-45'}`}
                  >
                    <span className="font-body text-base">{known ? c.name : '— — — — —'}</span>
                    <span className="text-[8px] uppercase tracking-[0.2em]">{known ? (c.kind === 'boss' ? 'boss' : 'seen') : 'unknown'}</span>
                  </button>
                );
              })}
            </div>

            <p className="mb-3 mt-6 border-b border-[#26231e] pb-2 text-[9px] uppercase tracking-[0.3em] text-[#857e71]">
              Objects & supplies
            </p>
            <div className="space-y-1">
              {OBJECT_INDEX.map((o) => {
                const known = !!found[o.id];
                return (
                  <button
                    key={o.id}
                    onClick={() => known && setSel(o.id)}
                    className={`flex w-full items-baseline justify-between gap-3 border-l-2 py-1 pl-3 text-left text-[11px] transition-colors ${
                      sel === o.id ? 'border-[#b06a3c] text-[#f0ece2]' : 'border-transparent text-[#7d776b] hover:text-[#b9b2a4]'
                    } ${known ? '' : 'cursor-default opacity-40'}`}
                  >
                    <span>{known ? o.name : '— — —'}</span>
                    <span className="text-[8px] uppercase tracking-[0.2em]">{o.cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="sm-panel min-h-[320px] p-6">
            {entry && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.4em] text-[#b06a3c]">{entry.kind === 'boss' ? 'Boss entity' : 'Entity'}</p>
                <h2 className="sm-title mt-2 text-3xl">{entry.name}</h2>
                <div className="mt-5 space-y-4 text-[12px] leading-relaxed">
                  <Detail label="Silhouette" text={entry.silhouette} />
                  <Detail label="Behaviour" text={entry.behaviour} />
                  <Detail label="Warning signs" text={entry.signs.join(' · ')} accent />
                  <Detail label="Survival" text={entry.survival} accent />
                </div>
              </div>
            )}
            {selectedObj && (
              <div>
                <p className="text-[9px] uppercase tracking-[0.4em] text-[#b06a3c]">{selectedObj.cat}</p>
                <h2 className="sm-title mt-2 text-3xl">{selectedObj.name}</h2>
                <p className="mt-5 max-w-prose font-body text-sm leading-relaxed text-[#a09a8d]">{selectedObj.text}</p>
              </div>
            )}
            {!entry && !selectedObj && (
              <div className="flex h-full flex-col justify-center text-center">
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#5f594f]">
                  {discoveredCreatures.length ? 'Select an entry' : 'Nothing recovered yet'}
                </p>
                <p className="mx-auto mt-3 max-w-sm font-body text-sm leading-relaxed text-[#6f6a5f]">
                  The index fills as you survive encounters. Every creature leaves warning signs before it arrives.
                </p>
              </div>
            )}
            {objEntries.length > 0 && (
              <p className="mt-8 border-t border-[#26231e] pt-3 text-[9px] uppercase tracking-[0.24em] text-[#4f4a42]">
                {objEntries.length} object records · {discoveredCreatures.length} entity records
              </p>
            )}
          </div>
        </div>

        {onClose && !embedded && (
          <div className="mt-8">
            <button onClick={onClose} className="sm-btn">
              Back to menu
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Detail({ label, text, accent }) {
  return (
    <div>
      <p className="text-[8px] uppercase tracking-[0.32em] text-[#6f6a5f]">{label}</p>
      <p className={`mt-1 font-body text-sm leading-relaxed ${accent ? 'text-[#d8b06a]' : 'text-[#b9b2a4]'}`}>{text}</p>
    </div>
  );
}