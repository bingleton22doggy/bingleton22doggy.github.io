export function drawIcon(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#15140f');
  g.addColorStop(1, '#050505');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(176,106,60,0.55)';
  ctx.lineWidth = 2;
  ctx.strokeRect(6, 6, 46, h - 12);
  ctx.fillStyle = 'rgba(210,190,150,0.10)';
  ctx.fillRect(9, 9, 40, h - 18);
  ctx.fillStyle = '#c9a75a';
  ctx.beginPath();
  ctx.arc(41, h / 2, 2, 0, 7);
  ctx.fill();
  ctx.fillStyle = '#efeadd';
  ctx.font = 'bold 13px monospace';
  ctx.fillText('SHATTERED', 60, 34);
  ctx.fillText('MEMORIES', 60, 50);
  ctx.fillStyle = 'rgba(176,106,60,0.9)';
  ctx.fillRect(60, 58, 54, 1.5);
  ctx.fillStyle = 'rgba(160,154,141,0.8)';
  ctx.font = '7px monospace';
  ctx.fillText('PSP HOMEBREW', 60, 70);
}

export function drawPic(ctx, w, h) {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0a0a09');
  sky.addColorStop(0.55, '#17150f');
  sky.addColorStop(1, '#050505');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  const cx = w * 0.56;
  const cy = h * 0.52;
  for (let i = 8; i >= 1; i--) {
    const t = i / 8;
    const hw = 40 + t * w * 0.55;
    const hh = 22 + t * h * 0.6;
    ctx.strokeStyle = `rgba(150,142,120,${0.05 + (1 - t) * 0.12})`;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - hw, cy - hh, hw * 2, hh * 2);
  }
  ctx.fillStyle = 'rgba(90,86,74,0.20)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(cx - 40, cy - 22);
  ctx.lineTo(cx - 40, cy + 22);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(70,68,58,0.22)';
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(cx + 40, cy - 22);
  ctx.lineTo(cx + 40, cy + 22);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
  const dg = ctx.createLinearGradient(cx - 20, cy - 40, cx + 20, cy + 40);
  dg.addColorStop(0, 'rgba(226,178,100,0.32)');
  dg.addColorStop(1, 'rgba(120,80,40,0.05)');
  ctx.fillStyle = dg;
  ctx.fillRect(cx - 18, cy - 32, 36, 64);
  ctx.strokeStyle = 'rgba(160,200,210,0.22)';
  for (let i = 0; i < 40; i++) {
    const x = 20 + Math.random() * 90;
    const y = 20 + Math.random() * 120;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 1, y + 6);
    ctx.stroke();
  }
  ctx.fillStyle = '#f2eee3';
  ctx.font = '300 40px Georgia, serif';
  ctx.fillText('Shattered Memories', 34, h - 56);
  ctx.fillStyle = 'rgba(176,106,60,0.95)';
  ctx.font = '10px monospace';
  ctx.fillText('A PROCEDURAL HALLWAY NIGHTMARE', 36, h - 32);
  ctx.fillStyle = 'rgba(230,226,215,0.35)';
  ctx.font = '8px monospace';
  ctx.fillText('480 x 272 / 16:9', w - 110, h - 18);
}