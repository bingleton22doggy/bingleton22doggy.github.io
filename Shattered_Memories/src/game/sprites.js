import { mulberry32 } from './rng';

function sprite(w, h, fn) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d');
  fn(ctx, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  return { w, h, data: img.data };
}

function ell(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.6, rx), Math.max(0.6, ry), rot, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function limb(ctx, x1, y1, x2, y2, x3, y3, w, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.lineTo(x3, y3);
  ctx.stroke();
}

function glow(ctx, x, y, r, color, a = 1) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = a;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 7);
  ctx.fill();
  ctx.restore();
}

/* ----------------------------- object models ----------------------------- */

function drawChest(ctx, open) {
  const W = 56;
  const H = 46;
  const rng = mulberry32(open ? 5 : 4);
  ell(ctx, W / 2, H - 3, 22, 4, 'rgba(0,0,0,0.45)');
  // body
  const bodyGrad = ctx.createLinearGradient(0, 16, 0, H - 4);
  bodyGrad.addColorStop(0, '#6b4a2c');
  bodyGrad.addColorStop(0.6, '#4d3320');
  bodyGrad.addColorStop(1, '#2e1e13');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.moveTo(8, 18);
  ctx.lineTo(48, 18);
  ctx.lineTo(46, H - 5);
  ctx.lineTo(10, H - 5);
  ctx.closePath();
  ctx.fill();
  // planks
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(8 + i * 10, 19);
    ctx.lineTo(9 + i * 9.5, H - 5);
    ctx.stroke();
  }
  // metal bands
  ctx.fillStyle = '#54514a';
  ctx.fillRect(16, 17, 4, H - 22);
  ctx.fillRect(36, 17, 4, H - 22);
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.fillRect(16, 17, 1, H - 22);
  ctx.fillRect(36, 17, 1, H - 22);
  // latch
  ctx.fillStyle = '#8a7a4a';
  ctx.fillRect(26, 22, 5, 8);
  ctx.fillStyle = '#3a3222';
  ctx.fillRect(27.5, 25, 2, 3);
  if (open) {
    // revealed interior
    ctx.fillStyle = '#150f0a';
    ctx.beginPath();
    ctx.moveTo(9, 18);
    ctx.lineTo(47, 18);
    ctx.lineTo(45, 12);
    ctx.lineTo(11, 12);
    ctx.closePath();
    ctx.fill();
    glow(ctx, 28, 16, 18, 'rgba(240,190,110,0.55)');
    // lid tipped back
    ctx.fillStyle = '#3b2718';
    ctx.beginPath();
    ctx.moveTo(8, 17);
    ctx.lineTo(48, 17);
    ctx.lineTo(44, 6);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#59544a';
    ctx.fillRect(20, 6, 3.5, 11);
    ctx.fillRect(33, 6, 3.5, 11);
    // coins peeking
    ctx.fillStyle = '#d8b06a';
    ctx.beginPath();
    ctx.arc(22, 14, 2.4, 0, 7);
    ctx.arc(28, 13, 2.4, 0, 7);
    ctx.arc(34, 14.5, 2.2, 0, 7);
    ctx.fill();
  } else {
    // closed lid (curved)
    const lidGrad = ctx.createLinearGradient(0, 6, 0, 18);
    lidGrad.addColorStop(0, '#7d5836');
    lidGrad.addColorStop(1, '#4a3120');
    ctx.fillStyle = lidGrad;
    ctx.beginPath();
    ctx.moveTo(8, 18);
    ctx.lineTo(48, 18);
    ctx.lineTo(45, 9);
    ctx.quadraticCurveTo(28, 2, 11, 9);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#54514a';
    ctx.fillRect(20, 5, 3.5, 13);
    ctx.fillRect(33, 5, 3.5, 13);
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(12, 8);
    ctx.quadraticCurveTo(28, 2.5, 44, 8);
    ctx.stroke();
  }
  // highlight
  ctx.fillStyle = 'rgba(255,230,190,0.06)';
  ctx.fillRect(10, H - 16, 36, 2);
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(${120 + rng() * 60},${100 + rng() * 40},80,0.06)`;
    ctx.fillRect(rng() * W, 16 + rng() * 26, 3, 1);
  }
}

function drawCabinet(ctx, open, W = 48, H = 96) {
  ell(ctx, W / 2, H - 2, 20, 3.5, 'rgba(0,0,0,0.5)');
  const g = ctx.createLinearGradient(6, 0, W - 6, 0);
  g.addColorStop(0, '#3b4340');
  g.addColorStop(0.35, '#586360');
  g.addColorStop(0.8, '#414a47');
  g.addColorStop(1, '#2b322f');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(7, 8);
  ctx.lineTo(W - 7, 8);
  ctx.lineTo(W - 6, H - 6);
  ctx.lineTo(6, H - 6);
  ctx.closePath();
  ctx.fill();
  // top cap
  ctx.fillStyle = '#6a7672';
  ctx.fillRect(5, 4, W - 10, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.14)';
  ctx.fillRect(5, 4, W - 10, 1.5);
  // feet
  ctx.fillStyle = '#222926';
  ctx.fillRect(9, H - 7, 5, 6);
  ctx.fillRect(W - 14, H - 7, 5, 6);
  // vents
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  for (let i = 0; i < 4; i++) ctx.fillRect(W / 2 - 9, 12 + i * 3, 18, 1.4);
  if (!open) {
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.4;
    ctx.strokeRect(9.5, 30, (W - 19) / 2, H - 42);
    ctx.strokeRect(W / 2 + 0.5, 30, (W - 19) / 2, H - 42);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(11, 32, (W - 21) / 2, 8);
    // handles
    ctx.fillStyle = '#b6b2a0';
    ctx.fillRect(W / 2 - 5, H / 2, 3, 8);
    ctx.fillRect(W / 2 + 2, H / 2, 3, 8);
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(W / 2 - 5, H / 2 + 7, 3, 1.6);
    ctx.fillRect(W / 2 + 2, H / 2 + 7, 3, 1.6);
  } else {
    // black interior with shelves
    ctx.fillStyle = '#0d100f';
    ctx.fillRect(10, 30, W - 20, H - 42);
    ctx.fillStyle = 'rgba(120,140,135,0.18)';
    ctx.fillRect(11, 46, W - 22, 2);
    ctx.fillRect(11, 66, W - 22, 2);
    // open doors swung outward
    ctx.fillStyle = '#4b5552';
    ctx.beginPath();
    ctx.moveTo(9, 30);
    ctx.lineTo(2, 36);
    ctx.lineTo(2, H - 16);
    ctx.lineTo(9, H - 12);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(W - 9, 30);
    ctx.lineTo(W - 2, 36);
    ctx.lineTo(W - 2, H - 16);
    ctx.lineTo(W - 9, H - 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(10, 30, W - 20, 3);
    glow(ctx, W / 2, 60, 16, 'rgba(120,200,190,0.10)');
  }
  // grime
  const gg = ctx.createLinearGradient(0, H - 30, 0, H);
  gg.addColorStop(0, 'rgba(0,0,0,0)');
  gg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = gg;
  ctx.fillRect(0, H - 30, W, 30);
}

function drawDesk(ctx, open, W = 64, H = 48) {
  ell(ctx, W / 2, H - 2, 26, 3.5, 'rgba(0,0,0,0.45)');
  // legs
  ctx.fillStyle = '#2b2a26';
  ctx.fillRect(8, 26, 4, 20);
  ctx.fillRect(W - 12, 26, 4, 20);
  // drawer body
  const g = ctx.createLinearGradient(0, 14, 0, 40);
  g.addColorStop(0, '#5a4a36');
  g.addColorStop(1, '#33281c');
  ctx.fillStyle = g;
  ctx.fillRect(9, 14, W - 18, 24);
  // top
  ctx.fillStyle = '#6d5940';
  ctx.beginPath();
  ctx.moveTo(5, 14);
  ctx.lineTo(W - 5, 14);
  ctx.lineTo(W - 9, 8);
  ctx.lineTo(9, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,240,210,0.10)';
  ctx.fillRect(9, 8, W - 18, 2);
  if (open) {
    const dy = 40;
    ctx.fillStyle = '#211a13';
    ctx.fillRect(16, 22, W - 32, 10);
    ctx.fillStyle = '#4a3c2c';
    ctx.fillRect(14, dy - 12, W - 28, 12);
    ctx.fillStyle = '#6a5a44';
    ctx.fillRect(14, dy - 12, W - 28, 2);
    ctx.fillStyle = '#b9b19a';
    ctx.fillRect(W / 2 - 5, dy - 6, 10, 2);
    glow(ctx, W / 2, dy - 16, 14, 'rgba(220,190,130,0.20)');
  } else {
    ctx.fillStyle = '#3a2e22';
    ctx.fillRect(12, 18, W - 24, 14);
    ctx.fillStyle = '#b9b19a';
    ctx.fillRect(W / 2 - 6, 24, 12, 2.2);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(12, 31, W - 24, 1.5);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(9, 14, W - 18, 1.5);
}

function drawCoin(ctx, f) {
  const W = 16;
  const H = 16;
  const squeeze = Math.abs(Math.cos((f / 4) * Math.PI));
  ell(ctx, W / 2, H / 2 + 5, 4 + squeeze * 1.5, 1.6, 'rgba(0,0,0,0.35)');
  const rx = 1 + squeeze * 5;
  ell(ctx, W / 2, H / 2, rx, 6.4, '#8a6a2c');
  ell(ctx, W / 2, H / 2, rx * 0.82, 5.4, '#d8b06a');
  if (squeeze > 0.4) {
    ell(ctx, W / 2 - rx * 0.2, H / 2 - 1.6, rx * 0.3, 3, 'rgba(255,240,200,0.55)');
  }
  glow(ctx, W / 2, H / 2, 7, 'rgba(240,200,110,0.35)');
}

function drawKey(ctx, card) {
  const W = 20;
  const H = 14;
  ctx.clearRect(0, 0, W, H);
  if (card) {
    ctx.fillStyle = '#8fa2a8';
    ctx.fillRect(3, 3, 14, 8);
    ctx.fillStyle = '#c8d6da';
    ctx.fillRect(3, 3, 14, 2);
    ctx.fillStyle = '#333c40';
    ctx.fillRect(5, 6.5, 5, 1.4);
  } else {
    ctx.fillStyle = '#c9a75a';
    ctx.beginPath();
    ctx.arc(5, 7, 3.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#1a1a18';
    ctx.beginPath();
    ctx.arc(5, 7, 1.4, 0, 7);
    ctx.fill();
    ctx.fillStyle = '#c9a75a';
    ctx.fillRect(7, 6, 10, 2);
    ctx.fillRect(13, 8, 2, 3);
    ctx.fillRect(16, 8, 2, 2);
  }
  glow(ctx, W / 2, H / 2, 9, 'rgba(230,200,130,0.25)');
}

export const OBJECT_SPECS = {
  cabinet: { w: 0.56, h: 1.0, solid: 0.36, interact: 'Hide inside', hides: true },
  chest: { w: 0.46, h: 0.40, solid: 0.32, interact: 'Search footlocker' },
  desk: { w: 0.60, h: 0.42, solid: 0.34, interact: 'Search drawer' },
  coin: { w: 0.16, h: 0.16, solid: 0, interact: '' },
  key: { w: 0.2, h: 0.14, solid: 0, interact: 'Take key' },
  card: { w: 0.22, h: 0.14, solid: 0, interact: 'Take card' },
};

/* ------------------------------- creatures ------------------------------- */

const CPAL = {
  rusher: { skin: '#3c3d33', dark: '#22231d', light: '#5b5c4c', glow: '#d9603a' },
  mime: { skin: '#d3ccbe', dark: '#8f8980', light: '#f1ece2', glow: '#14150f' },
  vigil: { skin: '#918e86', dark: '#5f5e59', light: '#c0beb3', glow: '#8ad8d0' },
  crawler: { skin: '#4a3f36', dark: '#2a221e', light: '#6e5b4d', glow: '#c8552f' },
  hollow: { skin: '#20232a', dark: '#0c0e11', light: '#3c434b', glow: '#a9d6e8' },
  chorus: { skin: '#5f4a4a', dark: '#332526', light: '#8d706e', glow: '#e0a06a' },
  warden: { skin: '#4b4339', dark: '#28231c', light: '#7e6f59', glow: '#e07a2a' },
  mother: { skin: '#6c5b58', dark: '#392f2e', light: '#a38d88', glow: '#ecd2a8' },
};

function drawRusher(ctx, W, H, ph, pal) {
  const s = Math.sin(ph * Math.PI * 2);
  const bob = Math.abs(Math.sin(ph * Math.PI * 2)) * H * 0.015;
  const bx = W * 0.5;
  const by = H * 0.5 + bob;
  const bw = W * 0.36;
  const bh = H * 0.17;
  // far legs
  limb(ctx, bx - bw * 0.5, by + bh * 0.6, bx - bw * 0.7, by + H * 0.3, bx - bw * 0.85 + s * 10, H * 0.94, W * 0.055, pal.dark);
  limb(ctx, bx + bw * 0.5, by + bh * 0.6, bx + bw * 0.72, by + H * 0.28, bx + bw * 0.86 - s * 10, H * 0.94, W * 0.055, pal.dark);
  // body
  ell(ctx, bx, by, bw, bh, pal.skin);
  ell(ctx, bx, by - bh * 0.35, bw * 0.92, bh * 0.6, pal.light + '33');
  // spine spikes
  for (let i = -2; i <= 2; i++) {
    const x = bx + i * bw * 0.34;
    const y = by - bh * 0.85;
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(x - W * 0.02, y + H * 0.02);
    ctx.lineTo(x, y - H * 0.05);
    ctx.lineTo(x + W * 0.02, y + H * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  // near legs
  limb(ctx, bx - bw * 0.42, by + bh * 0.5, bx - bw * 0.6, by + H * 0.3, bx - bw * 0.72 - s * 12, H * 0.97, W * 0.075, pal.skin);
  limb(ctx, bx + bw * 0.42, by + bh * 0.5, bx + bw * 0.62, by + H * 0.3, bx + bw * 0.74 + s * 12, H * 0.97, W * 0.075, pal.skin);
  // neck + head
  const hx = bx + W * 0.02;
  const hy = by + H * 0.21;
  ctx.strokeStyle = pal.skin;
  ctx.lineWidth = W * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(bx, by + bh * 0.4);
  ctx.lineTo(hx, hy - H * 0.02);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx - W * 0.09, hy - H * 0.03);
  ctx.lineTo(hx + W * 0.09, hy - H * 0.03);
  ctx.lineTo(hx + W * 0.06, hy + H * 0.06);
  ctx.lineTo(hx - W * 0.06, hy + H * 0.06);
  ctx.closePath();
  ctx.fillStyle = pal.light;
  ctx.fill();
  // jaw seam
  const open = 0.5 + 0.5 * Math.sin(ph * Math.PI * 4);
  ctx.fillStyle = pal.dark;
  ctx.beginPath();
  ctx.moveTo(hx - W * 0.07, hy + H * 0.02);
  ctx.lineTo(hx + W * 0.07, hy + H * 0.02);
  ctx.lineTo(hx + W * 0.05, hy + H * 0.045 + open * H * 0.03);
  ctx.lineTo(hx - W * 0.05, hy + H * 0.045 + open * H * 0.03);
  ctx.closePath();
  ctx.fill();
  glow(ctx, hx, hy + H * 0.03, W * 0.16, 'rgba(217,96,58,0.55)', 0.3 + open * 0.5);
  // teeth
  ctx.fillStyle = 'rgba(230,220,200,0.75)';
  for (let i = -2; i <= 2; i++) ctx.fillRect(hx + i * W * 0.028, hy + H * 0.021, W * 0.012, H * 0.012);
}

function drawMime(ctx, W, H, ph, pal) {
  const s = Math.sin(ph * Math.PI * 2);
  const bob = Math.sin(ph * Math.PI * 4) * H * 0.008;
  const cx = W * 0.5;
  const top = H * 0.2 + bob;
  // legs
  limb(ctx, cx - W * 0.06, H * 0.68, cx - W * 0.1, H * 0.82, cx - W * 0.09 - s * 4, H * 0.98, W * 0.05, pal.dark);
  limb(ctx, cx + W * 0.06, H * 0.68, cx + W * 0.1, H * 0.82, cx + W * 0.09 + s * 4, H * 0.98, W * 0.05, pal.dark);
  // torso
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.1, top + H * 0.1);
  ctx.lineTo(cx + W * 0.1, top + H * 0.1);
  ctx.lineTo(cx + W * 0.08, H * 0.7);
  ctx.lineTo(cx - W * 0.08, H * 0.7);
  ctx.closePath();
  ctx.fill();
  // six arms
  const arms = [
    [0.14, 0.34, 0.16],
    [0.16, 0.44, 0.28],
    [0.18, 0.54, 0.4],
  ];
  arms.forEach((a, i) => {
    const yy = top + H * a[0];
    const sw = Math.sin(ph * Math.PI * 2 + i * 1.1) * 6;
    limb(ctx, cx - W * 0.09, yy, cx - W * a[1], yy + H * 0.06 + sw, cx - W * 0.2, yy + H * a[2] * 0.4 + sw * 1.4, W * 0.022, pal.dark);
    limb(ctx, cx + W * 0.09, yy, cx + W * a[1], yy + H * 0.06 - sw, cx + W * 0.2, yy + H * a[2] * 0.4 - sw * 1.4, W * 0.022, pal.dark);
    ell(ctx, cx - W * 0.2, yy + H * a[2] * 0.4 + sw * 1.4, W * 0.018, W * 0.022, pal.skin);
    ell(ctx, cx + W * 0.2, yy + H * a[2] * 0.4 - sw * 1.4, W * 0.018, W * 0.022, pal.skin);
  });
  // head
  ell(ctx, cx, top, W * 0.115, H * 0.095, pal.light);
  ell(ctx, cx, top + H * 0.012, W * 0.105, H * 0.08, pal.skin);
  // painted face
  ctx.strokeStyle = pal.glow;
  ctx.lineWidth = W * 0.014;
  ctx.beginPath();
  ctx.arc(cx, top - H * 0.008, W * 0.06, 0.35, Math.PI - 0.35);
  ctx.stroke();
  ctx.fillStyle = pal.glow;
  ell(ctx, cx - W * 0.04, top - H * 0.02, W * 0.014, H * 0.008, pal.glow);
  ell(ctx, cx + W * 0.04, top - H * 0.02, W * 0.014, H * 0.008, pal.glow);
  // cheek tears
  ctx.strokeStyle = 'rgba(40,40,36,0.5)';
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.05, top + H * 0.02);
  ctx.lineTo(cx - W * 0.055, top + H * 0.06);
  ctx.moveTo(cx + W * 0.05, top + H * 0.02);
  ctx.lineTo(cx + W * 0.055, top + H * 0.06);
  ctx.stroke();
}

function drawVigil(ctx, W, H, ph, pal, still) {
  const bob = still ? 0 : Math.sin(ph * Math.PI * 2) * H * 0.006;
  const cx = W * 0.5;
  const shoulder = H * 0.26 + bob;
  // robe
  const g = ctx.createLinearGradient(cx - W * 0.2, 0, cx + W * 0.2, 0);
  g.addColorStop(0, pal.dark);
  g.addColorStop(0.4, pal.skin);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.14, shoulder);
  ctx.lineTo(cx + W * 0.14, shoulder);
  ctx.lineTo(cx + W * 0.26, H * 0.99);
  ctx.lineTo(cx - W * 0.26, H * 0.99);
  ctx.closePath();
  ctx.fill();
  // folds
  ctx.strokeStyle = 'rgba(0,0,0,0.32)';
  ctx.lineWidth = 1.4;
  for (let i = -3; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * W * 0.045, shoulder + H * 0.03);
    ctx.lineTo(cx + i * W * 0.075, H * 0.98);
    ctx.stroke();
  }
  // hood
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.ellipse(cx, shoulder, W * 0.115, H * 0.14, 0, Math.PI, Math.PI * 2);
  ctx.lineTo(cx + W * 0.115, shoulder + H * 0.02);
  ctx.lineTo(cx - W * 0.115, shoulder + H * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0d0e0c';
  ell(ctx, cx, shoulder + H * 0.005, W * 0.082, H * 0.1, '#0d0e0c');
  glow(ctx, cx - W * 0.03, shoulder - H * 0.005, W * 0.05, 'rgba(138,216,208,0.35)');
  glow(ctx, cx + W * 0.03, shoulder - H * 0.005, W * 0.05, 'rgba(138,216,208,0.35)');
  // hands
  if (still) {
    ell(ctx, cx - W * 0.035, shoulder + H * 0.01, W * 0.045, H * 0.055, pal.light);
    ell(ctx, cx + W * 0.035, shoulder + H * 0.01, W * 0.045, H * 0.055, pal.light);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * W * 0.017, shoulder - H * 0.03);
      ctx.lineTo(cx + i * W * 0.019, shoulder + H * 0.05);
      ctx.stroke();
    }
  } else {
    // arms extended toward viewer
    limb(ctx, cx - W * 0.12, shoulder + H * 0.05, cx - W * 0.2, shoulder + H * 0.18, cx - W * 0.16, shoulder + H * 0.3, W * 0.05, pal.skin);
    limb(ctx, cx + W * 0.12, shoulder + H * 0.05, cx + W * 0.2, shoulder + H * 0.18, cx + W * 0.16, shoulder + H * 0.3, W * 0.05, pal.skin);
    ell(ctx, cx - W * 0.16, shoulder + H * 0.31, W * 0.04, H * 0.045, pal.light);
    ell(ctx, cx + W * 0.16, shoulder + H * 0.31, W * 0.04, H * 0.045, pal.light);
  }
  // stone cracks
  ctx.strokeStyle = 'rgba(20,20,18,0.35)';
  ctx.lineWidth = 1;
  const rng = mulberry32(9);
  for (let i = 0; i < 7; i++) {
    let x = cx + (rng() - 0.5) * W * 0.3;
    let y = shoulder + rng() * H * 0.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let j = 0; j < 4; j++) {
      x += (rng() - 0.5) * W * 0.05;
      y += H * 0.03;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function drawCrawler(ctx, W, H, ph, pal) {
  const s = Math.sin(ph * Math.PI * 2);
  const cx = W * 0.5;
  const by = H * 0.4;
  // legs reaching up to the ceiling
  for (let i = 0; i < 4; i++) {
    const off = (i - 1.5) * W * 0.075;
    const sw = Math.sin(ph * Math.PI * 2 + i) * 5;
    limb(ctx, cx + off, by - H * 0.02, cx + off * 1.9 + sw, H * 0.12, cx + off * 2.4, H * 0.01, W * 0.022, pal.dark);
    limb(ctx, cx - off, by - H * 0.02, cx - off * 1.9 - sw, H * 0.12, cx - off * 2.4, H * 0.01, W * 0.022, pal.dark);
  }
  // flat body
  ell(ctx, cx, by, W * 0.28, H * 0.12, pal.skin);
  ell(ctx, cx, by - H * 0.03, W * 0.24, H * 0.07, pal.light + '55');
  // segments
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.lineWidth = 1.2;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(cx + i * W * 0.06, by, W * 0.05, H * 0.11, 0, 0, Math.PI);
    ctx.stroke();
  }
  // head hanging below
  const hy = by + H * 0.16;
  ell(ctx, cx, hy, W * 0.085, H * 0.06, pal.light);
  glow(ctx, cx - W * 0.035, hy - H * 0.01, W * 0.05, 'rgba(200,85,47,0.4)');
  glow(ctx, cx + W * 0.035, hy - H * 0.01, W * 0.05, 'rgba(200,85,47,0.4)');
  // mandibles
  ctx.strokeStyle = pal.dark;
  ctx.lineWidth = W * 0.016;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.05, hy);
  ctx.lineTo(cx - W * 0.1 - s * 4, hy + H * 0.08);
  ctx.moveTo(cx + W * 0.05, hy);
  ctx.lineTo(cx + W * 0.1 + s * 4, hy + H * 0.08);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ell(ctx, cx, hy + H * 0.03, W * 0.03, H * 0.02, 'rgba(0,0,0,0.5)');
}

function drawHollow(ctx, W, H, ph, pal) {
  const cx = W * 0.5;
  const sway = Math.sin(ph * Math.PI * 2) * W * 0.02;
  const g = ctx.createLinearGradient(0, H * 0.2, 0, H);
  g.addColorStop(0, pal.light);
  g.addColorStop(0.35, pal.skin);
  g.addColorStop(1, 'rgba(8,9,11,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.1, H * 0.22);
  ctx.quadraticCurveTo(cx - W * 0.22 + sway, H * 0.6, cx - W * 0.3 + sway, H * 1.02);
  ctx.lineTo(cx + W * 0.3 + sway, H * 1.02);
  ctx.quadraticCurveTo(cx + W * 0.22 + sway, H * 0.6, cx + W * 0.1, H * 0.22);
  ctx.closePath();
  ctx.fill();
  // hood
  ell(ctx, cx, H * 0.2, W * 0.12, H * 0.1, pal.skin);
  ctx.fillStyle = '#05060a';
  ell(ctx, cx, H * 0.21, W * 0.095, H * 0.08, '#05060a');
  // single eye
  const ey = H * 0.215;
  const eh = H * 0.05;
  ctx.fillStyle = pal.glow;
  ctx.beginPath();
  ctx.ellipse(cx, ey, W * 0.012, eh, 0, 0, 7);
  ctx.fill();
  glow(ctx, cx, ey, W * 0.16, 'rgba(169,214,232,0.6)', 0.9);
  // wisps
  ctx.strokeStyle = 'rgba(120,140,150,0.16)';
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) {
    const x = cx - W * 0.22 + i * W * 0.09;
    ctx.beginPath();
    ctx.moveTo(x, H * 0.4);
    ctx.bezierCurveTo(x + sway * 2, H * 0.6, x - sway * 2, H * 0.8, x + sway, H * 1.0);
    ctx.stroke();
  }
}

function drawChorus(ctx, W, H, ph, pal) {
  const cx = W * 0.5;
  const s = Math.sin(ph * Math.PI * 2);
  // neck
  ctx.strokeStyle = pal.skin;
  ctx.lineWidth = W * 0.05;
  ctx.beginPath();
  ctx.moveTo(cx, H * 0.42);
  ctx.quadraticCurveTo(cx + s * 5, H * 0.26, cx + s * 3, H * 0.1);
  ctx.stroke();
  // torso
  ctx.fillStyle = pal.skin;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.16, H * 0.4);
  ctx.quadraticCurveTo(cx, H * 0.34, cx + W * 0.16, H * 0.4);
  ctx.lineTo(cx + W * 0.12, H * 0.78);
  ctx.quadraticCurveTo(cx, H * 0.84, cx - W * 0.12, H * 0.78);
  ctx.closePath();
  ctx.fill();
  // ribs
  ctx.strokeStyle = pal.light;
  ctx.lineWidth = W * 0.012;
  for (let i = 0; i < 5; i++) {
    const y = H * 0.44 + i * H * 0.07;
    ctx.beginPath();
    ctx.moveTo(cx - W * 0.14, y);
    ctx.quadraticCurveTo(cx, y - H * 0.02, cx + W * 0.14, y);
    ctx.stroke();
  }
  // mouths
  const mouths = [
    [-0.05, 0.47, 0.032],
    [0.06, 0.53, 0.028],
    [-0.02, 0.58, 0.024],
    [0.05, 0.64, 0.03],
    [-0.07, 0.67, 0.02],
    [0.0, 0.44, 0.026],
  ];
  mouths.forEach((m, i) => {
    const open = 0.4 + 0.6 * Math.abs(Math.sin(ph * Math.PI * 2 + i));
    const x = cx + m[0] * W;
    const y = H * m[1];
    ell(ctx, x, y, W * m[2], H * 0.016 * open, '#1a0f0f');
    ctx.fillStyle = 'rgba(220,200,190,0.6)';
    ctx.fillRect(x - W * m[2] * 0.7, y - H * 0.006 * open, W * m[2] * 1.4, 1);
  });
  // arms
  const swing = s * 8;
  limb(ctx, cx - W * 0.15, H * 0.44, cx - W * 0.26, H * 0.6 + swing, cx - W * 0.34, H * 0.74 + swing, W * 0.038, pal.dark);
  limb(ctx, cx + W * 0.15, H * 0.44, cx + W * 0.26, H * 0.6 - swing, cx + W * 0.34, H * 0.74 - swing, W * 0.038, pal.dark);
  // legs
  limb(ctx, cx - W * 0.07, H * 0.8, cx - W * 0.1, H * 0.9, cx - W * 0.09, H * 0.99, W * 0.045, pal.dark);
  limb(ctx, cx + W * 0.07, H * 0.8, cx + W * 0.1, H * 0.9, cx + W * 0.09, H * 0.99, W * 0.045, pal.dark);
  glow(ctx, cx, H * 0.3, W * 0.12, 'rgba(224,160,106,0.25)');
}

function drawWarden(ctx, W, H, ph, pal) {
  const s = Math.sin(ph * Math.PI * 2);
  const cx = W * 0.5;
  // legs
  limb(ctx, cx - W * 0.14, H * 0.62, cx - W * 0.17, H * 0.8, cx - W * 0.16, H * 0.99, W * 0.1, pal.dark);
  limb(ctx, cx + W * 0.14, H * 0.62, cx + W * 0.17, H * 0.8, cx + W * 0.16, H * 0.99, W * 0.1, pal.dark);
  // torso
  const g = ctx.createLinearGradient(cx - W * 0.3, 0, cx + W * 0.3, 0);
  g.addColorStop(0, pal.dark);
  g.addColorStop(0.45, pal.skin);
  g.addColorStop(1, pal.dark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.3, H * 0.3);
  ctx.lineTo(cx + W * 0.3, H * 0.3);
  ctx.lineTo(cx + W * 0.2, H * 0.68);
  ctx.lineTo(cx - W * 0.2, H * 0.68);
  ctx.closePath();
  ctx.fill();
  // shoulders
  ell(ctx, cx - W * 0.24, H * 0.31, W * 0.12, H * 0.05, pal.light);
  ell(ctx, cx + W * 0.24, H * 0.31, W * 0.12, H * 0.05, pal.light);
  // four arms
  for (let i = 0; i < 2; i++) {
    const sw = Math.sin(ph * Math.PI * 2 + i * 1.6) * 10;
    const y0 = H * (0.36 + i * 0.11);
    limb(ctx, cx - W * 0.26, y0, cx - W * 0.42, y0 + H * 0.1 - sw, cx - W * 0.38, y0 + H * 0.26 - sw, W * 0.07, pal.skin);
    limb(ctx, cx + W * 0.26, y0, cx + W * 0.42, y0 + H * 0.1 + sw, cx + W * 0.38, y0 + H * 0.26 + sw, W * 0.07, pal.skin);
    ctx.fillStyle = pal.light;
    for (let f = -1; f <= 1; f++) {
      ctx.beginPath();
      ctx.arc(cx - W * 0.38 + f * W * 0.03, y0 + H * 0.28 - sw, W * 0.016, 0, 7);
      ctx.arc(cx + W * 0.38 + f * W * 0.03, y0 + H * 0.28 + sw, W * 0.016, 0, 7);
      ctx.fill();
    }
  }
  // head
  const hy = H * 0.2;
  ell(ctx, cx, hy, W * 0.1, H * 0.06, pal.light);
  // crown spikes
  ctx.fillStyle = '#6d6a60';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(cx + i * W * 0.05 - W * 0.014, hy - H * 0.05);
    ctx.lineTo(cx + i * W * 0.05, hy - H * 0.12 - Math.abs(i) * H * -0.01);
    ctx.lineTo(cx + i * W * 0.05 + W * 0.014, hy - H * 0.05);
    ctx.closePath();
    ctx.fill();
  }
  // glowing jaw
  const open = 0.5 + 0.5 * Math.sin(ph * Math.PI * 3);
  ctx.fillStyle = '#120c08';
  ell(ctx, cx, hy + H * 0.03, W * 0.06, H * 0.02 + open * H * 0.02, '#120c08');
  glow(ctx, cx, hy + H * 0.03, W * 0.14, 'rgba(224,122,42,0.6)', 0.4 + open * 0.5);
  // chains
  ctx.strokeStyle = 'rgba(150,150,140,0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - W * 0.3, H * 0.3);
  ctx.quadraticCurveTo(cx - W * 0.34, H * 0.6, cx - W * 0.28 + s * 3, H * 0.9);
  ctx.stroke();
}

function drawMother(ctx, W, H, ph, pal) {
  const s = Math.sin(ph * Math.PI * 2);
  const cx = W * 0.5;
  const cy = H * 0.62;
  // tendril hair
  ctx.strokeStyle = 'rgba(40,34,32,0.9)';
  ctx.lineWidth = W * 0.016;
  for (let i = 0; i < 14; i++) {
    const t = (i / 13 - 0.5) * 2;
    const x0 = cx + t * W * 0.16;
    ctx.beginPath();
    ctx.moveTo(x0, cy - H * 0.12);
    ctx.bezierCurveTo(
      x0 + t * W * 0.2 + s * 6,
      cy + H * 0.05,
      x0 + t * W * 0.35 - s * 6,
      cy + H * 0.2,
      x0 + t * W * 0.5,
      H * 1.02
    );
    ctx.stroke();
  }
  // limbs radiating
  for (let i = 0; i < 3; i++) {
    const sw = Math.sin(ph * Math.PI * 2 + i) * 8;
    limb(ctx, cx - W * 0.2, cy - H * 0.02, cx - W * 0.42, cy + H * 0.06 + sw, cx - W * 0.5, cy + H * 0.22 + sw, W * 0.05, pal.dark);
    limb(ctx, cx + W * 0.2, cy - H * 0.02, cx + W * 0.42, cy + H * 0.06 - sw, cx + W * 0.5, cy + H * 0.22 - sw, W * 0.05, pal.dark);
  }
  // mass
  ell(ctx, cx, cy, W * 0.28, H * 0.24, pal.skin);
  ell(ctx, cx, cy - H * 0.04, W * 0.22, H * 0.16, pal.light + '44');
  // porcelain face
  ell(ctx, cx, cy - H * 0.05, W * 0.13, H * 0.13, '#e6dfd2');
  ell(ctx, cx, cy - H * 0.02, W * 0.115, H * 0.1, '#efe8db');
  // face features
  ctx.fillStyle = '#2a2420';
  ell(ctx, cx - W * 0.045, cy - H * 0.07, W * 0.022, H * 0.018, '#2a2420');
  ell(ctx, cx + W * 0.045, cy - H * 0.07, W * 0.022, H * 0.018, '#2a2420');
  ctx.strokeStyle = '#8a5a4a';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.arc(cx, cy - H * 0.005, W * 0.04, 0.3, Math.PI - 0.3);
  ctx.stroke();
  // cracks in porcelain
  ctx.strokeStyle = 'rgba(60,50,44,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx + W * 0.02, cy - H * 0.12);
  ctx.lineTo(cx + W * 0.05, cy - H * 0.06);
  ctx.lineTo(cx + W * 0.03, cy + H * 0.0);
  ctx.stroke();
  glow(ctx, cx, cy - H * 0.05, W * 0.3, 'rgba(236,210,168,0.18)');
}

const DRAWERS = {
  rusher: drawRusher,
  mime: drawMime,
  vigil: drawVigil,
  crawler: drawCrawler,
  hollow: drawHollow,
  chorus: drawChorus,
  warden: drawWarden,
  mother: drawMother,
};

export function drawCreature(ctx, id, phase, W, H, opts = {}) {
  const pal = CPAL[id] || CPAL.rusher;
  const fn = DRAWERS[id] || drawRusher;
  ctx.save();
  fn(ctx, W, H, phase, pal, opts.still);
  ctx.restore();
}

export function buildSprites() {
  const objects = {
    chestClosed: sprite(56, 46, (c) => drawChest(c, false)),
    chestOpen: sprite(56, 46, (c) => drawChest(c, true)),
    cabinetClosed: sprite(48, 96, (c) => drawCabinet(c, false)),
    cabinetOpen: sprite(48, 96, (c) => drawCabinet(c, true)),
    deskClosed: sprite(64, 48, (c) => drawDesk(c, false)),
    deskOpen: sprite(64, 48, (c) => drawDesk(c, true)),
    coins: [0, 1, 2, 3].map((f) => sprite(16, 16, (c) => drawCoin(c, f))),
    key: sprite(20, 14, (c) => drawKey(c, false)),
    card: sprite(20, 14, (c) => drawKey(c, true)),
  };
  const creatures = {};
  ['rusher', 'mime', 'vigil', 'crawler', 'hollow', 'chorus', 'warden', 'mother'].forEach((id) => {
    const frames = [];
    for (let f = 0; f < 6; f++) {
      frames.push(sprite(128, 160, (c, w, h) => drawCreature(c, id, f / 6, w, h, { still: f === 0 && (id === 'vigil' || id === 'mime') })));
    }
    creatures[id] = frames;
  });
  return { objects, creatures };
}