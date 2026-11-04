import { getTextures, TS } from './textures';
import { buildSprites, OBJECT_SPECS, drawCreature } from './sprites';
import { generateRoom, bfsField, WALL, WINDOW, DOOR } from './mapgen';
import { Sound } from './audio';
import { CREATURES, mapById } from './meta';

const HALF_PI = Math.PI / 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const tick = () => new Promise((r) => setTimeout(r, 16));
const pad3 = (n) => String(n).padStart(3, '0');

const FX_PROFILE = {
  rusher: { shake: 0.55, flicker: 0.8, dust: 0.25, sound: 'rumble', hint: 'The floor begins to shake in a steady rhythm.' },
  mime: { fog: 0.5, silence: 0.7, sound: 'creak', hint: 'Footsteps answer yours a half second late.' },
  vigil: { dim: 0.7, dust: 0.5, sound: 'stone', hint: 'The corridor behind you is getting darker.' },
  crawler: { dust: 1, shake: 0.3, sound: 'skitter', hint: 'Something scratches along the ceiling above you.' },
  hollow: { fog: 1, dim: 0.4, sound: 'whisper', hint: 'The dark stops feeling empty.' },
  chorus: { silence: 1, tint: [200, 150, 110], sound: 'chime', hint: 'Everything goes completely silent.' },
  warden: { shake: 1, dust: 1, dim: 0.5, sound: 'warden', hint: 'The floor stops being level.' },
  mother: { distort: 1, fog: 0.7, sound: 'mother', hint: 'The hallway is getting longer.' },
};

export class Game {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.map = mapById(opts.mapId || 'basement');
    this.quality = opts.quality || 'medium';
    this.sensitivity = opts.sensitivity || 1;
    this.sound = new Sound(opts.volume ?? 0.7);
    this.textures = null;
    this.sprites = null;
    this.room = null;
    this.roomIndex = 1;
    this.creatures = [];
    this.keys = {};
    this.raf = 0;
    this.lastT = 0;
    this.time = 0;
    this.fpsT = 0;
    this.fpsN = 0;
    this.shake = 0;
    this.distort = 0;
    this.dust = [];
    this.transition = null;
    this.death = null;
    this.flareT = 0;
    this.planeLen = Math.tan((70 * Math.PI) / 360);
    this.hud = {
      room: 1,
      mapName: this.map.name,
      mapTag: this.map.tag,
      coins: opts.coins || 0,
      health: 100,
      battery: 100,
      maxBattery: 100,
      lanternOn: false,
      inv: { ...(opts.inventory || {}) },
      prompt: '',
      message: '',
      uiMode: 'loading',
      cause: '',
      fps: 60,
      hidden: false,
      depth: 1,
    };
    this.player = {
      x: 1.5,
      y: 1.5,
      ang: 0,
      health: 100,
      battery: 100,
      maxBattery: 100,
      lanternOn: false,
      inv: { ...(opts.inventory || {}) },
      hidden: false,
      hideCabinet: null,
      noise: 0,
      stepPhase: 0,
      viewBob: 0,
    };
    this.maxDist = 12;
    this.level = 1;
    this.tint = [235, 232, 220];
    this.windowFrame = 0;
    this._onKeyDown = this.onKeyDown.bind(this);
    this._onKeyUp = this.onKeyUp.bind(this);
    this._onMouse = this.onMouseMove.bind(this);
    this._onResize = () => this.resize();
  }

  async load(onProgress) {
    onProgress?.(0.05, 'Waking textures');
    await tick();
    this.textures = getTextures(this.map);
    onProgress?.(0.35, 'Forging models');
    await tick();
    this.sprites = buildSprites();
    onProgress?.(0.7, 'Building creatures');
    await tick();
    this.sound.init();
    onProgress?.(0.86, 'Tuning the dark');
    await tick();
    this.resize();
    onProgress?.(1, 'Opening the hall');
    await tick();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width));
    const h = Math.max(180, Math.round(rect.height));
    this.canvas.width = w;
    this.canvas.height = h;
    const q = this.quality === 'high' ? 720 : this.quality === 'low' ? 352 : 480;
    this.RW = q;
    this.RH = Math.round((q * 9) / 16);
    this.focal = this.RW / (2 * this.planeLen);
    this.buf = document.createElement('canvas');
    this.buf.width = this.RW;
    this.buf.height = this.RH;
    this.bctx = this.buf.getContext('2d');
    this.img = this.bctx.createImageData(this.RW, this.RH);
    this.buf32 = new Uint32Array(this.img.data.buffer);
    this.zbuf = new Float32Array(this.RW);
    // letterboxed destination
    const aspect = 16 / 9;
    let dw = w;
    let dh = Math.round(w / aspect);
    if (dh > h) {
      dh = h;
      dw = Math.round(h * aspect);
    }
    this.fit = { x: (w - dw) / 2, y: (h - dh) / 2, w: dw, h: dh };
    const cx = this.fit.x + dw / 2;
    const cy = this.fit.y + dh / 2;
    const vg = this.ctx.createRadialGradient(cx, cy, Math.min(dw, dh) * 0.18, cx, cy, Math.max(dw, dh) * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(0.65, 'rgba(0,0,0,0.42)');
    vg.addColorStop(1, 'rgba(0,0,0,0.92)');
    this.vignette = vg;
    const lg = this.ctx.createRadialGradient(cx, cy, 4, cx, cy, Math.min(dw, dh) * 0.85);
    lg.addColorStop(0, 'rgba(255,206,140,0.24)');
    lg.addColorStop(0.4, 'rgba(240,170,100,0.10)');
    lg.addColorStop(1, 'rgba(230,150,80,0)');
    this.lanternGlow = lg;
    if (!this.noiseTile) {
      const nc = document.createElement('canvas');
      nc.width = 96;
      nc.height = 96;
      const nctx = nc.getContext('2d');
      const id = nctx.createImageData(96, 96);
      for (let i = 0; i < 96 * 96; i++) {
        const v = 120 + Math.random() * 135;
        id.data[i * 4] = v;
        id.data[i * 4 + 1] = v;
        id.data[i * 4 + 2] = v;
        id.data[i * 4 + 3] = 255;
      }
      nctx.putImageData(id, 0, 0);
      this.noiseTile = nc;
    }
  }

  begin({ roomIndex = 1, inventory, coins = 0 } = {}) {
    if (inventory) this.player.inv = { ...inventory };
    this.hud.coins = coins;
    this.setUi('play');
    this.roomIndex = roomIndex;
    this.player.maxBattery = this.player.inv.lanternUpgrade ? 160 : 100;
    this.player.health = 100;
    this.player.battery = this.player.maxBattery;
    this.player.hidden = false;
    this.player.hideCabinet = null;
    this.enterRoom(roomIndex);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    document.addEventListener('mousemove', this._onMouse);
    window.addEventListener('resize', this._onResize);
    this.sound.resume();
    this.sound.startDrone();
    this.running = true;
    this.lastT = 0;
    this.raf = requestAnimationFrame(this.loop);
    return true;
  }

  enterRoom(index, initial = false) {
    const room = generateRoom({ index, map: this.map, danger: 1 + index * 0.05 });
    this.room = room;
    this.creatures = [];
    this.dust = [];
    this.flareT = 0;
    this.roomIndex = index;
    this.player.x = room.spawn.x;
    this.player.y = room.spawn.y;
    this.player.ang = room.spawn.ang;
    this.player.hidden = false;
    this.player.hideCabinet = null;
    this.hud.room = index;
    this.hud.depth = index;
    this.hud.inv = { ...this.player.inv };
    this.hud.hidden = false;
    this.creatures = [];
    this.flow = bfsField(room, Math.floor(this.player.x), Math.floor(this.player.y));
    this.flowT = 0;
    this.warnSoundT = 0;
    this.message(`ROOM ${pad3(index)} · ${this.map.name.toUpperCase()}`, 2.6);
    if (room.windowCount > 0) this.opts.onDiscover?.('obj.window');
    this.opts.onDiscover?.('obj.door');
    this.opts.onRoom?.(index);
    if (!initial) this.sound.stinger();
  }

  /* ------------------------------- input ------------------------------- */

  onKeyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'tab') {
      e.preventDefault();
      if (this.hud.uiMode === 'play') this.setUi('index');
      else if (this.hud.uiMode === 'index') this.setUi('play');
      return;
    }
    if (k === 'escape') {
      e.preventDefault();
      if (this.hud.uiMode === 'play') this.pause();
      else if (this.hud.uiMode === 'pause') this.resume();
      else if (this.hud.uiMode === 'index') this.setUi('play');
      return;
    }
    if (this.hud.uiMode === 'play' && this.transition === null && !this.death) {
      if (k === 'e') this.interact();
      if (k === 'f') this.toggleLantern();
      if (k >= '1' && k <= '6') this.useSlot(Number(k) - 1);
      if (k === 'p') this.hud.showPerf = !this.hud.showPerf;
    }
    if (k === ' ') e.preventDefault();
    this.keys[k] = true;
  }

  onKeyUp(e) {
    this.keys[e.key.toLowerCase()] = false;
  }

  onMouseMove(e) {
    if (this.hud.uiMode !== 'play') return;
    if (document.pointerLockElement !== this.canvas) return;
    this.player.ang += e.movementX * 0.0021 * this.sensitivity;
  }

  pause() {
    this.setUi('pause');
    this.sound.suspend();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  resume() {
    this.setUi('play');
    this.sound.resume();
    this.requestLock();
  }

  requestLock() {
    try {
      if (document.pointerLockElement !== this.canvas) this.canvas.requestPointerLock?.();
    } catch (e) {
      /* pointer lock unavailable */
    }
  }

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    document.removeEventListener('mousemove', this._onMouse);
    window.removeEventListener('resize', this._onResize);
    this.sound.stopDrone();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  message(text, dur = 3) {
    this.hud.message = text;
    this.hud.messageT = dur;
  }

  setUi(mode) {
    this.hud.uiMode = mode;
    this.opts.onUi?.(mode);
  }

  /* ----------------------------- interaction ---------------------------- */

  tileAhead() {
    const d = 0.85;
    const tx = Math.floor(this.player.x + Math.cos(this.player.ang) * d);
    const ty = Math.floor(this.player.y + Math.sin(this.player.ang) * d);
    if (tx < 0 || ty < 0 || tx >= this.room.W || ty >= this.room.H) return null;
    const t = this.room.grid[ty * this.room.W + tx];
    if (t === DOOR) return { x: tx, y: ty, t };
    return null;
  }

  nearestObject() {
    const p = this.player;
    let best = null;
    for (const o of this.room.objects) {
      if (o.taken) continue;
      const dx = o.x - p.x;
      const dy = o.y - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 1.5) continue;
      const dot = (dx / (d || 1)) * Math.cos(p.ang) + (dy / (d || 1)) * Math.sin(p.ang);
      if (dot < 0.35 && d > 0.8) continue;
      if (!best || d < best.d) best = { o, d };
    }
    return best;
  }

  interact() {
    const p = this.player;
    if (p.hidden) {
      p.hidden = false;
      this.hud.hidden = false;
      this.sound.cabinet();
      this.message('You step back out into the corridor.', 2);
      return;
    }
    const doorT = this.tileAhead();
    const near = this.nearestObject();
    if (doorT && (!near || near.d > 1.0)) {
      this.tryDoor();
      return;
    }
    if (!near) return;
    const o = near.o;
    if (o.type === 'coin') return;
    if (o.type === 'key' || o.type === 'card') {
      o.taken = true;
      p.inv[o.type] = (p.inv[o.type] || 0) + 1;
      this.hud.inv = { ...p.inv };
      this.sound.pickup();
      this.opts.onDiscover?.(o.type === 'key' ? 'item.key' : 'item.card');
      this.message(o.type === 'key' ? 'Took a brass key.' : 'Took an access card.', 2.4);
      return;
    }
    if (o.type === 'cabinet') {
      if (!o.open) {
        o.open = true;
        this.sound.cabinet();
        this.opts.onDiscover?.('obj.cabinet');
        this.message('Empty cabinet. Press E again to climb inside.', 3);
        return;
      }
      this.hideIn(o);
      return;
    }
    if (!o.open) {
      o.open = true;
      this.sound.drawer();
      this.opts.onDiscover?.(o.type === 'chest' ? 'obj.chest' : 'obj.desk');
      this.collectLoot(o);
      return;
    }
    if (!o.searched) this.collectLoot(o);
  }

  collectLoot(o) {
    o.searched = true;
    if (!o.loot.length) {
      this.message('Nothing but dust and old paper.', 2.6);
      return;
    }
    const parts = [];
    const bonus = this.player.inv.coinBonus ? 1 : 0;
    for (const l of o.loot) {
      if (l.item === 'coin') {
        const qty = l.qty + bonus;
        this.addCoins(qty);
        parts.push(`${qty} coin${qty > 1 ? 's' : ''}`);
      } else {
        this.player.inv[l.item] = (this.player.inv[l.item] || 0) + l.qty;
        this.opts.onDiscover?.('item.' + l.item);
        parts.push(l.item === 'battery' ? 'a battery' : l.item === 'bandage' ? 'a bandage' : l.item === 'flare' ? 'a flare' : l.item === 'key' ? 'a brass key' : 'an access card');
      }
    }
    o.loot = [];
    this.hud.inv = { ...this.player.inv };
    this.sound.pickup();
    this.message('Found ' + parts.join(', ') + '.', 3.2);
  }

  addCoins(n) {
    this.hud.coins += n;
    this.sound.coin();
    this.opts.onCoins?.(n);
    this.opts.onDiscover?.('obj.coin');
  }

  hideIn(o) {
    const p = this.player;
    p.hidden = true;
    p.hideCabinet = o;
    p.x = o.x;
    p.y = o.y;
    this.hud.hidden = true;
    this.sound.cabinet();
    this.opts.onDiscover?.('obj.cabinet');
    const near = this.creatures.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < 2.6);
    if (near) {
      near.heardYou = true;
      this.message('It saw you go in.', 3);
    } else {
      this.message('Inside the cabinet. Press E to climb out.', 3.5);
    }
  }

  tryDoor() {
    const ex = this.room.exit;
    if (ex.lock) {
      const need = ex.lock;
      if ((this.player.inv[need] || 0) > 0) {
        this.player.inv[need] -= 1;
        this.hud.inv = { ...this.player.inv };
        ex.lock = null;
        this.sound.door();
        this.message(need === 'key' ? 'The brass key turns.' : 'The reader blinks green.', 2);
        this.startTransition();
      } else {
        this.sound.locked();
        this.message(need === 'key' ? 'Locked. A brass key would fit this.' : 'Locked. The card reader is dead without a card.', 3);
      }
      return;
    }
    this.sound.door();
    this.startTransition();
  }

  startTransition() {
    if (this.transition) return;
    this.transition = { phase: 'out', t: 0 };
  }

  toggleLantern() {
    const p = this.player;
    if (!p.inv.lantern) {
      this.message('You have no lantern.', 2);
      return;
    }
    if (p.battery <= 0 && !p.lanternOn) {
      this.message('The lantern is dead. Use a battery (key 2).', 3);
      return;
    }
    p.lanternOn = !p.lanternOn;
    this.hud.lanternOn = p.lanternOn;
    this.sound.tone(p.lanternOn ? 420 : 240, 0.12, 'triangle', 0.06, p.lanternOn ? 620 : 160);
    this.opts.onDiscover?.('item.lantern');
  }

  useSlot(i) {
    const order = ['battery', 'flare', 'bandage', 'key', 'card'];
    const id = order[i];
    if (!id) return;
    const p = this.player;
    if (!(p.inv[id] > 0)) return;
    if (id === 'battery') {
      if (p.battery >= p.maxBattery) {
        this.message('The lantern is already full.', 2);
        return;
      }
      p.inv.battery -= 1;
      p.battery = p.maxBattery;
      this.sound.pickup();
      this.message('Battery swapped. Lantern full.', 2.4);
    } else if (id === 'flare') {
      p.inv.flare -= 1;
      this.flareT = 22;
      this.sound.warn('rumble');
      this.message('Flare lit. It will burn for a while.', 2.6);
    } else if (id === 'bandage') {
      p.inv.bandage -= 1;
      p.health = Math.min(100, p.health + 35);
      this.sound.pickup();
      this.message('Patched up.', 2.2);
    } else {
      this.message(id === 'key' ? 'A brass key. It opens locked doors.' : 'An access card. It opens secured doors.', 2.4);
      return;
    }
    this.hud.inv = { ...p.inv };
    this.hud.health = Math.round(p.health);
  }

  /* -------------------------------- loop -------------------------------- */

  loop = (t) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.loop);
    if (!this.lastT) this.lastT = t;
    let dt = (t - this.lastT) / 1000;
    this.lastT = t;
    if (dt > 0.06) dt = 0.06;
    this.time += dt;
    this.fpsN++;
    this.fpsT += dt;
    if (this.fpsT > 0.5) {
      this.hud.fps = Math.round(this.fpsN / this.fpsT);
      this.fpsN = 0;
      this.fpsT = 0;
    }
    if (this.hud.uiMode === 'play' || this.hud.uiMode === 'dying') this.update(dt);
    this.render(dt);
  };

  update(dt) {
    const p = this.player;
    const hud = this.hud;
    if (hud.messageT > 0) {
      hud.messageT -= dt;
      if (hud.messageT <= 0) hud.message = '';
    }
    if (this.death) {
      this.death.t += dt;
      this.shake = 1.4;
      if (this.death.t > 1.75 && hud.uiMode !== 'dead') {
        this.setUi('dead');
        hud.cause = CREATURES[this.death.type]?.name || 'Something';
        this.opts.onDeath?.({ room: this.roomIndex, type: this.death.type });
      }
      return;
    }
    if (this.transition) {
      const tr = this.transition;
      tr.t += dt;
      if (tr.phase === 'out' && tr.t > 0.55) {
        this.enterRoom(this.roomIndex + 1);
        tr.phase = 'in';
        tr.t = 0;
      } else if (tr.phase === 'in' && tr.t > 0.5) {
        this.transition = null;
      }
    }

    // ---- player movement ----
    const k = this.keys;
    let fwd = 0;
    let strafe = 0;
    if (!p.hidden && !this.transition) {
      if (k['w'] || k['arrowup']) fwd += 1;
      if (k['s'] || k['arrowdown']) fwd -= 1;
      if (k['d']) strafe += 1;
      if (k['a']) strafe -= 1;
    }
    const sprint = !!(k['shift'] && fwd > 0);
    if (k['arrowleft']) p.ang -= 2.3 * dt * this.sensitivity;
    if (k['arrowright']) p.ang += 2.3 * dt * this.sensitivity;
    const speed = sprint ? 2.45 : 1.5;
    const len = Math.hypot(fwd, strafe) || 1;
    const vx = ((Math.cos(p.ang) * fwd - Math.sin(p.ang) * strafe) / len) * speed;
    const vy = ((Math.sin(p.ang) * fwd + Math.cos(p.ang) * strafe) / len) * speed;
    if (fwd || strafe) {
      const nx = p.x + vx * dt;
      const ny = p.y + vy * dt;
      if (!this.blocked(nx, p.y)) p.x = nx;
      if (!this.blocked(p.x, ny)) p.y = ny;
      p.stepPhase += dt * (sprint ? 11 : 7);
      p.viewBob = Math.sin(p.stepPhase) * (sprint ? 2.6 : 1.5);
      p.noise = sprint ? 1 : 0.4;
      if (p.stepPhase > Math.PI) {
        p.stepPhase -= Math.PI * 2;
        this.sound.step(sprint);
      }
    } else {
      p.noise = 0.04;
      p.viewBob *= 0.9;
    }
    if (p.hidden) {
      p.noise = 0.05;
      p.viewBob = 0;
    }

    // ---- lantern / condition ----
    if (p.lanternOn) {
      p.battery = Math.max(0, p.battery - 1.55 * dt);
      if (p.battery <= 0) {
        p.lanternOn = false;
        hud.lanternOn = false;
        this.message('The lantern sputters out.', 3);
      }
      hud.battery = Math.round(p.battery);
    }
    if (this.flareT > 0) {
      this.flareT -= dt;
      p.battery = Math.min(p.maxBattery, p.battery);
    }
    const roomDark = this.room.light.level < 0.5;
    if (roomDark && !p.lanternOn && this.flareT <= 0) {
      p.health = Math.max(0, p.health - 1.1 * dt);
      hud.health = Math.round(p.health);
      if (p.health <= 0) {
        this.die('hollow', 'The dark took you.');
        return;
      }
    } else if (p.health < 100) {
      p.health = Math.min(100, p.health + 0.5 * dt);
      hud.health = Math.round(p.health);
    }

    // ---- coin pickup ----
    for (const c of this.room.coins) {
      if (c.taken) continue;
      if (Math.hypot(c.x - p.x, c.y - p.y) < 0.45) {
        c.taken = true;
        this.addCoins(1);
        this.message('Picked up a coin.', 1.4);
      }
    }

    // ---- prompt ----
    let prompt = '';
    if (p.hidden) prompt = 'E — leave the cabinet';
    else {
      const near = this.nearestObject();
      const doorT = this.tileAhead();
      if (near) {
        const o = near.o;
        if (o.type === 'cabinet') prompt = o.open ? 'E — hide inside' : 'E — open cabinet';
        else if (o.type === 'chest') prompt = o.searched ? 'Empty footlocker' : 'E — search footlocker';
        else if (o.type === 'desk') prompt = o.searched ? 'Empty drawer' : 'E — search drawer';
        else if (o.type === 'key') prompt = 'E — take key';
        else if (o.type === 'card') prompt = 'E — take card';
      }
      if (doorT && (!near || near.d > 1.0)) {
        const lock = this.room.exit.lock;
        prompt = lock ? `Locked — needs ${lock === 'key' ? 'a key' : 'a card'}` : 'E — open door and descend';
      }
    }
    hud.prompt = prompt;
    hud.hidden = p.hidden;

    // ---- fx ----
    const e = this.room.encounter;
    const prof = e ? FX_PROFILE[e.type] || {} : {};
    const warning = e && e.phase === 'warn';
    const active = e && e.phase === 'active';
    let shake = 0;
    let dist = 0;
    if (warning) {
      shake = (prof.shake || 0) * 0.35;
      dist = (prof.distort || 0) * 0.9;
      this.warnSoundT -= dt;
      if (this.warnSoundT <= 0) {
        this.sound.warn(prof.sound || 'flicker');
        this.warnSoundT = 1.1 + Math.random() * 1.4;
      }
      if (prof.dust) {
        for (let i = 0; i < 2; i++) {
          this.dust.push({
            x: Math.random() * this.RW,
            y: Math.random() * this.RH * 0.5,
            vx: (Math.random() - 0.5) * 8,
            vy: 10 + Math.random() * 26,
            life: 1.6 + Math.random(),
          });
        }
      }
    }
    if (active) {
      shake = (prof.shake || 0) * 0.5;
      dist = (prof.distort || 0) * 0.35;
      if (prof.dust) {
        const c = this.creatures[0];
        if (c && Math.hypot(c.x - p.x, c.y - p.y) < 9) {
          this.dust.push({ x: Math.random() * this.RW, y: Math.random() * this.RH * 0.4, vx: (Math.random() - 0.5) * 6, vy: 12 + Math.random() * 20, life: 1.2 });
        }
      }
    }
    this.shake = shake;
    this.distort = dist;
    this.dust = this.dust.filter((d) => {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      return d.life > 0;
    });

    // ---- encounter timeline ----
    this.updateEncounter(dt);
    // ---- creatures ----
    this.flowT -= dt;
    if (this.flowT <= 0) {
      this.flow = bfsField(this.room, Math.floor(p.x), Math.floor(p.y));
      this.flowT = 0.4;
    }
    for (const c of this.creatures) this.updateCreature(c, dt);
    this.creatures = this.creatures.filter((c) => !c.gone);
  }

  blocked(x, y) {
    const r = 0.2;
    const room = this.room;
    for (const [ox, oy] of [
      [-r, -r],
      [r, -r],
      [-r, r],
      [r, r],
    ]) {
      const gx = Math.floor(x + ox);
      const gy = Math.floor(y + oy);
      if (gx < 0 || gy < 0 || gx >= room.W || gy >= room.H) return true;
      if (room.grid[gy * room.W + gx] !== 0) return true;
    }
    for (const o of room.objects) {
      if (o.taken) continue;
      const spec = OBJECT_SPECS[o.type];
      if (!spec || !spec.solid) continue;
      if (o === this.player.hideCabinet && this.player.hidden) continue;
      if (Math.hypot(o.x - x, o.y - y) < spec.solid + r) return true;
    }
    return false;
  }

  losClear(x0, y0, x1, y1) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist * 6);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const gx = Math.floor(x0 + dx * t);
      const gy = Math.floor(y0 + dy * t);
      if (gx < 0 || gy < 0 || gx >= this.room.W || gy >= this.room.H) return false;
      if (this.room.grid[gy * this.room.W + gx] !== 0) return false;
    }
    return true;
  }

  updateEncounter(dt) {
    const e = this.room.encounter;
    if (!e) return;
    if (e.phase === 'idle') {
      e.at -= dt;
      if (e.at <= 0) {
        e.phase = 'warn';
        e.timer = e.warnLen;
        this.warnSoundT = 0;
        const prof = FX_PROFILE[e.type] || {};
        this.message(prof.hint || 'Something is wrong with the corridor.', 4);
      }
    } else if (e.phase === 'warn') {
      e.timer -= dt;
      if (e.timer <= 0) {
        e.phase = 'active';
        this.spawnCreature(e.type, e.boss);
      }
    }
  }

  spawnCreature(type, boss) {
    const p = this.player;
    const cells = this.room.cells
      .filter((c) => Math.hypot(c.x + 0.5 - p.x, c.y + 0.5 - p.y) > 6)
      .sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
    const spot = cells[Math.floor(Math.random() * Math.min(6, cells.length))] || this.room.exitCell;
    const cfg = CREATURES[type];
    this.creatures.push({
      type,
      boss,
      cfg,
      x: spot.x + 0.5,
      y: spot.y + 0.5,
      ang: 0,
      phase: Math.random(),
      state: 'approach',
      passT: 0,
      heardYou: false,
      observed: false,
      target: null,
      gone: false,
    });
    this.sound.stinger();
    this.opts.onDiscover?.(type);
    this.message(boss ? 'The corridor changes shape around something enormous.' : 'Something is in the corridor with you.', 4);
  }

  updateCreature(c, dt) {
    const p = this.player;
    c.phase = (c.phase + dt * (c.boss ? 1.6 : 2.6)) % 1;
    const dx = p.x - c.x;
    const dy = p.y - c.y;
    const dist = Math.hypot(dx, dy) || 0.001;
    const toPlayer = Math.atan2(dy, dx);
    c.ang = toPlayer;
    let diff = Math.abs(((toPlayer - p.ang + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
    const observed = diff < this.planeLen * 0.9 + 0.12 && dist < 15 && this.losClear(c.x, c.y, p.x, p.y);
    c.observed = observed;

    let speed = c.cfg.speed * (1 + Math.min(0.5, this.roomIndex * 0.012));
    if (c.type === 'mime' && observed && !p.hidden) speed = 0;
    if (c.type === 'vigil' && observed && !p.hidden) speed = 0;
    if (c.type === 'vigil' && !observed) speed *= 1.15;
    if (c.type === 'hollow') {
      const lit = (p.lanternOn && p.battery > 0) || this.flareT > 0;
      if (lit && dist < 6) speed = -speed * 0.9;
    }
    const noise = p.noise * (p.inv.quiet ? 0.32 : 1);
    if (c.type === 'chorus') speed *= noise > 0.6 ? 1.7 : 0.5;
    if (c.heardYou) speed *= 1.25;

    // kill checks
    if (!p.hidden && dist < 0.85) {
      this.die(c.type);
      return;
    }
    if (p.hidden && c.heardYou && dist < 1.25) {
      this.die(c.type);
      return;
    }

    if (speed === 0) return;

    if (c.state === 'approach') {
      if (p.hidden && dist < 1.4) {
        c.state = 'passing';
        c.passT = 0;
        const far = this.room.cells
          .filter((cl) => Math.hypot(cl.x + 0.5 - c.x, cl.y + 0.5 - c.y) > 9)
          .sort((a, b) => Math.hypot(b.x - p.x, b.y - p.y) - Math.hypot(a.x - p.x, a.y - p.y));
        c.target = far[0] || this.room.exitCell;
        if (!c.heardYou) this.message('It passes. Do not move.', 3);
        return;
      }
      this.stepToward(c, p.x, p.y, speed, dt);
    } else if (c.state === 'passing') {
      c.passT += dt;
      if (!c.target) c.target = this.room.exitCell;
      this.stepToward(c, c.target.x + 0.5, c.target.y + 0.5, speed * 0.9, dt);
      const dtg = Math.hypot(c.target.x + 0.5 - c.x, c.target.y + 0.5 - c.y);
      if (c.passT > 14 || dtg < 0.7) {
        c.gone = true;
        this.room.encounter.phase = 'done';
      }
    }
  }

  stepToward(c, tx, ty, speed, dt) {
    const gx = Math.floor(c.x);
    const gy = Math.floor(c.y);
    const W = this.room.W;
    let goal = { x: tx, y: ty };
    const flow = this.flow;
    if (flow && gx >= 0 && gy >= 0 && gx < this.room.W && gy < this.room.H) {
      const here = flow[gy * W + gx];
      if (here > 0) {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        let bestD = here;
        let bestC = null;
        for (const [dx, dy] of dirs) {
          const nx = gx + dx;
          const ny = gy + dy;
          if (nx < 0 || ny < 0 || nx >= this.room.W || ny >= this.room.H) continue;
          const d = flow[ny * W + nx];
          if (d >= 0 && d < bestD) {
            bestD = d;
            bestC = { x: nx + 0.5, y: ny + 0.5 };
          }
        }
        if (bestC) goal = bestC;
      }
    }
    const dx = goal.x - c.x;
    const dy = goal.y - c.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = c.x + (dx / d) * speed * dt;
    const ny = c.y + (dy / d) * speed * dt;
    const g2x = Math.floor(nx);
    const g2y = Math.floor(ny);
    if (this.room.grid[g2y * W + g2x] === 0) {
      c.x = nx;
      c.y = ny;
    } else {
      c.y = c.y + (dy / d) * speed * dt * 0.5;
      c.x = c.x + (dx / d) * speed * dt * 0.5;
    }
  }

  die(type, overrideCause) {
    if (this.death) return;
    this.death = { t: 0, type, cause: overrideCause };
    this.setUi('dying');
    this.sound.screech();
    this.sound.stopDrone();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  /* -------------------------------- render ------------------------------- */

  render(dt) {
    if (!this.room || !this.textures) return;
    const RW = this.RW;
    const RH = this.RH;
    const p = this.player;
    const room = this.room;
    const tex = this.textures;
    const data = this.buf32;
    const t = this.time;

    let level = room.light.level;
    if (room.light.flicker) {
      const n = Math.sin(t * 31) * Math.sin(t * 7.3) * Math.sin(t * 2.1);
      level *= 0.72 + 0.45 * Math.abs(n);
    }
    if (p.lanternOn && p.battery > 0) level = Math.min(1.35, level * 1.4 + 0.18);
    if (this.flareT > 0) level = Math.min(1.6, level + 0.45);
    const e = room.encounter;
    if (e && e.phase === 'warn') {
      const prof = FX_PROFILE[e.type] || {};
      if (prof.dim) level *= 1 - 0.4 * prof.dim;
      if (prof.flicker) level *= 0.85 + 0.3 * Math.abs(Math.sin(t * 18));
      if (prof.silence) level *= 0.92;
    }
    level = clamp(level, 0.12, 1.6);
    this.level = level;
    let tint = room.light.color.slice();
    if (p.lanternOn && p.battery > 0) tint = [Math.min(255, tint[0] * 0.5 + 130), Math.min(255, tint[1] * 0.5 + 110), Math.min(255, tint[2] * 0.5 + 70)];
    if (this.flareT > 0) tint = [255, 150, 90];
    if (e && e.phase === 'warn') {
      const prof = FX_PROFILE[e.type] || {};
      if (prof.tint) tint = prof.tint;
      if (prof.fog) level *= 1 - 0.15 * prof.fog;
    }
    this.tint = tint;
    const maxDist = clamp(2.5 + level * 9, 2.2, 17);
    this.maxDist = maxDist;
    this.windowFrame = Math.floor(t * 5) % 4;

    const shakeAmt = this.shake > 0 ? this.shake * 7 : 0;
    const shx = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
    const shy = shakeAmt ? (Math.random() - 0.5) * shakeAmt : 0;
    const ang = p.ang + shx * 0.0016;
    const dirX = Math.cos(ang);
    const dirY = Math.sin(ang);
    const planeX = -dirY * this.planeLen;
    const planeY = dirX * this.planeLen;
    const f = this.focal;
    const horizon = RH / 2 + shy + p.viewBob + (this.death ? Math.sin(this.death.t * 40) * 4 : 0);

    const fogR = Math.round(tint[0] * 0.11);
    const fogG = Math.round(tint[1] * 0.11);
    const fogB = Math.round(tint[2] * 0.11);

    // ---- floor & ceiling ----
    const fd = tex.floor.data;
    const cd = tex.ceil.data;
    for (let y = 0; y < RH; y++) {
      const pr = y - horizon;
      const isFloor = pr > 0;
      const denom = Math.max(1, Math.abs(pr));
      const dist = (0.5 * f) / denom;
      let k = 1 - dist / maxDist;
      if (k <= 0) {
        const row = y * RW;
        const col = (0xff << 24) | (fogB << 16) | (fogG << 8) | fogR;
        for (let x = 0; x < RW; x++) data[row + x] = col;
        continue;
      }
      k *= isFloor ? level : level * 0.72;
      if (k > 1.15) k = 1.15;
      const inv = 1 - k;
      const addR = fogR * inv;
      const addG = fogG * inv;
      const addB = fogB * inv;
      const src = isFloor ? fd : cd;
      let wx = p.x + dist * (dirX - planeX);
      let wy = p.y + dist * (dirY - planeY);
      const stepX = (dist * 2 * planeX) / RW;
      const stepY = (dist * 2 * planeY) / RW;
      const row = y * RW;
      for (let x = 0; x < RW; x++) {
        const tx = ((wx * TS) | 0) & 63;
        const ty = ((wy * TS) | 0) & 63;
        const si = ((ty << 6) + tx) << 2;
        const r = src[si] * k + addR;
        const g = src[si + 1] * k + addG;
        const b = src[si + 2] * k + addB;
        data[row + x] = 0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
        wx += stepX;
        wy += stepY;
      }
    }

    // ---- walls ----
    const W = room.W;
    const H = room.H;
    const grid = room.grid;
    const px = p.x;
    const py = p.y;
    const winTex = tex.windows[this.windowFrame];
    for (let x = 0; x < RW; x++) {
      const cameraX = (2 * x) / RW - 1;
      const rayX = dirX + planeX * cameraX;
      const rayY = dirY + planeY * cameraX;
      let mapX = Math.floor(px);
      let mapY = Math.floor(py);
      const deltaX = Math.abs(1 / (rayX || 1e-9));
      const deltaY = Math.abs(1 / (rayY || 1e-9));
      let stepXi;
      let stepYi;
      let sideDistX;
      let sideDistY;
      if (rayX < 0) {
        stepXi = -1;
        sideDistX = (px - mapX) * deltaX;
      } else {
        stepXi = 1;
        sideDistX = (mapX + 1 - px) * deltaX;
      }
      if (rayY < 0) {
        stepYi = -1;
        sideDistY = (py - mapY) * deltaY;
      } else {
        stepYi = 1;
        sideDistY = (mapY + 1 - py) * deltaY;
      }
      let tile = 0;
      let side = 0;
      let guard = 0;
      while (tile === 0 && guard++ < 160) {
        if (sideDistX < sideDistY) {
          sideDistX += deltaX;
          mapX += stepXi;
          side = 0;
        } else {
          sideDistY += deltaY;
          mapY += stepYi;
          side = 1;
        }
        if (mapX < 0 || mapY < 0 || mapX >= W || mapY >= H) {
          tile = WALL;
          break;
        }
        tile = grid[mapY * W + mapX];
      }
      let perp = side === 0 ? sideDistX - deltaX : sideDistY - deltaY;
      if (!isFinite(perp) || perp < 0.05) perp = 0.05;
      this.zbuf[x] = perp;
      const lineH = f / perp;
      const drawStart = horizon - lineH * 0.5;
      const y0 = Math.max(0, Math.ceil(drawStart));
      const y1 = Math.min(RH - 1, Math.floor(drawStart + lineH));
      let wallX = side === 0 ? py + perp * rayY : px + perp * rayX;
      wallX -= Math.floor(wallX);
      let texX = (wallX * TS) | 0;
      if ((side === 0 && rayX > 0) || (side === 1 && rayY < 0)) texX = TS - texX - 1;
      if (texX < 0) texX = 0;
      if (texX > TS - 1) texX = TS - 1;
      let tdata;
      if (tile === WINDOW) tdata = winTex.data;
      else if (tile === DOOR) tdata = room.exit && room.exit.gx === mapX && room.exit.gy === mapY ? tex.exit.data : tex.door.data;
      else {
        const hash = ((mapX * 73856093) ^ (mapY * 19349663)) >>> 0;
        tdata = hash % 5 === 0 ? tex.wall2.data : tex.wall.data;
      }
      let k = (1 - perp / maxDist) * level;
      if (side === 1) k *= 0.78;
      if (k < 0) k = 0;
      if (k > 1.2) k = 1.2;
      const inv = 1 - k;
      const addR = fogR * inv;
      const addG = fogG * inv;
      const addB = fogB * inv;
      const step = TS / lineH;
      let texPos = (y0 - drawStart) * step;
      for (let y = y0; y <= y1; y++) {
        const ty = (texPos | 0) & 63;
        texPos += step;
        const si = ((ty << 6) + texX) << 2;
        const r = tdata[si] * k + addR;
        const g = tdata[si + 1] * k + addG;
        const b = tdata[si + 2] * k + addB;
        data[y * RW + x] = 0xff000000 | ((b > 255 ? 255 : b | 0) << 16) | ((g > 255 ? 255 : g | 0) << 8) | (r > 255 ? 255 : r | 0);
      }
    }

    // ---- sprites ----
    const list = [];
    for (const o of room.objects) {
      if (o.taken) continue;
      const spec = OBJECT_SPECS[o.type];
      if (!spec) continue;
      let spr = null;
      if (o.type === 'cabinet') spr = o.open ? this.sprites.objects.cabinetOpen : this.sprites.objects.cabinetClosed;
      else if (o.type === 'chest') spr = o.open ? this.sprites.objects.chestOpen : this.sprites.objects.chestClosed;
      else if (o.type === 'desk') spr = o.open ? this.sprites.objects.deskOpen : this.sprites.objects.deskClosed;
      else if (o.type === 'key') spr = this.sprites.objects.key;
      else if (o.type === 'card') spr = this.sprites.objects.card;
      if (!spr) continue;
      const isGround = o.type === 'key' || o.type === 'card';
      list.push({ x: o.x, y: o.y, spr, w: spec.w, h: spec.h, lift: isGround ? 0.03 : 0 });
    }
    for (const c of room.coins) {
      if (c.taken) continue;
      const spr = this.sprites.objects.coins[Math.floor(t * 6) % 4];
      list.push({ x: c.x, y: c.y, spr, w: 0.15, h: 0.15, lift: 0.03 + Math.sin(t * 3 + c.x) * 0.01 });
    }
    for (const c of this.creatures) {
      const frames = this.sprites.creatures[c.type] || this.sprites.creatures.rusher;
      let idx = Math.floor(c.phase * 6) % 6;
      if (c.observed && (c.type === 'mime' || c.type === 'vigil')) idx = 0;
      const spr = frames[idx];
      list.push({ x: c.x, y: c.y, spr, w: c.cfg.size[0] * 1.9, h: c.cfg.size[1] * 1.35, lift: 0, creature: c });
    }
    list.sort((a, b) => {
      const da = (a.x - px) ** 2 + (a.y - py) ** 2;
      const db = (b.x - px) ** 2 + (b.y - py) ** 2;
      return db - da;
    });

    const invDet = 1 / (planeX * dirY - dirX * planeY);
    for (const s of list) {
      const relX = s.x - px;
      const relY = s.y - py;
      const tx = invDet * (dirY * relX - dirX * relY);
      const ty = invDet * (-planeY * relX + planeX * relY);
      if (ty < 0.15) continue;
      const screenX = (RW / 2) * (1 + tx / ty);
      const scale = f / ty;
      const sw = s.w * scale;
      const sh = s.h * scale;
      const floorY = horizon + (0.5 * f) / ty;
      const top = floorY - sh - (s.lift || 0) * scale;
      const x0 = Math.max(0, Math.floor(screenX - sw / 2));
      const x1 = Math.min(RW - 1, Math.ceil(screenX + sw / 2));
      const y0 = Math.max(0, Math.floor(top));
      const y1 = Math.min(RH - 1, Math.ceil(floorY - (s.lift || 0) * scale));
      if (x1 < x0 || y1 < y0) continue;
      let k = (1 - ty / maxDist) * level;
      if (k < 0.02) continue;
      if (k > 1.15) k = 1.15;
      const inv = 1 - k;
      const addR = fogR * inv;
      const addG = fogG * inv;
      const addB = fogB * inv;
      const sd = s.spr.data;
      const tw = s.spr.w;
      const th = s.spr.h;
      const spanX = x1 - x0 + 1;
      for (let x = x0; x <= x1; x++) {
        if (this.zbuf[x] <= ty) continue;
        const u = (((x - (screenX - sw / 2)) / sw) * tw) | 0;
        if (u < 0 || u >= tw) continue;
        for (let y = y0; y <= y1; y++) {
          const v = (((y - top) / sh) * th) | 0;
          if (v < 0 || v >= th) continue;
          const si = (v * tw + u) << 2;
          const a = sd[si + 3];
          if (a < 10) continue;
          const af = a / 255;
          const di = y * RW + x;
          const dst = data[di];
          const dr = dst & 255;
          const dg = (dst >> 8) & 255;
          const db = (dst >> 16) & 255;
          const sr = sd[si] * k + addR;
          const sg = sd[si + 1] * k + addG;
          const sb = sd[si + 2] * k + addB;
          const r = (sr * af + dr * (1 - af)) | 0;
          const g = (sg * af + dg * (1 - af)) | 0;
          const b = (sb * af + db * (1 - af)) | 0;
          data[di] = 0xff000000 | ((b > 255 ? 255 : b) << 16) | ((g > 255 ? 255 : g) << 8) | (r > 255 ? 255 : r);
        }
      }
      void spanX;
    }

    this.bctx.putImageData(this.img, 0, 0);

    // ---- composite ----
    const c = this.ctx;
    const fit = this.fit;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    const sx = fit.w / RW;
    const sy = fit.h / RH;
    if (this.distort > 0.02) {
      const bands = 16;
      const bh = Math.ceil(RH / bands);
      for (let i = 0; i < bands; i++) {
        const srcY = i * bh;
        const off = Math.sin(t * 7 + i * 1.7) * this.distort * 10 * sx;
        c.drawImage(this.buf, 0, srcY, RW, bh, fit.x + off, fit.y + srcY * sy, fit.w, bh * sy);
      }
    } else {
      c.drawImage(this.buf, fit.x, fit.y, fit.w, fit.h);
    }

    if (p.lanternOn && p.battery > 0) {
      c.globalCompositeOperation = 'lighter';
      c.fillStyle = this.lanternGlow;
      c.fillRect(fit.x, fit.y, fit.w, fit.h);
      c.globalCompositeOperation = 'source-over';
    }
    if (this.flareT > 0) {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 0.35 * Math.min(1, this.flareT / 2);
      c.fillStyle = 'rgba(255,140,60,1)';
      c.fillRect(fit.x, fit.y + fit.h * 0.6, fit.w, fit.h * 0.4);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'source-over';
    }

    // dust
    if (this.dust.length) {
      c.fillStyle = 'rgba(210,200,180,0.5)';
      for (const d of this.dust) {
        const dx = fit.x + (d.x / RW) * fit.w;
        const dy = fit.y + (d.y / RH) * fit.h;
        c.fillRect(dx, dy, 1.6, 2.5);
      }
    }

    // grain
    if (this.noiseTile) {
      c.globalAlpha = 0.05;
      const pat = c.createPattern(this.noiseTile, 'repeat');
      c.fillStyle = pat;
      c.save();
      c.translate(-Math.random() * 96, -Math.random() * 96);
      c.fillRect(fit.x, fit.y, fit.w + 96, fit.h + 96);
      c.restore();
      c.globalAlpha = 1;
    }

    c.fillStyle = this.vignette;
    c.fillRect(fit.x, fit.y, fit.w, fit.h);

    if (p.hidden) {
      c.fillStyle = 'rgba(0,0,0,0.92)';
      c.fillRect(fit.x, fit.y, fit.w, fit.h * 0.18);
      c.fillRect(fit.x, fit.y + fit.h * 0.82, fit.w, fit.h * 0.18);
      c.fillRect(fit.x, fit.y, fit.w * 0.06, fit.h);
      c.fillRect(fit.x + fit.w * 0.94, fit.y, fit.w * 0.06, fit.h);
      c.strokeStyle = 'rgba(150,150,140,0.18)';
      c.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const yy = fit.y + fit.h * (0.2 + i * 0.2);
        c.beginPath();
        c.moveTo(fit.x + fit.w * 0.05, yy);
        c.lineTo(fit.x + fit.w * 0.95, yy);
        c.stroke();
      }
    }

    if (this.death) {
      const tt = this.death.t;
      c.fillStyle = `rgba(60,6,4,${Math.min(0.7, tt * 0.5)})`;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
      const sc = 0.55 + Math.min(1.1, tt * 1.5);
      const cw = fit.w * 0.9 * sc;
      const chh = fit.h * 1.15 * sc;
      c.save();
      c.translate(fit.x + fit.w / 2 + Math.sin(tt * 50) * 8, fit.y + fit.h / 2 + Math.cos(tt * 44) * 6);
      drawCreature(c, this.death.type, (tt * 2.6) % 1, cw, chh, {});
      c.restore();
      c.fillStyle = `rgba(0,0,0,${Math.min(0.55, Math.max(0, tt - 1.2) * 1.4)})`;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.transition) {
      const a = this.transition.phase === 'out' ? Math.min(1, this.transition.t / 0.5) : Math.max(0, 1 - this.transition.t / 0.45);
      c.fillStyle = `rgba(0,0,0,${a})`;
      c.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    if (this.hud.uiMode === 'play' && !this.death && !p.hidden) {
      c.fillStyle = 'rgba(230,226,215,0.5)';
      c.fillRect(fit.x + fit.w / 2 - 1, fit.y + fit.h / 2 - 1, 2, 2);
      c.strokeStyle = 'rgba(230,226,215,0.18)';
      c.lineWidth = 1;
      c.beginPath();
      c.arc(fit.x + fit.w / 2, fit.y + fit.h / 2, 5, 0, 7);
      c.stroke();
    }
  }
}