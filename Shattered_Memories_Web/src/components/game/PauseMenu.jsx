import { Link } from 'react-router-dom';

export default function PauseMenu({ onResume, onRestart, room }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono">
      <div className="sm-panel w-[min(460px,90vw)] p-8">
        <p className="text-[9px] uppercase tracking-[0.42em] text-[#b06a3c]">Suspended</p>
        <h2 className="sm-title mb-1 mt-2 text-3xl">Paused</h2>
        <p className="mb-6 text-[10px] uppercase tracking-[0.26em] text-[#7d776b]">
          Room {String(room).padStart(3, '0')} · the hall is waiting
        </p>
        <div className="space-y-2">
          <button onClick={onResume} className="sm-btn w-full text-left">
            Resume
          </button>
          <button onClick={onRestart} className="sm-btn w-full text-left">
            Restart descent
          </button>
          <Link to="/" className="sm-btn block w-full text-left">
            Abandon · main menu
          </Link>
        </div>
      </div>
    </div>
  );
}