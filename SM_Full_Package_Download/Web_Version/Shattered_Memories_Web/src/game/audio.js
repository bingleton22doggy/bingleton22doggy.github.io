export class Sound {
  constructor(volume = 0.7) {
    this.volume = volume;
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.droneNodes = null;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2;
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
    } catch (e) {
      this.ctx = null;
    }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  get ok() {
    return !!this.ctx;
  }

  now() {
    return this.ctx.currentTime;
  }

  tone(freq, dur, type = 'sine', gain = 0.2, slideTo = null, delay = 0) {
    if (!this.ok) return;
    const t = this.now() + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.05, dur * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  noise(dur, gain = 0.2, freq = 900, q = 1, delay = 0, type = 'bandpass', sweepTo = null) {
    if (!this.ok || !this.noiseBuf) return;
    const t = this.now() + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.Q.value = q;
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.04, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  ui() {
    this.tone(320, 0.07, 'square', 0.035, 220);
  }

  step(running) {
    this.noise(running ? 0.14 : 0.11, running ? 0.16 : 0.09, running ? 320 : 240, 0.9, 0, 'lowpass');
    this.tone(running ? 78 : 62, 0.09, 'sine', running ? 0.09 : 0.05);
  }

  pickup() {
    this.tone(660, 0.06, 'triangle', 0.09);
    this.tone(990, 0.09, 'triangle', 0.06, null, 0.05);
  }

  coin() {
    this.tone(1180, 0.05, 'sine', 0.07);
    this.tone(1560, 0.08, 'sine', 0.05, null, 0.04);
  }

  drawer() {
    this.noise(0.32, 0.1, 520, 1.4, 0, 'bandpass', 240);
  }

  cabinet() {
    this.noise(0.4, 0.13, 300, 2.2, 0, 'bandpass', 900);
    this.tone(140, 0.3, 'sawtooth', 0.04, 90);
  }

  door() {
    this.noise(0.9, 0.16, 180, 1.2, 0, 'lowpass', 700);
    this.tone(70, 0.8, 'sine', 0.1, 48);
  }

  locked() {
    this.tone(180, 0.1, 'square', 0.08, 120);
    this.tone(120, 0.16, 'square', 0.07, 90, 0.1);
  }

  hurt() {
    this.noise(0.3, 0.2, 400, 0.8);
    this.tone(90, 0.4, 'sawtooth', 0.12, 40);
  }

  screech() {
    this.tone(1400, 0.9, 'sawtooth', 0.22, 90);
    this.noise(1.1, 0.28, 2600, 0.7, 0, 'bandpass', 300);
    this.tone(70, 1.4, 'sine', 0.3, 34);
  }

  stinger() {
    this.tone(180, 0.9, 'sawtooth', 0.1, 60);
    this.noise(0.8, 0.14, 700, 0.8, 0, 'lowpass', 200);
  }

  warn(kind) {
    const k = kind || 'flicker';
    if (k === 'flicker') {
      this.noise(0.12, 0.12, 2400, 1.6);
      this.tone(140, 0.16, 'sawtooth', 0.05, 60);
    } else if (k === 'shake' || k === 'rumble') {
      this.tone(42, 0.9, 'sine', 0.24, 32);
      this.noise(0.8, 0.16, 120, 0.9, 0, 'lowpass');
    } else if (k === 'dust') {
      this.noise(0.7, 0.1, 1800, 0.8, 0, 'highpass', 600);
    } else if (k === 'whisper') {
      this.noise(1.6, 0.07, 1500, 4.5);
      this.tone(210, 1.5, 'sine', 0.02, 180);
    } else if (k === 'silence') {
      this.tone(60, 0.5, 'sine', 0.1, 50);
    } else if (k === 'chime') {
      this.tone(392, 0.9, 'sine', 0.07);
      this.tone(466, 0.9, 'sine', 0.06, null, 0.1);
      this.tone(587, 1.1, 'sine', 0.05, null, 0.22);
    } else if (k === 'skitter') {
      for (let i = 0; i < 8; i++) this.noise(0.05, 0.07, 3200, 2, i * 0.07, 'bandpass');
    } else if (k === 'creak') {
      this.noise(0.7, 0.09, 380, 5, 0, 'bandpass', 240);
    } else if (k === 'stone') {
      this.noise(0.5, 0.12, 220, 1.6, 0, 'lowpass', 140);
    } else if (k === 'warden') {
      this.tone(34, 1.4, 'sine', 0.28, 26);
      this.noise(1.2, 0.14, 90, 1, 0, 'lowpass');
    } else if (k === 'mother') {
      this.tone(294, 1.6, 'sine', 0.05, 262);
      this.tone(349, 1.6, 'sine', 0.04, 330, 0.2);
    }
  }

  startDrone() {
    if (!this.ok || this.droneNodes) return;
    const t = this.now();
    const g = this.ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.exponentialRampToValueAtTime(0.055, t + 2.5);
    g.connect(this.master);
    const o1 = this.ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = 44;
    const o2 = this.ctx.createOscillator();
    o2.type = 'sawtooth';
    o2.frequency.value = 65.5;
    const lpf = this.ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 240;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain);
    lfoGain.connect(lpf.frequency);
    o1.connect(lpf);
    o2.connect(lpf);
    lpf.connect(g);
    o1.start(t);
    o2.start(t);
    lfo.start(t);
    this.droneNodes = { o1, o2, lfo, g };
  }

  stopDrone() {
    if (!this.droneNodes) return;
    const { o1, o2, lfo, g } = this.droneNodes;
    const t = this.now();
    try {
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o1.stop(t + 0.7);
      o2.stop(t + 0.7);
      lfo.stop(t + 0.7);
    } catch (e) {
      /* already stopped */
    }
    this.droneNodes = null;
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend();
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }
}