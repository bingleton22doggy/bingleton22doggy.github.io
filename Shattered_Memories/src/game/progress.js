import { useEffect, useState } from 'react';

const KEY = 'shattered_memories_v1';

const DEFAULTS = {
  coins: 0,
  bestRoom: 0,
  runs: 0,
  deaths: 0,
  roomsCleared: 0,
  unlocks: { maps: ['basement'], upgrades: [] },
  index: {},
  settings: { volume: 0.7, quality: 'medium', sensitivity: 1, showPerf: false },
  stock: {},
  mapId: 'basement',
  run: null,
};

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base, ...saved };
  out.unlocks = { ...base.unlocks, ...(saved.unlocks || {}) };
  out.settings = { ...base.settings, ...(saved.settings || {}) };
  out.index = { ...(saved.index || {}) };
  return out;
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS, unlocks: { ...DEFAULTS.unlocks }, settings: { ...DEFAULTS.settings }, index: {} };
    return merge(DEFAULTS, JSON.parse(raw));
  } catch (e) {
    return { ...DEFAULTS, unlocks: { ...DEFAULTS.unlocks }, settings: { ...DEFAULTS.settings }, index: {} };
  }
}

export function saveProgress(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch (e) {
    /* storage unavailable */
  }
}

let state = loadProgress();
const subs = new Set();

export function getProgress() {
  return state;
}

export function updateProgress(patch) {
  state = typeof patch === 'function' ? patch(state) : { ...state, ...patch };
  saveProgress(state);
  subs.forEach((fn) => fn(state));
}

export function discover(id) {
  if (!id) return;
  const p = getProgress();
  if (p.index[id]) return;
  updateProgress((s) => ({ ...s, index: { ...s.index, [id]: true } }));
}

export function addCoins(n) {
  updateProgress((s) => ({ ...s, coins: s.coins + n }));
}

export function useProgress() {
  const [snap, setSnap] = useState(state);
  useEffect(() => {
    const fn = (v) => setSnap(v);
    subs.add(fn);
    setSnap(state);
    return () => subs.delete(fn);
  }, []);
  return snap;
}

export function resetProgress() {
  state = { ...DEFAULTS, unlocks: { ...DEFAULTS.unlocks }, settings: { ...DEFAULTS.settings }, index: {} };
  saveProgress(state);
  subs.forEach((fn) => fn(state));
}