/**
 * TMR Web Audio Bell & Chime Synthesizer
 * Uses Web Audio API to create authentic digital beeps, conference chimes, and marimbas.
 * Zero external audio assets required, 100% offline-ready.
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
   * Play tone once at given start time offset
   * @param {string} soundType - 'beep' | 'chime' | 'marimba'
   * @param {number} startTime - audioContext.currentTime + offset
   */
  playSingleTone(soundType, startTime) {
    if (!this.ctx || this.muted || this.volume <= 0) return;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, startTime);
    masterGain.connect(this.ctx.destination);

    if (soundType === 'beep') {
      // Crisp digital beep
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1050, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.28, startTime + 0.008);
      gain.gain.setValueAtTime(0.28, startTime + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.14);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + 0.15);

    } else if (soundType === 'chime') {
      // Conference crystal bell
      const freqs = [1174.66, 1760, 2349.32, 3520];
      const gains = [0.45, 0.25, 0.15, 0.08];
      const decays = [1.5, 1.2, 0.9, 0.7];

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
        osc.stop(startTime + decays[i] + 0.05);
      });

    } else if (soundType === 'marimba') {
      // Warm marimba tone
      const notes = [880, 1318.5]; // A5 + E6
      notes.forEach((freq, idx) => {
        const noteStart = startTime + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.4, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 1.0);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + 1.1);
      });
    }
  }

  /**
   * Play bell sequence with tighter ring gaps
   * @param {number} rings - Number of times to ring (1, 2, 3...)
   * @param {string} soundType - 'beep' | 'chime' | 'marimba'
   * @param {number} customGapMs - Optional gap in ms
   */
  playBell(rings = 1, soundType = 'beep', customGapMs = null) {
    this.initContext();
    if (!this.ctx || this.muted || this.volume <= 0) return;

    // Reduced gap between rings for quick, pleasant cadence
    let gapMs = customGapMs;
    if (!gapMs) {
      if (soundType === 'beep') gapMs = 200; // Fast digital beep cadence
      else if (soundType === 'marimba') gapMs = 320;
      else gapMs = 380; // Chime
    }

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
