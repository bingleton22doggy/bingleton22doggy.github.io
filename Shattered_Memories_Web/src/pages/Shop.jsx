import { Link } from 'react-router-dom';
import { SHOP, ITEMS } from '@/game/meta';
import { useProgress, updateProgress } from '@/game/progress';

const stockKey = (id) => id.replace('item.', '');

export default function Shop() {
  const p = useProgress();

  const buy = (item) => {
    if (p.coins < item.cost) return;
    if (item.type === 'upgrade' && p.unlocks.upgrades.includes(item.id)) return;
    updateProgress((s) => {
      if (item.type === 'upgrade') {
        return { ...s, coins: s.coins - item.cost, unlocks: { ...s.unlocks, upgrades: [...s.unlocks.upgrades, item.id] } };
      }
      const k = stockKey(item.id);
      return { ...s, coins: s.coins - item.cost, stock: { ...s.stock, [k]: (s.stock[k] || 0) + 1 } };
    });
  };

  return (
    <div className="min-h-screen bg-[#08080a] font-mono text-[#e8e4da]">
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Between descents</p>
            <h1 className="sm-title mt-2 text-4xl md:text-5xl">The Shop</h1>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.3em] text-[#7d776b]">Coins</p>
            <p className="text-2xl text-[#d8b06a]">{p.coins}</p>
          </div>
        </div>

        <div className="sm-rule my-8" />

        <p className="mb-3 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Permanent upgrades</p>
        <div className="grid gap-3 md:grid-cols-2">
          {SHOP.filter((s) => s.type === 'upgrade').map((item) => {
            const owned = p.unlocks.upgrades.includes(item.id);
            const afford = p.coins >= item.cost;
            return (
              <div key={item.id} className="sm-panel flex flex-col justify-between p-5">
                <div>
                  <div className="flex items-baseline justify-between gap-4">
                    <h3 className="font-body text-lg text-[#f0ece2]">{item.name}</h3>
                    <span className="text-[11px] text-[#d8b06a]">{owned ? 'owned' : `${item.cost}c`}</span>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-[#8d867a]">{item.desc}</p>
                </div>
                <button
                  onClick={() => buy(item)}
                  disabled={owned || !afford}
                  className="sm-btn mt-4 self-start"
                >
                  {owned ? 'Installed' : afford ? 'Purchase' : 'Not enough coins'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mb-3 mt-10 text-[9px] uppercase tracking-[0.32em] text-[#857e71]">Supplies for the next run</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {SHOP.filter((s) => s.type === 'stock').map((item) => {
            const k = stockKey(item.id);
            const held = p.stock[k] || 0;
            const afford = p.coins >= item.cost;
            return (
              <div key={item.id} className="sm-panel p-5">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-body text-lg text-[#f0ece2]">{ITEMS[k]?.name || item.name}</h3>
                  <span className="text-[11px] text-[#d8b06a]">{item.cost}c</span>
                </div>
                <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-[#6f6a5f]">In stash: {held}</p>
                <button onClick={() => buy(item)} disabled={!afford} className="sm-btn mt-4 w-full">
                  {afford ? 'Add to stash' : 'Not enough'}
                </button>
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