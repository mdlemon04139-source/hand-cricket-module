/**
 * Web Audio API Cinematic Synthesizer for KHELGHOR & CALBAJI.
 * 100% offline, zero external dependencies, reliable across all browsers.
 * Features 9 distinct character themes, refined action cues, and separate BGM/SFX channels.
 */

import { CharacterId } from '../types/game';

class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private enabled: boolean = true;
  private musicVolume: number = 0.6;
  private sfxVolume: number = 0.7;

  private currentThemeGain: GainNode | null = null;
  private activeThemeNodes: (AudioNode & { stop?: (when?: number) => void })[] = [];
  private themeStopTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // Lazy initialized on first user interaction
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(this.enabled ? 1.0 : 0.0, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
        this.musicGain.connect(this.masterGain);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
        this.sfxGain.connect(this.masterGain);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // ==========================================
  // VOLUME & MUTE CONTROLS
  // ==========================================
  public setEnabled(val: boolean) {
    this.enabled = val;
    this.initCtx();
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(val ? 1.0 : 0.0, this.ctx.currentTime);
    }
    if (!val) {
      this.stopCharacterTheme();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setMusicVolume(volume: number) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.initCtx();
    if (this.musicGain && this.ctx) {
      this.musicGain.gain.setValueAtTime(this.musicVolume, this.ctx.currentTime);
    }
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public setSfxVolume(volume: number) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.initCtx();
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this.sfxVolume, this.ctx.currentTime);
    }
  }

  public getSfxVolume(): number {
    return this.sfxVolume;
  }

  // Backwards compatibility alias
  public setVolume(volume: number) {
    this.setMusicVolume(volume);
    this.setSfxVolume(volume);
  }

  // ==========================================
  // CHARACTER THEMES (BGM Previews)
  // ==========================================
  public stopCharacterTheme() {
    if (this.themeStopTimeout) {
      clearTimeout(this.themeStopTimeout);
      this.themeStopTimeout = null;
    }
    if (this.currentThemeGain && this.ctx) {
      const now = this.ctx.currentTime;
      try {
        this.currentThemeGain.gain.linearRampToValueAtTime(0.0001, now + 0.25);
      } catch {}

      const oldGain = this.currentThemeGain;
      const oldNodes = [...this.activeThemeNodes];
      setTimeout(() => {
        oldNodes.forEach((node) => {
          try {
            if (typeof node.stop === 'function') node.stop();
            node.disconnect();
          } catch {}
        });
        try {
          oldGain.disconnect();
        } catch {}
      }, 300);

      this.currentThemeGain = null;
      this.activeThemeNodes = [];
    }
  }

  public playCharacterTheme(characterId: CharacterId) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.musicGain) return;

    this.stopCharacterTheme();

    const now = this.ctx.currentTime;
    const themeGain = this.ctx.createGain();
    themeGain.gain.setValueAtTime(0.0001, now);
    themeGain.gain.linearRampToValueAtTime(0.35, now + 0.12);
    themeGain.connect(this.musicGain);

    this.currentThemeGain = themeGain;
    this.activeThemeNodes = [];

    switch (characterId) {
      case 'nawab': {
        // Royal, dignified, commanding atmosphere.
        // Restrained court percussion, rich warm strings, subtle regal ambience.
        // Low warm Tanpura drone
        const droneOsc = this.ctx.createOscillator();
        const droneFilter = this.ctx.createBiquadFilter();
        droneOsc.type = 'sawtooth';
        droneOsc.frequency.setValueAtTime(110.0, now); // A2
        droneFilter.type = 'lowpass';
        droneFilter.frequency.setValueAtTime(420, now);
        droneOsc.connect(droneFilter);
        droneFilter.connect(themeGain);
        droneOsc.start(now);
        this.activeThemeNodes.push(droneOsc, droneFilter);

        // Regal court melody (Dorian mode sitar/esraj phrasing)
        const notes = [
          { f: 220.0, t: 0.1, d: 0.5 }, // A3
          { f: 277.18, t: 0.55, d: 0.4 }, // C#4
          { f: 329.63, t: 0.95, d: 0.55 }, // E4
          { f: 440.0, t: 1.5, d: 1.1 }, // A4
        ];
        notes.forEach((n) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(800, now + n.t);

          g.gain.setValueAtTime(0.001, now + n.t);
          g.gain.linearRampToValueAtTime(0.32, now + n.t + 0.08);
          g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

          osc.connect(filter);
          filter.connect(g);
          g.connect(themeGain);

          osc.start(now + n.t);
          osc.stop(now + n.t + n.d);
          this.activeThemeNodes.push(osc, filter, g);
        });

        // Restrained court pakhawaj pulse
        [0.08, 0.9].forEach((t) => {
          if (!this.ctx) return;
          const drum = this.ctx.createOscillator();
          const dg = this.ctx.createGain();
          drum.type = 'sine';
          drum.frequency.setValueAtTime(140, now + t);
          drum.frequency.exponentialRampToValueAtTime(65, now + t + 0.2);
          dg.gain.setValueAtTime(0.25, now + t);
          dg.gain.exponentialRampToValueAtTime(0.001, now + t + 0.25);
          drum.connect(dg);
          dg.connect(themeGain);
          drum.start(now + t);
          drum.stop(now + t + 0.26);
          this.activeThemeNodes.push(drum, dg);
        });
        break;
      }

      case 'sodagor': {
        // Subtle merchant-market ambience. Gentle trade coins and harbor transaction tones.
        // Soft harbor water/wind resonance
        const wind = this.ctx.createOscillator();
        const windFilter = this.ctx.createBiquadFilter();
        wind.type = 'sine';
        wind.frequency.setValueAtTime(220, now);
        windFilter.type = 'bandpass';
        windFilter.frequency.setValueAtTime(600, now);
        wind.connect(windFilter);
        windFilter.connect(themeGain);
        wind.start(now);
        this.activeThemeNodes.push(wind, windFilter);

        // Gentle coin & port bells
        const coinChimes = [
          { f: 587.33, t: 0.1 }, // D5
          { f: 739.99, t: 0.35 }, // F#5
          { f: 880.0, t: 0.6 }, // A5
          { f: 1174.66, t: 0.9 }, // D6
          { f: 1479.98, t: 1.25 }, // F#6
        ];
        coinChimes.forEach((c) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(c.f, now + c.t);
          g.gain.setValueAtTime(0.2, now + c.t);
          g.gain.exponentialRampToValueAtTime(0.001, now + c.t + 0.45);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + c.t);
          osc.stop(now + c.t + 0.5);
          this.activeThemeNodes.push(osc, g);
        });
        break;
      }

      case 'guptoghatok': {
        // Dark suspense, stealth, low atmospheric tones, precise attack sound.
        // Low ominous sub-bass tension
        const sub = this.ctx.createOscillator();
        const subFilter = this.ctx.createBiquadFilter();
        sub.type = 'sawtooth';
        sub.frequency.setValueAtTime(55.0, now); // A1
        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(160, now);
        sub.connect(subFilter);
        subFilter.connect(themeGain);
        sub.start(now);
        this.activeThemeNodes.push(sub, subFilter);

        // Quiet stealth dissonance (soft minor second)
        const darkNotes = [
          { f: 220.0, t: 0.15, d: 0.7 },
          { f: 233.08, t: 0.5, d: 0.6 }, // Bb3 tension
          { f: 196.0, t: 1.0, d: 0.9 },
        ];
        darkNotes.forEach((n) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          g.gain.setValueAtTime(0.001, now + n.t);
          g.gain.linearRampToValueAtTime(0.25, now + n.t + 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + n.t);
          osc.stop(now + n.t + n.d);
          this.activeThemeNodes.push(osc, g);
        });
        break;
      }

      case 'nishachor': {
        // Ominous supernatural ambience. Eerie, controlled textures and a threatening attack cue.
        // Low blood-moon rumble
        const rumble = this.ctx.createOscillator();
        const rumbleFilter = this.ctx.createBiquadFilter();
        rumble.type = 'sawtooth';
        rumble.frequency.setValueAtTime(45.0, now);
        rumbleFilter.type = 'lowpass';
        rumbleFilter.frequency.setValueAtTime(140, now);
        rumble.connect(rumbleFilter);
        rumbleFilter.connect(themeGain);
        rumble.start(now);
        this.activeThemeNodes.push(rumble, rumbleFilter);

        // Controlled supernatural harmonic textures
        [164.81, 155.56, 174.61].forEach((freq, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          const t = 0.2 + idx * 0.45;
          osc.frequency.setValueAtTime(freq, now + t);
          g.gain.setValueAtTime(0.001, now + t);
          g.gain.linearRampToValueAtTime(0.22, now + t + 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + t + 0.6);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + t);
          osc.stop(now + t + 0.65);
          this.activeThemeNodes.push(osc, g);
        });
        break;
      }

      case 'guptochor': {
        // Quiet, intelligent, stealth-focused music. Subtle investigative and secretive sounds.
        const spyMelody = [
          { f: 440.0, t: 0.1 },
          { f: 523.25, t: 0.35 },
          { f: 659.25, t: 0.6 },
          { f: 587.33, t: 0.95 },
          { f: 440.0, t: 1.35 },
        ];
        spyMelody.forEach((n) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          g.gain.setValueAtTime(0.001, now + n.t);
          g.gain.linearRampToValueAtTime(0.22, now + n.t + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.35);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + n.t);
          osc.stop(now + n.t + 0.4);
          this.activeThemeNodes.push(osc, g);
        });
        break;
      }

      case 'jyotishi': {
        // Mystical, atmospheric tones. Soft celestial textures and restrained magical effects.
        // Pure harmonic singing bowls (528 Hz Solfeggio + mystical fifths)
        const celestialSingingBowls = [528.0, 792.0, 1056.0, 1584.0];
        celestialSingingBowls.forEach((f, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          const t = idx * 0.12;
          osc.frequency.setValueAtTime(f, now + t);
          g.gain.setValueAtTime(0.001, now + t);
          g.gain.linearRampToValueAtTime(0.2 / (idx + 1), now + t + 0.2);
          g.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + t);
          osc.stop(now + 2.3);
          this.activeThemeNodes.push(osc, g);
        });
        break;
      }

      case 'dosyu_sordar': {
        // Grounded Bengali river pirate / folk bandit tone.
        // Rhythmic acoustic folk-reminiscent energy, assertive dhol/khak percussion pulse, rustic confidence.
        // Acoustic folk dhol rhythm
        const dholBeats = [
          { f: 130, t: 0.05, drop: 55 },
          { f: 160, t: 0.35, drop: 70 },
          { f: 130, t: 0.65, drop: 55 },
          { f: 180, t: 0.95, drop: 80 },
          { f: 120, t: 1.25, drop: 50 },
        ];
        dholBeats.forEach((b) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(b.f, now + b.t);
          osc.frequency.exponentialRampToValueAtTime(b.drop, now + b.t + 0.16);
          g.gain.setValueAtTime(0.3, now + b.t);
          g.gain.exponentialRampToValueAtTime(0.001, now + b.t + 0.2);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + b.t);
          osc.stop(now + b.t + 0.22);
          this.activeThemeNodes.push(osc, g);
        });

        // Rustic acoustic lute/dotara strum riff
        const folkRiff = [
          { f: 293.66, t: 0.1 }, // D4
          { f: 329.63, t: 0.4 }, // E4
          { f: 392.0, t: 0.7 }, // G4
          { f: 440.0, t: 1.0 }, // A4
          { f: 293.66, t: 1.3 }, // D4
        ];
        folkRiff.forEach((n) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(650, now + n.t);
          g.gain.setValueAtTime(0.18, now + n.t);
          g.gain.exponentialRampToValueAtTime(0.001, now + n.t + 0.25);
          osc.connect(filter);
          filter.connect(g);
          g.connect(themeGain);
          osc.start(now + n.t);
          osc.stop(now + n.t + 0.27);
          this.activeThemeNodes.push(osc, filter, g);
        });
        break;
      }

      case 'sidhel_chor': {
        // Agile, light-footed night prowler. Soft roof-tile steps, subtle tension, nocturnal bamboo flute motif.
        const fluteNotes = [
          { f: 659.25, t: 0.1, d: 0.2 }, // E5
          { f: 783.99, t: 0.3, d: 0.18 }, // G5
          { f: 880.0, t: 0.52, d: 0.22 }, // A5
          { f: 783.99, t: 0.8, d: 0.18 }, // G5
          { f: 659.25, t: 1.05, d: 0.35 }, // E5
        ];
        fluteNotes.forEach((n) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const filter = this.ctx.createBiquadFilter();
          const g = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.f, now + n.t);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1100, now + n.t);

          g.gain.setValueAtTime(0.001, now + n.t);
          g.gain.linearRampToValueAtTime(0.24, now + n.t + 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

          osc.connect(filter);
          filter.connect(g);
          g.connect(themeGain);

          osc.start(now + n.t);
          osc.stop(now + n.t + n.d);
          this.activeThemeNodes.push(osc, filter, g);
        });
        break;
      }

      case 'khajnadar': {
        // Solemn imperial bureaucrat / treasury accountant.
        // Resonant brass-bell/coin weight chime, measured formal sitar or tanpura cadence, royal tax stamp impact.
        // Resonant brass bell scale chime
        const brassChimes = [
          { f: 440.0, t: 0.05 },
          { f: 554.37, t: 0.3 },
          { f: 659.25, t: 0.55 },
          { f: 880.0, t: 0.85 },
        ];
        brassChimes.forEach((b) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(b.f, now + b.t);
          g.gain.setValueAtTime(0.22, now + b.t);
          g.gain.exponentialRampToValueAtTime(0.001, now + b.t + 0.4);
          osc.connect(g);
          g.connect(themeGain);
          osc.start(now + b.t);
          osc.stop(now + b.t + 0.45);
          this.activeThemeNodes.push(osc, g);
        });

        // Solemn tax stamp impact
        const stamp = this.ctx.createOscillator();
        const stampGain = this.ctx.createGain();
        stamp.type = 'triangle';
        stamp.frequency.setValueAtTime(200, now + 1.2);
        stamp.frequency.exponentialRampToValueAtTime(60, now + 1.4);
        stampGain.gain.setValueAtTime(0.3, now + 1.2);
        stampGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
        stamp.connect(stampGain);
        stampGain.connect(themeGain);
        stamp.start(now + 1.2);
        stamp.stop(now + 1.46);
        this.activeThemeNodes.push(stamp, stampGain);
        break;
      }
    }

    // Auto-fade preview after ~2.6 seconds
    this.themeStopTimeout = setTimeout(() => {
      this.stopCharacterTheme();
    }, 2600);
  }

  // ==========================================
  // CHARACTER-SPECIFIC ACTION SOUND EFFECTS
  // ==========================================
  public playCharacterAction(characterId: CharacterId) {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;

    switch (characterId) {
      case 'nawab': {
        // Royal, dignified treasury proclamation
        [440, 554.37, 659.25, 880].forEach((f, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.07);
          g.gain.setValueAtTime(0.2, now + i * 0.07);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.35);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.38);
        });
        break;
      }

      case 'sodagor': {
        // Subtle harbor trade transaction and gentle coins
        [1100, 1400, 1750, 2200].forEach((f, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.05);
          g.gain.setValueAtTime(0.18, now + i * 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.22);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + i * 0.05);
          osc.stop(now + i * 0.05 + 0.25);
        });
        break;
      }

      case 'guptoghatok': {
        // Dark suspense, precise stealth attack sound (no loud generic screams)
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.22);
        g.gain.setValueAtTime(0.28, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }

      case 'nishachor': {
        // Supernatural blood moon threatening attack cue
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.linearRampToValueAtTime(65, now + 0.35);
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }

      case 'guptochor': {
        // Falcon inspection chirp & whoosh
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(1150, now + 0.12);
        osc.frequency.exponentialRampToValueAtTime(420, now + 0.25);
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }

      case 'jyotishi': {
        // Celestial starlight harmonic
        [660, 990, 1320].forEach((f, idx) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.04);
          g.gain.setValueAtTime(0.18, now + idx * 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.45);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + idx * 0.04);
          osc.stop(now + idx * 0.04 + 0.5);
        });
        break;
      }

      case 'dosyu_sordar': {
        // Grounded river pirate cutlass strike & treasure grab (no cartoonish shouting)
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.25);
        g.gain.setValueAtTime(0.28, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }

      case 'sidhel_chor': {
        // Light-footed night prowler rooftop theft
        [750, 1050, 1350].forEach((f, i) => {
          if (!this.ctx) return;
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.04);
          g.gain.setValueAtTime(0.18, now + i * 0.04);
          g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.15);
          osc.connect(g);
          g.connect(this.sfxGain!);
          osc.start(now + i * 0.04);
          osc.stop(now + i * 0.04 + 0.18);
        });
        break;
      }

      case 'khajnadar': {
        // Solemn royal tax seal stamp
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(240, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.18);
        g.gain.setValueAtTime(0.32, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.connect(g);
        g.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + 0.26);
        break;
      }
    }
  }

  // ==========================================
  // GENERAL GAME SOUNDS
  // ==========================================
  public playCoin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.05);

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.28);
  }

  public playCardDeal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.12);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playCardFlip = () => {
    try {
      this.playCardDeal();
    } catch {
      // ignore
    }
  };

  public playChallenge() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [180, 270, 360, 540].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const vol = 0.2 / (idx + 1);
      gain.gain.setValueAtTime(vol, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now);
      osc.stop(now + 0.75);
    });
  }

  public playBluffCaught() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(120, now + 0.32);

    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playProofSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);

      gain.gain.setValueAtTime(0.14, now + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now + idx * 0.05);
      osc.stop(now + 0.5);
    });
  }

  public playLifeLost() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);

    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.38);
  }

  public playClick() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(750, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.035);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  public playVictory() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const notes = [
      { f: 523.25, d: 0.15 },
      { f: 659.25, d: 0.15 },
      { f: 783.99, d: 0.15 },
      { f: 1046.5, d: 0.4 },
    ];

    let t = this.ctx.currentTime;
    notes.forEach((n) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(n.f, t);

      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + n.d);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(t);
      osc.stop(t + n.d);
      t += n.d * 0.9;
    });
  }

  public playRoomJoin() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [440, 659.25].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.22);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });
  }

  public playMatchStart() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [330, 440, 554.37, 659.25, 880].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, now + i * 0.06);
      gain.gain.setValueAtTime(0.2, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.4);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.45);
    });
  }

  public playTurnNotification() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  public playCardSelect() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.05);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playBribeClink() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [1200, 1600, 2400].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.04);
      gain.gain.setValueAtTime(0.2, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.18);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.2);
    });
  }

  public playInspectionReveal() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [300, 450, 600, 750].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.05);
      gain.gain.setValueAtTime(0.18, now + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.38);
    });
  }

  public playGavel() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.15);
    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playPassSuccess() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [523.25, 659.25, 1046.5].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.3);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.32);
    });
  }

  public playDefeat() {
    if (!this.enabled) return;
    this.initCtx();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [380, 320, 270, 200].forEach((f, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f, now + i * 0.12);
      gain.gain.setValueAtTime(0.2, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.35);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.38);
    });
  }
}

export const sound = new SoundManager();
(SoundManager.prototype as any).playCardFlip = function() {
  try {
    this.playCardDeal();
  } catch {}
};
(sound as any).playCardFlip = () => sound.playCardDeal();

