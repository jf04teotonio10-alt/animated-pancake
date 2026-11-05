// Fully synthesized audio (WebAudio) — no external assets.
class AudioSys {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  muted = false;
  musicOn = true;
  last: Record<string, number> = {};
  musicTimer: number | null = null;
  step = 0;
  intense = false;

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.55; this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.22; this.musicGain.connect(this.master);
    } catch { this.ctx = null; }
  }

  setMuted(m: boolean) { this.muted = m; if (this.master) this.master.gain.value = m ? 0 : 0.5; }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, dest?: AudioNode) {
    const c = this.ctx; if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g); g.connect(dest ?? this.sfxGain!); o.start(); o.stop(c.currentTime + dur + 0.02);
  }

  private noise(dur: number, vol: number, hp = 400, dest?: AudioNode) {
    const c = this.ctx; if (!c) return;
    const len = Math.floor(c.sampleRate * dur);
    const buf = c.createBuffer(1, len, c.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = c.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(dest ?? this.sfxGain!); s.start();
  }

  play(name: string) {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    const gap = name === 'shoot' || name === 'hit' ? 45 : 70;
    if (this.last[name] && now - this.last[name] < gap) return;
    this.last[name] = now;
    switch (name) {
      case 'shoot': this.tone(880 + Math.random() * 200, 0.07, 'square', 0.05, 0.4); break;
      case 'laser': this.tone(1400, 0.15, 'sawtooth', 0.06, 0.15); break;
      case 'snipe': this.noise(0.18, 0.18, 1200); this.tone(200, 0.2, 'square', 0.08, 0.3); break;
      case 'zap': this.tone(300 + Math.random() * 600, 0.12, 'sawtooth', 0.05, 3); this.noise(0.08, 0.05, 3000); break;
      case 'slash': this.noise(0.08, 0.1, 2500); break;
      case 'boom': this.noise(0.45, 0.28, 60); this.tone(90, 0.4, 'sine', 0.25, 0.3); break;
      case 'flame': this.noise(0.1, 0.04, 800); break;
      case 'emp': this.tone(120, 0.35, 'sine', 0.2, 6); this.tone(60, 0.3, 'square', 0.06, 0.5); break;
      case 'freeze': this.tone(2400, 0.15, 'triangle', 0.05, 0.6); break;
      case 'hit': this.tone(160, 0.05, 'square', 0.03, 0.6); break;
      case 'kill': this.tone(520, 0.06, 'square', 0.04, 0.5); break;
      case 'place': this.tone(330, 0.08, 'square', 0.1); setTimeout(() => this.tone(660, 0.1, 'square', 0.1), 70); break;
      case 'upgrade': [440, 554, 659, 880].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'square', 0.08), i * 60)); break;
      case 'sell': this.tone(660, 0.08, 'triangle', 0.1, 0.5); break;
      case 'leak': this.tone(110, 0.3, 'sawtooth', 0.15, 0.5); break;
      case 'wave': [262, 330, 392].forEach((f, i) => setTimeout(() => this.tone(f, 0.18, 'sawtooth', 0.07), i * 90)); break;
      case 'boss': this.tone(55, 1.6, 'sawtooth', 0.25, 0.8); this.tone(58, 1.6, 'square', 0.12, 0.8); this.noise(1.2, 0.08, 100); break;
      case 'error': this.tone(140, 0.12, 'square', 0.08); break;
      case 'click': this.tone(1200, 0.03, 'square', 0.04); break;
      case 'win': [523, 659, 784, 1046, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.25, 'square', 0.09), i * 120)); break;
      case 'lose': [392, 330, 262, 196].forEach((f, i) => setTimeout(() => this.tone(f, 0.4, 'sawtooth', 0.1), i * 200)); break;
      case 'teleport': this.tone(200, 0.25, 'sine', 0.12, 8); break;
      case 'coin': this.tone(1320, 0.06, 'square', 0.05); setTimeout(() => this.tone(1760, 0.08, 'square', 0.05), 50); break;
    }
  }

  // ---- procedural synthwave loop
  startMusic() {
    if (!this.ctx || this.musicTimer !== null) return;
    const bassA = [55, 55, 65.4, 55, 49, 49, 58.3, 49];
    const arp = [220, 261.6, 329.6, 392, 329.6, 261.6];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || this.muted || !this.musicOn) { this.step++; return; }
      const s = this.step++;
      const bar = Math.floor(s / 8) % 8;
      const mg = this.musicGain!;
      if (s % 2 === 0) this.tone(bassA[bar] * (s % 4 === 0 ? 1 : 2), 0.22, 'sawtooth', 0.18, 1, mg);
      if (s % 4 === 0) { this.tone(60, 0.18, 'sine', 0.5, 0.4, mg); }
      if (s % 4 === 2) this.noise(0.04, this.intense ? 0.12 : 0.06, 6000, mg);
      if (this.intense && s % 8 === 4) this.noise(0.15, 0.12, 1500, mg);
      if (s % 3 === 0) this.tone(arp[(s / 3) % arp.length | 0] * (bar % 2 ? 1.5 : 1) * 2, 0.12, 'square', 0.035, 1, mg);
    }, 125);
  }
  stopMusic() { if (this.musicTimer !== null) { clearInterval(this.musicTimer); this.musicTimer = null; } }
}

export const audio = new AudioSys();
