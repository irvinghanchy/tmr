/**
 * TMR Web Audio Bell & Chime Synthesizer
 * Uses Web Audio API to create authentic conference chimes, bells, and beeps.
 * Zero external audio assets required, 100% offline-ready, no CORS or 404 errors.
 */

class BellSynthesizer {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.muted = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  setMuted(muted) {
    this.muted = !!muted;
  }

  /**
   * Play chime sound once at given start time offset
   * @param {string} soundType - 'chime' | 'marimba' | 'beep'
   * @param {number} startTime - audioContext.currentTime + offset
   */
  playSingleTone(soundType, startTime) {
    if (!this.ctx || this.muted || this.volume <= 0) return;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, startTime);
    masterGain.connect(this.ctx.destination);

    if (soundType === 'chime') {
      // Elegant crystal conference bell / chime
      // Harmonics: 1174.66 Hz (D6), 1760 Hz (A6), 2349.32 Hz (D7), 3520 Hz (A7)
      const freqs = [1174.66, 1760, 2349.32, 3520];
      const gains = [0.45, 0.25, 0.15, 0.08];
      const decays = [1.8, 1.4, 1.1, 0.8];

      freqs.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.0001, startTime);
        gain.gain.exponentialRampToValueAtTime(gains[i], startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + decays[i]);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(startTime);
        osc.stop(startTime + decays[i] + 0.1);
      });

    } else if (soundType === 'marimba') {
      // Warm modern two-tone harmonic marimba chime
      const notes = [880, 1318.5]; // A5 + E6
      notes.forEach((freq, idx) => {
        const noteStart = startTime + idx * 0.06;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.4, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.2);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + 1.3);
      });

    } else if (soundType === 'beep') {
      // Standard sharp digital alarm beep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1000, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
      gain.gain.setValueAtTime(0.25, startTime + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    }
  }

  /**
   * Play bell alarm sequence
   * @param {number} rings - Number of times to ring (1, 2, 3...)
   * @param {string} soundType - 'chime' | 'marimba' | 'beep'
   * @param {number} gapMs - Interval between rings in ms (default 650ms)
   */
  playBell(rings = 1, soundType = 'chime', gapMs = 650) {
    this.initContext();
    if (!this.ctx || this.muted || this.volume <= 0) return;

    const count = Math.max(1, Math.min(10, rings));
    const now = this.ctx.currentTime;

    for (let i = 0; i < count; i++) {
      const ringTime = now + (i * gapMs) / 1000;
      this.playSingleTone(soundType, ringTime);
    }
  }
}

// Global audio singleton
window.bellSynth = new BellSynthesizer();
