import { RNG } from './rng';

export const WALL = 1;
export const WINDOW = 2;
export const DOOR = 3;

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function bfsField(room, tx, ty) {
  const { W, H, grid } = room;
  const dist = new Int32Array(W * H).fill(-1);
  const q = [];
  const start = ty * W + tx;
  if (grid[start] !== 0) return dist;
  dist[start] = 0;
  q.push(start);
  let head = 0;
  while (head < q.length) {
    const i = q[head++];
    const x = i % W;
    const y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const ni = ny * W + nx;
      if (grid[ni] !== 0 || dist[ni] !== -1) continue;
      dist[ni] = dist[i] + 1;
      q.push(ni);
    }
  }
  return dist;
}

export function isOpen(room, x, y) {
  if (x < 0 || y < 0 || x >= room.W || y >= room.H) return false;
  return room.grid[y * room.W + x] === 0;
}

function openNeighbours(grid, W, x, y, w, h) {
  let n = 0;
  for (const [dx, dy] of DIRS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
    if (grid[ny * W + nx] === 0) n++;
  }
  return n;
}

export function generateRoom({ index = 1, map, danger = 1 }) {
  const seed = ((index * 2654435761) ^ (Math.random() * 4294967296)) >>> 0;
  const rng = new RNG(seed);

  let W = 23 + Math.min(18, Math.floor(index / 2) * 2);
  let H = 19 + Math.min(14, Math.floor(index / 3) * 2);
  if (W % 2 === 0) W++;
  if (H % 2 === 0) H++;

  const grid = new Uint8Array(W * H).fill(WALL);
  const at = (x, y) => grid[y * W + x];

  // --- carve a braided maze of corridors ---
  const stack = [[1, 1]];
  grid[1 * W + 1] = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const options = rng.shuffle([
      [2, 0],
      [-2, 0],
      [0, 2],
      [0, -2],
    ]);
    let moved = false;
    for (const [dx, dy] of options) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && at(nx, ny) === WALL) {
        grid[(cy + dy / 2) * W + (cx + dx / 2)] = 0;
        grid[ny * W + nx] = 0;
        stack.push([nx, ny]);
        moved = true;
        break;
      }
    }
    if (!moved) stack.pop();
  }

  // --- braid: knock through walls to make loops, junctions, parallel halls ---
  const loopP = 0.26 + rng.r() * 0.14;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (at(x, y) !== WALL) continue;
      const l = at(x - 1, y) === 0;
      const r = at(x + 1, y) === 0;
      const u = at(x, y - 1) === 0;
      const d = at(x, y + 1) === 0;
      const horiz = l && r && !u && !d;
      const vert = u && d && !l && !r;
      if ((horiz || vert) && rng.chance(loopP)) grid[y * W + x] = 0;
    }
  }

  // --- widen a few stretches into wide halls and small connecting areas ---
  const widen = 4 + rng.int(6);
  for (let i = 0; i < widen; i++) {
    const x = 1 + rng.int(W - 2);
    const y = 1 + rng.int(H - 2);
    if (at(x, y) !== 0) continue;
    const [dx, dy] = rng.pick(DIRS);
    const nx = x + dx;
    const ny = y + dy;
    if (nx > 0 && ny > 0 && nx < W - 1 && ny < H - 1 && at(nx, ny) === WALL) grid[ny * W + nx] = 0;
  }
  const plazas = 1 + rng.int(2);
  for (let i = 0; i < plazas; i++) {
    const cx = 4 + rng.int(Math.max(1, W - 8));
    const cy = 4 + rng.int(Math.max(1, H - 8));
    for (let y = cy - 1; y <= cy + 1; y++) {
      for (let x = cx - 1; x <= cx + 1; x++) {
        if (x > 0 && y > 0 && x < W - 1 && y < H - 1) grid[y * W + x] = 0;
      }
    }
  }

  const cells = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) if (at(x, y) === 0) cells.push({ x, y });
  }

  const room = { W, H, grid, index, seed, themeId: map.id };

  // --- spawn & exit ---
  let spawn = rng.pick(cells);
  for (let i = 0; i < 40; i++) {
    const c = rng.pick(cells);
    if (openNeighbours(grid, W, c.x, c.y, W, H) >= 2) {
      spawn = c;
      break;
    }
  }
  let dist = bfsField(room, spawn.x, spawn.y);
  let exitCell = spawn;
  let best = 0;
  for (const c of cells) {
    const d = dist[c.y * W + c.x];
    if (d > best) {
      best = d;
      exitCell = c;
    }
  }

  // --- door in a wall next to the exit ---
  let door = null;
  const doorDirs = rng.shuffle(DIRS.slice());
  for (const pass of [0, 1]) {
    for (const [dx, dy] of doorDirs) {
      const wx = exitCell.x + dx;
      const wy = exitCell.y + dy;
      if (wx <= 0 || wy <= 0 || wx >= W - 1 || wy >= H - 1) continue;
      if (at(wx, wy) !== WALL) continue;
      const bx = wx + dx;
      const by = wy + dy;
      if (pass === 0 && (bx <= 0 || by <= 0 || bx >= W - 1 || by >= H - 1 || at(bx, by) !== WALL)) continue;
      door = { x: wx, y: wy };
      break;
    }
    if (door) break;
  }
  if (!door) {
    for (const [dx, dy] of DIRS) {
      const wx = exitCell.x + dx;
      const wy = exitCell.y + dy;
      if (wx > 0 && wy > 0 && wx < W - 1 && wy < H - 1 && at(wx, wy) === WALL) {
        door = { x: wx, y: wy };
        break;
      }
    }
  }
  if (door) grid[door.y * W + door.x] = DOOR;

  // --- windows on corridor walls (rain outside) ---
  let windowCount = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (at(x, y) !== WALL) continue;
      if (door && door.x === x && door.y === y) continue;
      if (openNeighbours(grid, W, x, y, W, H) !== 1) continue;
      if (rng.chance(0.07)) {
        grid[y * W + x] = WINDOW;
        windowCount++;
      }
    }
  }

  // --- furniture: placed in pockets/corners, validated so nothing blocks the way out ---
  const spawnKey = spawn.x + ',' + spawn.y;
  const candidates = rng.shuffle(
    cells.filter((c) => {
      if (c.x === exitCell.x && c.y === exitCell.y) return false;
      if (c.x + ',' + c.y === spawnKey) return false;
      if (Math.abs(c.x - spawn.x) + Math.abs(c.y - spawn.y) < 3) return false;
      let openN = 0;
      for (const [dx, dy] of DIRS) if (at(c.x + dx, c.y + dy) === 0) openN++;
      return openN <= 2;
    })
  );

  const objects = [];
  const blocked = new Set();
  let n = 0;

  const walkableFrom = (set) => {
    const dist = new Int32Array(W * H).fill(-1);
    const start = spawn.y * W + spawn.x;
    if (at(spawn.x, spawn.y) !== 0) return dist;
    dist[start] = 0;
    const q = [start];
    let head = 0;
    while (head < q.length) {
      const i = q[head++];
      const x = i % W;
      const y = (i / W) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ni = ny * W + nx;
        if (grid[ni] !== 0 || dist[ni] !== -1 || set.has(nx + ',' + ny)) continue;
        dist[ni] = dist[i] + 1;
        q.push(ni);
      }
    }
    return dist;
  };

  const stillValid = () => {
    const dist = walkableFrom(blocked);
    if (dist[exitCell.y * W + exitCell.x] < 0) return false;
    for (const o of objects) {
      let ok = false;
      for (const [dx, dy] of DIRS) {
        const nx = o.gx + dx;
        const ny = o.gy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (dist[ny * W + nx] >= 0) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    return true;
  };

  const wanted = ['cabinet', 'chest', 'desk', 'cabinet', 'chest', 'desk', 'cabinet'];
  const maxObjects = 4 + (index > 2 ? 1 : 0) + (index > 6 ? 1 : 0);
  for (const c of candidates) {
    if (objects.length >= maxObjects) break;
    const type = wanted[objects.length] || rng.weighted([
      ['chest', 3],
      ['desk', 2],
      ['cabinet', 2],
    ]);
    const key = c.x + ',' + c.y;
    blocked.add(key);
    objects.push({
      id: 'o' + n++,
      type,
      gx: c.x,
      gy: c.y,
      x: c.x + 0.5,
      y: c.y + 0.5,
      open: false,
      searched: false,
      loot: [],
    });
    if (!stillValid()) {
      blocked.delete(key);
      objects.pop();
    }
  }

  // --- exit lock & guaranteed key ---
  const lockRoll = rng.r();
  let lock = null;
  if (index > 1 && lockRoll < Math.min(0.5, 0.18 + index * 0.012)) {
    lock = rng.chance(0.55) ? 'key' : 'card';
  }

  const lootFor = (type) => {
    const loot = [];
    const coins = type === 'chest' ? 3 + rng.int(7) : type === 'desk' ? 1 + rng.int(4) : rng.int(4);
    if (coins > 0) loot.push({ item: 'coin', qty: coins });
    const rolls = type === 'chest' ? 2 : 1;
    for (let i = 0; i < rolls; i++) {
      if (!rng.chance(0.55)) continue;
      loot.push({ item: rng.weighted([
        ['battery', 4],
        ['bandage', 3],
        ['flare', 2.4],
        ['key', 0.6],
        ['card', 0.5],
      ]), qty: 1 });
    }
    return loot;
  };

  objects.forEach((o) => {
    o.loot = lootFor(o.type);
  });

  const extras = [];
  if (lock) {
    if (objects.length > 0) {
      const target = rng.pick(objects);
      target.loot.push({ item: lock, qty: 1 });
      target.hasKey = true;
    } else {
      extras.push({
        id: 'x' + n++,
        type: lock === 'key' ? 'key' : 'card',
        gx: spawn.x,
        gy: spawn.y,
        x: spawn.x + 0.5,
        y: spawn.y + 0.5 + 0.001,
        open: false,
        searched: false,
        loot: [],
        ground: true,
      });
    }
  }

  // --- loose coins on the floor ---
  const coins = [];
  const coinCount = 2 + rng.int(4);
  for (let i = 0; i < coinCount; i++) {
    const c = rng.pick(cells);
    if (blocked.has(c.x + ',' + c.y)) continue;
    if (c.x === spawn.x && c.y === spawn.y) continue;
    coins.push({ x: c.x + 0.35 + rng.r() * 0.3, y: c.y + 0.35 + rng.r() * 0.3, taken: false });
  }

  // --- lighting ---
  const modes = ['normal', 'normal', 'dim', 'dim', 'dark', 'flicker', 'emergency', 'broken', 'colored'];
  const mode = rng.pick(modes);
  const colorSets = {
    normal: [235, 232, 220],
    dim: [190, 190, 180],
    dark: [120, 130, 140],
    flicker: [240, 236, 220],
    emergency: [220, 70, 55],
    broken: [180, 180, 170],
    colored: rng.pick([
      [120, 200, 190],
      [200, 180, 110],
      [150, 160, 220],
    ]),
  };
  const levels = { normal: 1, dim: 0.74, dark: 0.36, flicker: 0.9, emergency: 0.72, broken: 0.62, colored: 0.82 };
  const light = { mode, level: levels[mode], color: colorSets[mode], flicker: mode === 'flicker' || mode === 'broken' };

  // --- creature encounter ---
  const boss = index > 0 && index % 7 === 0;
  const type = boss ? rng.pick(['warden', 'mother']) : rng.pick(map.creatures);
  const hasEncounter = rng.chance(0.85);
  const encounter = hasEncounter
    ? {
        type,
        boss,
        phase: 'idle',
        at: Math.max(8, rng.range(16, 34) - Math.min(9, index * 0.5)),
        timer: 0,
        warnLen: boss ? 8 : 4.5 + rng.r() * 2.5,
      }
    : null;

  // --- spawn facing ---
  let ang = 0;
  const openDirs = DIRS.filter(([dx, dy]) => at(spawn.x + dx, spawn.y + dy) === 0);
  if (openDirs.length) {
    const [dx, dy] = rng.pick(openDirs);
    ang = Math.atan2(dy, dx);
  }

  return {
    ...room,
    cells,
    spawn: { x: spawn.x + 0.5, y: spawn.y + 0.5, ang },
    exit: door ? { gx: door.x, gy: door.y, lock } : { gx: exitCell.x, gy: exitCell.y, lock: null },
    exitCell,
    objects: [...objects, ...extras],
    coins,
    blocked,
    light,
    encounter,
    danger,
    windowCount,
  };
}