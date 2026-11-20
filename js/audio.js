/**
 * TMR Web Audio Bell & Chime Synthesizer (v3.2)
 * Supports standard beeps and sustained long rings ("長鳴").
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
   * @param {boolean} isLong - whether this tone is a sustained long ring ("長鳴")
   */
  playSingleTone(soundType, startTime, isLong = false) {
    if (!this.ctx || this.muted || this.volume <= 0) return;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, startTime);
    masterGain.connect(this.ctx.destination);

    if (soundType === 'beep') {
      // Crisp digital beep (normal ~0.12s, long ~0.45s)
      const duration = isLong ? 0.45 : 0.12;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(isLong ? 950 : 1050, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.008);
      gain.gain.setValueAtTime(0.3, startTime + duration);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.03);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.04);

    } else if (soundType === 'chime') {
      // Conference crystal bell
      const freqs = [1174.66, 1760, 2349.32, 3520];
      const gains = [0.45, 0.25, 0.15, 0.08];
      const decays = isLong ? [2.4, 2.0, 1.6, 1.2] : [1.4, 1.1, 0.9, 0.6];

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
      const notes = isLong ? [784, 1174.66] : [880, 1318.5];
      const decay = isLong ? 1.6 : 0.9;
      notes.forEach((freq, idx) => {
        const noteStart = startTime + idx * 0.04;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.exponentialRampToValueAtTime(0.4, noteStart + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + decay);

        osc.connect(gain);
        gain.connect(masterGain);

        osc.start(noteStart);
        osc.stop(noteStart + decay + 0.05);
      });
    }
  }

  /**
   * Play bell sequence
   * @param {number} rings - Number of times to ring
   * @param {string} soundType - 'beep' | 'chime' | 'marimba'
   * @param {boolean} isLong - Long ring ("長鳴")
   */
  playBell(rings = 1, soundType = 'beep', isLong = false) {
    this.initContext();
    if (!this.ctx || this.muted || this.volume <= 0) return;

    let gapMs = 220;
    if (isLong) {
      gapMs = soundType === 'beep' ? 550 : 650;
    } else {
      if (soundType === 'beep') gapMs = 200;
      else if (soundType === 'marimba') gapMs = 300;
      else gapMs = 360;
    }

    const count = Math.max(1, Math.min(10, rings));
    const now = this.ctx.currentTime;

    for (let i = 0; i < count; i++) {
      const ringTime = now + (i * gapMs) / 1000;
      this.playSingleTone(soundType, ringTime, isLong);
    }
  }
}

// Global audio singleton
window.bellSynth = new BellSynthesizer();
