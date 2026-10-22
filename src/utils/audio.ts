// Web Audio API Retro & Arcade Sound Synthesizer + Crowd Ambience Engine
// Fully compatible with PC & Mobile (iOS / Android / Chrome / Safari / Firefox)

export type CrowdReactionType = 'hit' | 'crit' | 'knockdown' | 'victory' | 'defeat' | 'block' | 'dodge';

class AudioManager {
  private ctx: AudioContext | null = null;
  public masterEnabled: boolean = true;
  public sfxEnabled: boolean = true;
  public crowdEnabled: boolean = true;

  // Crowd Ambience Nodes
  private crowdSource: AudioBufferSourceNode | null = null;
  private crowdGainNode: GainNode | null = null;
  private crowdFilterNode: BiquadFilterNode | null = null;
  private isCrowdPlaying: boolean = false;

  // Cooldown tracking for crowd reactions to avoid noise spam
  private lastReactionTime: number = 0;
  private reactionCooldownMs: number = 650;

  constructor() {
    // Read persisted audio preferences
    if (typeof window !== 'undefined') {
      try {
        const savedMaster = localStorage.getItem('tecnoicymi_sound_enabled');
        if (savedMaster !== null) this.masterEnabled = savedMaster === 'true';

        const savedCrowd = localStorage.getItem('tecnoicymi_crowd_enabled');
        if (savedCrowd !== null) this.crowdEnabled = savedCrowd === 'true';

        const savedSfx = localStorage.getItem('tecnoicymi_sfx_enabled');
        if (savedSfx !== null) this.sfxEnabled = savedSfx === 'true';
      } catch {}
    }
  }

  // Ensure AudioContext is initialized and active upon user interaction
  public initCtx(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  // Master Sound Toggle
  public toggleMaster(): boolean {
    this.masterEnabled = !this.masterEnabled;
    try {
      localStorage.setItem('tecnoicymi_sound_enabled', this.masterEnabled.toString());
    } catch {}

    if (this.masterEnabled) {
      this.initCtx();
      this.playBell();
    } else {
      this.stopCrowdAmbience();
    }
    return this.masterEnabled;
  }

  // Crowd Ambience Toggle
  public toggleCrowd(): boolean {
    this.crowdEnabled = !this.crowdEnabled;
    try {
      localStorage.setItem('tecnoicymi_crowd_enabled', this.crowdEnabled.toString());
    } catch {}

    if (!this.crowdEnabled) {
      this.stopCrowdAmbience();
    }
    return this.crowdEnabled;
  }

  // SFX Toggle
  public toggleSfx(): boolean {
    this.sfxEnabled = !this.sfxEnabled;
    try {
      localStorage.setItem('tecnoicymi_sfx_enabled', this.sfxEnabled.toString());
    } catch {}
    if (this.sfxEnabled && this.masterEnabled) {
      this.playJab();
    }
    return this.sfxEnabled;
  }

  // ==========================================
  // 👥 CROWD AMBIENCE SYSTEM (Low-Level Murmur)
  // ==========================================

  // Starts smooth procedural crowd stadium murmur
  public startCrowdAmbience() {
    if (!this.masterEnabled || !this.crowdEnabled || this.isCrowdPlaying) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      // Create a 4-second looping buffer with filtered soft pink/brownian noise
      const bufferSize = ctx.sampleRate * 4;
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
          b6 = white * 0.115926;
        }
      }

      this.crowdSource = ctx.createBufferSource();
      this.crowdSource.buffer = buffer;
      this.crowdSource.loop = true;

      // Bandpass formant filter for human murmuring stadium acoustic
      this.crowdFilterNode = ctx.createBiquadFilter();
      this.crowdFilterNode.type = 'bandpass';
      this.crowdFilterNode.frequency.setValueAtTime(320, ctx.currentTime);
      this.crowdFilterNode.Q.setValueAtTime(1.2, ctx.currentTime);

      this.crowdGainNode = ctx.createGain();
      // Low ambient volume so it never masks punches or ring bell
      this.crowdGainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      this.crowdGainNode.gain.exponentialRampToValueAtTime(0.045, ctx.currentTime + 1.2);

      this.crowdSource.connect(this.crowdFilterNode);
      this.crowdFilterNode.connect(this.crowdGainNode);
      this.crowdGainNode.connect(ctx.destination);

      this.crowdSource.start();
      this.isCrowdPlaying = true;
    } catch {
      this.isCrowdPlaying = false;
    }
  }

  // Reduces ambient volume during round breaks or transitions
  public dimCrowdAmbience() {
    if (!this.crowdGainNode || !this.ctx) return;
    try {
      this.crowdGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.crowdGainNode.gain.linearRampToValueAtTime(0.015, this.ctx.currentTime + 0.5);
    } catch {}
  }

  // Restores normal fighting ambient volume
  public restoreCrowdAmbience() {
    if (!this.crowdGainNode || !this.ctx || !this.isCrowdPlaying) {
      this.startCrowdAmbience();
      return;
    }
    try {
      this.crowdGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
      this.crowdGainNode.gain.linearRampToValueAtTime(0.045, this.ctx.currentTime + 0.6);
    } catch {}
  }

  // Stops crowd ambience completely
  public stopCrowdAmbience() {
    if (!this.isCrowdPlaying) return;
    try {
      if (this.crowdGainNode && this.ctx) {
        this.crowdGainNode.gain.cancelScheduledValues(this.ctx.currentTime);
        this.crowdGainNode.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
      }
      setTimeout(() => {
        try {
          this.crowdSource?.stop();
          this.crowdSource?.disconnect();
          this.crowdSource = null;
          this.isCrowdPlaying = false;
        } catch {}
      }, 450);
    } catch {
      this.isCrowdPlaying = false;
    }
  }

  // ==========================================
  // 👥 CROWD REACTIONS (Dynamic Stadium Responses)
  // ==========================================

  public triggerCrowdReaction(type: CrowdReactionType) {
    if (!this.masterEnabled || !this.crowdEnabled) return;
    const now = Date.now();

    // Enforce cooldown to prevent overlapping acoustic clutter
    if (type !== 'knockdown' && type !== 'victory' && type !== 'defeat') {
      if (now - this.lastReactionTime < this.reactionCooldownMs) return;
    }
    this.lastReactionTime = now;

    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;

      switch (type) {
        case 'hit': {
          // 30% chance for subtle reaction so not every single jab triggers it
          if (Math.random() > 0.35) return;
          // Quick subtle collective gasp / murmur surge
          const dur = 0.35;
          const noise = this.createNoiseBuffer(ctx, dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(450, t);
          filter.Q.setValueAtTime(2.0, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.01, t);
          gain.gain.linearRampToValueAtTime(0.06, t + 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(t);
          noise.stop(t + dur);
          break;
        }

        case 'crit': {
          // "OHHH!" Stadium reaction
          const dur = 0.65;
          const noise = this.createNoiseBuffer(ctx, dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(360, t);
          filter.frequency.exponentialRampToValueAtTime(620, t + 0.2);
          filter.frequency.exponentialRampToValueAtTime(280, t + dur);
          filter.Q.setValueAtTime(3.5, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.02, t);
          gain.gain.linearRampToValueAtTime(0.12, t + 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(t);
          noise.stop(t + dur);
          break;
        }

        case 'knockdown': {
          // Intense gasp + roar on knockdown
          const dur = 1.1;
          const noise = this.createNoiseBuffer(ctx, dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, t);
          filter.frequency.exponentialRampToValueAtTime(300, t + dur);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.05, t);
          gain.gain.linearRampToValueAtTime(0.16, t + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(t);
          noise.stop(t + dur);
          break;
        }

        case 'victory': {
          // Celebratory cheers & rhythmic applause
          const dur = 1.6;
          const noise = this.createNoiseBuffer(ctx, dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(520, t);
          filter.Q.setValueAtTime(1.5, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.02, t);
          gain.gain.linearRampToValueAtTime(0.18, t + 0.25);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(t);
          noise.stop(t + dur);
          break;
        }

        case 'defeat': {
          // Disappointed collective groan / "aww"
          const dur = 0.9;
          const noise = this.createNoiseBuffer(ctx, dur);
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(420, t);
          filter.frequency.exponentialRampToValueAtTime(210, t + dur);
          filter.Q.setValueAtTime(2.5, t);

          const gain = ctx.createGain();
          gain.gain.setValueAtTime(0.03, t);
          gain.gain.linearRampToValueAtTime(0.1, t + 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur);

          noise.connect(filter);
          filter.connect(gain);
          gain.connect(ctx.destination);

          noise.start(t);
          noise.stop(t + dur);
          break;
        }
      }
    } catch {}
  }

  private createNoiseBuffer(ctx: AudioContext, duration: number): AudioBufferSourceNode {
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const node = ctx.createBufferSource();
    node.buffer = buffer;
    return node;
  }

  // ==========================================
  // 🥊 PUNCHES & COMBAT SFX (Precise & Punchy)
  // ==========================================

  // Light Jab punch (quick whoosh + snappy pop)
  public playJab() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // High-speed pitch sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(90, now + 0.06);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch {}
  }

  // Heavy Cross punch swing
  public playCross() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.09);

      gain.gain.setValueAtTime(0.26, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  // Hit impact (Connected punch)
  public playHit(heavy: boolean = false, critical: boolean = false) {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const duration = critical ? 0.18 : heavy ? 0.14 : 0.08;

      // 1. Noise transient impact (Leather glove pop)
      const noise = this.createNoiseBuffer(ctx, duration);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(critical ? 850 : heavy ? 650 : 950, now);
      filter.frequency.exponentialRampToValueAtTime(60, now + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(critical ? 0.42 : heavy ? 0.34 : 0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start(now);
      noise.stop(now + duration);

      // 2. Sub punch body thump
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(critical ? 180 : heavy ? 140 : 190, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + duration);

      oscGain.gain.setValueAtTime(critical ? 0.28 : 0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + duration);

      // Trigger crowd reaction based on intensity
      if (critical) {
        this.triggerCrowdReaction('crit');
      } else if (heavy) {
        this.triggerCrowdReaction(Math.random() < 0.6 ? 'crit' : 'hit');
      } else {
        this.triggerCrowdReaction('hit');
      }
    } catch {}
  }

  // 🛡️ Guard Block sound (muffled solid thud)
  public playBlock() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(210, now);
      osc.frequency.exponentialRampToValueAtTime(55, now + 0.06);

      gain.gain.setValueAtTime(0.24, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);

      // Soft high snap click for leather block
      const click = this.createNoiseBuffer(ctx, 0.02);
      const clickFilter = ctx.createBiquadFilter();
      clickFilter.type = 'highpass';
      clickFilter.frequency.setValueAtTime(1800, now);

      const clickGain = ctx.createGain();
      clickGain.gain.setValueAtTime(0.15, now);
      clickGain.gain.exponentialRampToValueAtTime(0.01, now + 0.02);

      click.connect(clickFilter);
      clickFilter.connect(clickGain);
      clickGain.connect(ctx.destination);

      click.start(now);
      click.stop(now + 0.02);
    } catch {}
  }

  // 💨 Dodge / Whiff (Crisp air evasion swoosh)
  public playDodge() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.075);

      gain.gain.setValueAtTime(0.14, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.075);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.075);
    } catch {}
  }

  // 💥 Knockdown impact + Floor drop
  public playKnockdown() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Heavy floor thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);

      gain.gain.setValueAtTime(0.38, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);

      // Trigger crowd shock
      this.triggerCrowdReaction('knockdown');
    } catch {}
  }

  // 🔔 Boxing Round Bell (Authentic brass chime with harmonics)
  public playBell() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const harmonics = [
        { freq: 880, vol: 0.32 },
        { freq: 1760, vol: 0.16 },
        { freq: 2640, vol: 0.08 },
        { freq: 3520, vol: 0.04 },
      ];

      harmonics.forEach(({ freq, vol }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.9);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.9);
      });
    } catch {}
  }

  // 🔢 Referee Fast Count Tick (1..10 pitch escalator)
  public playCount(num: number) {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const freq = 420 + num * 48; // Escalates smoothly from 468Hz to 900Hz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // 🏆 Victory Fanfare & ❌ Defeat Stinger
  public playKnockout(won: boolean) {
    if (!this.masterEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    if (won) {
      // Victory celebration
      this.triggerCrowdReaction('victory');
      if (this.sfxEnabled) {
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
        notes.forEach((freq, i) => {
          setTimeout(() => {
            try {
              if (!this.ctx) return;
              const now = this.ctx.currentTime;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(freq, now);
              gain.gain.setValueAtTime(0.24, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
              osc.connect(gain);
              gain.connect(this.ctx.destination);
              osc.start(now);
              osc.stop(now + 0.25);
            } catch {}
          }, i * 110);
        });
      }
    } else {
      // Defeat sequence
      this.triggerCrowdReaction('defeat');
      if (this.sfxEnabled) {
        const notes = [440, 392, 349.23, 293.66]; // A4 - G4 - F4 - D4
        notes.forEach((freq, i) => {
          setTimeout(() => {
            try {
              if (!this.ctx) return;
              const now = this.ctx.currentTime;
              const osc = this.ctx.createOscillator();
              const gain = this.ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(freq, now);
              gain.gain.setValueAtTime(0.18, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
              osc.connect(gain);
              gain.connect(this.ctx.destination);
              osc.start(now);
              osc.stop(now + 0.28);
            } catch {}
          }, i * 140);
        });
      }
    }
  }

  // Sound toggle alias
  public toggleSound(): boolean {
    return this.toggleMaster();
  }

  // Play beep compatibility alias
  public playBeep(
    freq: number = 440,
    duration: number = 0.05,
    type: OscillatorType = 'square',
    volume: number = 0.15
  ) {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const ctx = this.initCtx();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  // Dino Milestone Chime
  public playMilestone() {
    if (!this.masterEnabled || !this.sfxEnabled) return;
    const notes = [587.33, 880];
    notes.forEach((freq, i) => {
      setTimeout(() => {
        try {
          if (!this.ctx) return;
          const now = this.ctx.currentTime;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now);
          osc.stop(now + 0.12);
        } catch {}
      }, i * 110);
    });
  }
}

export const audio = new AudioManager();
