export default function DeathScreen({ cause, room, onRetry }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#070605]/92 font-mono">
      <div className="w-[min(560px,92vw)] px-6 text-center">
        <p className="text-[9px] uppercase tracking-[0.5em] text-[#8a3a2c]">Room {String(room).padStart(3, '0')}</p>
        <h2 className="sm-title mt-3 text-4xl md:text-5xl">You were found</h2>
        <p className="mt-4 text-[11px] uppercase tracking-[0.3em] text-[#8d867a]">
          {cause || 'Something in the corridor'}
        </p>
        <p className="mx-auto mt-6 max-w-sm font-body text-sm leading-relaxed text-[#a09a8d]">
          Coins you picked up are kept. The hallway you reached is marked on the record.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button onClick={onRetry} className="sm-btn">
            Descend again
          </button>
          <a href="/" className="sm-btn">
            Main menu
          </a>
        </div>
      </div>
    </div>
  );
}