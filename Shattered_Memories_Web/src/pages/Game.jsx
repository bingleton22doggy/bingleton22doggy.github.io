import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Game as Engine } from '@/game/engine';
import { getProgress, updateProgress, discover } from '@/game/progress';
import { DEFAULT_LOADOUT } from '@/game/meta';
import Hud from '@/components/game/Hud';
import PauseMenu from '@/components/game/PauseMenu';
import DeathScreen from '@/components/game/DeathScreen';
import IndexPanel from '@/components/game/IndexPanel';

export default function Game() {
  const [searchParams] = useSearchParams();
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [phase, setPhase] = useState('loading');
  const [pct, setPct] = useState(0);
  const [step, setStep] = useState('Opening the hall');
  const [hud, setHud] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [locked, setLocked] = useState(false);
  const [uiMode, setUiMode] = useState('play');

  useEffect(() => {
    const prog = getProgress();
    const cont = searchParams.get('continue') === '1';
    const run = cont ? prog.run : null;
    const mapId = (run && run.map) || prog.mapId || 'basement';
    const inv = { ...DEFAULT_LOADOUT };
    const up = prog.unlocks.upgrades || [];
    if (up.includes('up.starter')) {
      inv.battery += 2;
      inv.flare += 1;
    }
    if (up.includes('up.card')) {
      inv.key += 1;
      inv.card += 1;
    }
    if (up.includes('up.capacity')) inv.lanternUpgrade = true;
    if (up.includes('up.boots')) inv.quiet = true;
    if (up.includes('up.pack')) inv.coinBonus = true;
    Object.keys(prog.stock || {}).forEach((k) => {
      inv[k] = (inv[k] || 0) + prog.stock[k];
    });
    if (run && run.inventory) Object.assign(inv, run.inventory);
    const startRoom = (run && run.room) || 1;

    const engine = new Engine(canvasRef.current, {
      mapId,
      quality: prog.settings.quality,
      volume: prog.settings.volume,
      sensitivity: prog.settings.sensitivity,
      inventory: inv,
      coins: prog.coins,
      onUi: (m) => setUiMode(m),
      onCoins: (n) => updateProgress((s) => ({ ...s, coins: s.coins + n })),
      onDiscover: (id) => discover(id),
      onRoom: (n) =>
        updateProgress((s) => ({
          ...s,
          bestRoom: Math.max(s.bestRoom, n),
          roomsCleared: Math.max(s.roomsCleared || 0, n - 1),
          run: { room: n, map: mapId, inventory: engine.player.inv },
        })),
      onDeath: ({ room }) =>
        updateProgress((s) => ({
          ...s,
          deaths: s.deaths + 1,
          bestRoom: Math.max(s.bestRoom, room),
          run: null,
        })),
    });
    gameRef.current = engine;
    window.__smEngine = engine;
    let alive = true;
    (async () => {
      await engine.load((p, s) => {
        if (!alive) return;
        setPct(p);
        setStep(s);
      });
      if (!alive) return;
      updateProgress((s) => ({ ...s, stock: {}, mapId, runs: cont ? s.runs : s.runs + 1 }));
      engine.begin({ roomIndex: startRoom, inventory: inv, coins: getProgress().coins });
      setPhase('play');
    })();
    const iv = setInterval(() => {
      const g = gameRef.current;
      if (!g) return;
      g.hud.creatureCount = g.creatures.length;
      setHud({ ...g.hud });
    }, 100);
    const onLock = () => setLocked(document.pointerLockElement === canvasRef.current);
    document.addEventListener('pointerlockchange', onLock);
    return () => {
      alive = false;
      clearInterval(iv);
      document.removeEventListener('pointerlockchange', onLock);
      engine.dispose();
      gameRef.current = null;
    };
  }, [attempt]);

  const retry = () => {
    setPhase('loading');
    setPct(0);
    setHud(null);
    setUiMode('play');
    setAttempt((a) => a + 1);
  };

  const mode = uiMode || (hud ? hud.uiMode : 'play');

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
      <canvas
        ref={canvasRef}
        className="sm-canvas h-full w-full"
        onClick={() => gameRef.current?.requestLock()}
      />

      {hud && <Hud hud={hud} />}

      {phase === 'play' && mode === 'play' && !locked && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.3em] text-[#6f6a5f]">
          Click the screen to capture the mouse
        </div>
      )}

      {phase === 'loading' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#070708] font-mono">
          <p className="text-[9px] uppercase tracking-[0.5em] text-[#b06a3c]">Descending</p>
          <h1 className="sm-title mt-3 text-4xl">Shattered Memories</h1>
          <div className="mt-10 h-[2px] w-[min(420px,72vw)] bg-[#24221e]">
            <div className="h-full bg-[#b06a3c] transition-all duration-300" style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
          <p className="mt-3 text-[9px] uppercase tracking-[0.34em] text-[#7d776b]">{step}</p>
        </div>
      )}

      {mode === 'pause' && (
        <PauseMenu
          room={hud.room}
          onResume={() => gameRef.current?.resume()}
          onRestart={retry}
        />
      )}

      {mode === 'index' && (
        <IndexPanel progress={getProgress()} onClose={() => gameRef.current?.setUi('play')} />
      )}

      {mode === 'dead' && <DeathScreen cause={hud.cause} room={hud.room} onRetry={retry} />}
    </div>
  );
}