import { Link } from 'react-router-dom';
import IndexPanel from '@/components/game/IndexPanel';
import { useProgress } from '@/game/progress';

export default function FieldIndex() {
  const p = useProgress();
  return (
    <div className="min-h-screen bg-[#08080a] font-mono text-[#e8e4da]">
      <div className="mx-auto max-w-6xl px-6 py-10 md:px-10">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] uppercase tracking-[0.45em] text-[#b06a3c]">Recovered</p>
            <h1 className="sm-title mt-2 text-4xl md:text-5xl">Field Index</h1>
            <p className="mt-2 text-[10px] uppercase tracking-[0.28em] text-[#7d776b]">
              {Object.keys(p.index).length} entries recovered
            </p>
          </div>
          <Link to="/" className="sm-btn">
            Back to menu
          </Link>
        </div>
        <div className="sm-rule my-8" />
        <IndexPanel progress={p} embedded />
      </div>
    </div>
  );
}