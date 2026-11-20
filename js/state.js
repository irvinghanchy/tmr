/**
 * TMR Core State & Synchronization Engine
 * Handles timer time calculation, layer states, bell triggers,
 * and real-time syncing via BroadcastChannel & localStorage.
 */

const STORAGE_KEY = 'tmr_timer_state_v2';
const CHANNEL_NAME = 'tmr_timer_channel';

// Default initial state
const defaultState = {
  // Active layer: 'time' | 'countup' | 'countdown' | 'blackout'
  activeLayer: 'time',
  previousLayer: null,
  fadeAnimation: true,
  fadeDurationMs: 400,

  // Options
  timeConfig: {
    format24: true,
    showSeconds: true,
    showDate: true
  },

  // Count-up timer
  countup: {
    status: 'idle', // 'idle' | 'running' | 'paused'
    elapsedMs: 0,
    startedAt: null, // timestamp
    pausedAt: null
  },

  // Countdown timer
  countdown: {
    status: 'idle', // 'idle' | 'running' | 'paused' | 'overtime'
    initialSec: 300, // 5 minutes default
    remainingMs: 300000,
    startedAt: null,
    targetEndTime: null,
    overtimeMs: 0,
    triggeredRuleIds: [] // Track which bell alerts already triggered in this cycle
  },

  // Bell alert rules
  bellRules: [
    { id: 'rule_1', type: 'remaining', timeSec: 60, rings: 1, label: '剩餘 1 分鐘 (預備鈴)', enabled: true },
    { id: 'rule_2', type: 'at_zero', timeSec: 0, rings: 2, label: '倒數歸零 00:00 (結束鈴)', enabled: true },
    { id: 'rule_3', type: 'overtime', timeSec: 60, rings: 3, label: '超時 1 分鐘 (超時提醒)', enabled: true }
  ],

  // Sound settings
  soundSettings: {
    sound: 'chime', // 'chime' | 'marimba' | 'beep'
    volume: 0.8,
    muted: false
  },

  // Current active icon beside clock
  // name: 'watch' | 'timer_arrow_up' | 'timer_arrow_down' | 'pause' | 'notifications_active' | ''
  // color: 'white' | 'green' | 'orange' | 'lightblue' | 'yellow'
  icon: {
    name: '',
    color: '',
    persistent: false,
    expiresAt: 0,
    seq: 0 // unique sequence number for re-triggering animations
  },

  // General settings
  displaySettings: {
    iconPosition: 'right', // 'right' | 'left'
    iconDurationMs: 2500,  // brief display duration (ms)
    overtimePrefix: '+'    // '+' or '-' or ''
  },

  version: 2
};

class TimerStore {
  constructor(isMaster = false) {
    this.isMaster = isMaster;
    this.state = this.loadState();
    this.listeners = new Set();
    this.bellListeners = new Set();
    this.channel = null;
    this.tickerInterval = null;
    this.initSync();
  }

  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultState,
          ...parsed,
          timeConfig: { ...defaultState.timeConfig, ...(parsed.timeConfig || {}) },
          countup: { ...defaultState.countup, ...(parsed.countup || {}) },
          countdown: { ...defaultState.countdown, ...(parsed.countdown || {}) },
          soundSettings: { ...defaultState.soundSettings, ...(parsed.soundSettings || {}) },
          displaySettings: { ...defaultState.displaySettings, ...(parsed.displaySettings || {}) },
          bellRules: parsed.bellRules || defaultState.bellRules,
          icon: { ...defaultState.icon, ...(parsed.icon || {}) }
        };
      }
    } catch (e) {
      console.warn('Failed to load state from localStorage:', e);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('Failed to save state to localStorage:', e);
    }
  }

  initSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.channel = new BroadcastChannel(CHANNEL_NAME);
      this.channel.onmessage = (event) => {
        if (!event.data) return;
        const { type, payload } = event.data;

        if (type === 'STATE_UPDATE') {
          this.state = payload;
          this.notify();
        } else if (type === 'BELL_TRIGGER') {
          this.notifyBell(payload.rings, payload.sound);
        } else if (type === 'REQUEST_STATE' && this.isMaster) {
          this.broadcast('STATE_UPDATE', this.state);
        } else if (type === 'PING') {
          if (this.isMaster) {
            this.broadcast('PONG', { role: 'master' });
          }
        }
      };
    }

    // Storage event fallback for older or cross-origin browsers
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          this.state = JSON.parse(e.newValue);
          this.notify();
        } catch (err) {
          // ignore
        }
      }
    });

    // Start local calculation ticker
    this.startTicker();
  }

  broadcast(type, payload) {
    if (this.channel) {
      try {
        this.channel.postMessage({ type, payload });
      } catch (e) {
        console.warn('Broadcast error:', e);
      }
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.state);
    return () => this.listeners.delete(callback);
  }

  subscribeBell(callback) {
    this.bellListeners.add(callback);
    return () => this.bellListeners.delete(callback);
  }

  notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.state);
      } catch (e) {
        console.error('Listener error:', e);
      }
    }
  }

  notifyBell(rings, sound) {
    for (const cb of this.bellListeners) {
      try {
        cb(rings, sound);
      } catch (e) {
        console.error('Bell listener error:', e);
      }
    }
  }

  update(mutationFn, broadcast = true) {
    mutationFn(this.state);
    this.saveState();
    if (broadcast) {
      this.broadcast('STATE_UPDATE', this.state);
    }
    this.notify();
  }

  // Set active layer with icon logic
  setActiveLayer(layer) {
    if (this.state.activeLayer === layer) return;

    this.update((state) => {
      state.previousLayer = state.activeLayer;
      state.activeLayer = layer;

      // Icon Rule 1: Switching to current time -> briefly show white 'watch'
      if (layer === 'time') {
        state.icon = {
          name: 'watch',
          color: 'white',
          persistent: false,
          expiresAt: Date.now() + (state.displaySettings.iconDurationMs || 2500),
          seq: (state.icon.seq || 0) + 1
        };
      } else if (layer === 'blackout') {
        // Blackout hides everything including icon
        state.icon = {
          name: '',
          color: '',
          persistent: false,
          expiresAt: 0,
          seq: (state.icon.seq || 0) + 1
        };
      } else if (layer === 'countup') {
        // If countup is paused, show orange pause; if running, icon depends on start
        if (state.countup.status === 'paused') {
          state.icon = {
            name: 'pause',
            color: 'orange',
            persistent: true,
            expiresAt: 0,
            seq: (state.icon.seq || 0) + 1
          };
        } else {
          // Clear persistent pause if any
          state.icon = {
            name: '',
            color: '',
            persistent: false,
            expiresAt: 0,
            seq: (state.icon.seq || 0) + 1
          };
        }
      } else if (layer === 'countdown') {
        if (state.countdown.status === 'paused') {
          state.icon = {
            name: 'pause',
            color: 'orange',
            persistent: true,
            expiresAt: 0,
            seq: (state.icon.seq || 0) + 1
          };
        } else {
          state.icon = {
            name: '',
            color: '',
            persistent: false,
            expiresAt: 0,
            seq: (state.icon.seq || 0) + 1
          };
        }
      }
    });
  }

  setFadeAnimation(enabled, durationMs = 400) {
    this.update((state) => {
      state.fadeAnimation = !!enabled;
      if (durationMs) state.fadeDurationMs = durationMs;
    });
  }

  // ==========================================
  // Count-up Timer Logic
  // ==========================================
  startCountup() {
    this.update((state) => {
      const now = Date.now();
      if (state.countup.status === 'idle') {
        state.countup.status = 'running';
        state.countup.elapsedMs = 0;
        state.countup.startedAt = now;
      } else if (state.countup.status === 'paused') {
        state.countup.status = 'running';
        state.countup.startedAt = now - state.countup.elapsedMs;
      }

      // Icon Rule 2: Start / Resume countup -> briefly show green timer_arrow_up
      state.icon = {
        name: 'timer_arrow_up',
        color: 'green',
        persistent: false,
        expiresAt: now + (state.displaySettings.iconDurationMs || 2500),
        seq: (state.icon.seq || 0) + 1
      };
    });
  }

  pauseCountup() {
    this.update((state) => {
      if (state.countup.status === 'running') {
        state.countup.status = 'paused';
        state.countup.pausedAt = Date.now();
        state.countup.elapsedMs = Date.now() - (state.countup.startedAt || Date.now());

        // Icon Rule 2: Pause countup -> orange pause (persistent)
        state.icon = {
          name: 'pause',
          color: 'orange',
          persistent: true,
          expiresAt: 0,
          seq: (state.icon.seq || 0) + 1
        };
      }
    });
  }

  resetCountup() {
    this.update((state) => {
      state.countup.status = 'idle';
      state.countup.elapsedMs = 0;
      state.countup.startedAt = null;
      state.countup.pausedAt = null;

      // If active layer is countup and icon was pause, clear it
      if (state.activeLayer === 'countup') {
        state.icon = {
          name: '',
          color: '',
          persistent: false,
          expiresAt: 0,
          seq: (state.icon.seq || 0) + 1
        };
      }
    });
  }

  // ==========================================
  // Countdown Timer Logic
  // ==========================================
  setCountdownDuration(seconds) {
    const sec = Math.max(1, Math.min(86400, Math.floor(seconds)));
    this.update((state) => {
      state.countdown.initialSec = sec;
      state.countdown.remainingMs = sec * 1000;
      state.countdown.overtimeMs = 0;
      state.countdown.status = 'idle';
      state.countdown.startedAt = null;
      state.countdown.targetEndTime = null;
      state.countdown.triggeredRuleIds = [];

      if (state.activeLayer === 'countdown') {
        state.icon = {
          name: '',
          color: '',
          persistent: false,
          expiresAt: 0,
          seq: (state.icon.seq || 0) + 1
        };
      }
    });
  }

  startCountdown() {
    this.update((state) => {
      const now = Date.now();
      if (state.countdown.status === 'idle') {
        state.countdown.status = 'running';
        state.countdown.remainingMs = state.countdown.initialSec * 1000;
        state.countdown.overtimeMs = 0;
        state.countdown.startedAt = now;
        state.countdown.targetEndTime = now + state.countdown.remainingMs;
        state.countdown.triggeredRuleIds = [];
      } else if (state.countdown.status === 'paused') {
        if (state.countdown.remainingMs > 0) {
          state.countdown.status = 'running';
          state.countdown.targetEndTime = now + state.countdown.remainingMs;
        } else {
          // Resumed during overtime
          state.countdown.status = 'overtime';
          state.countdown.targetEndTime = now - state.countdown.overtimeMs;
        }
      }

      // Icon Rule 3: Start / Resume countdown -> briefly show light blue timer_arrow_down
      state.icon = {
        name: 'timer_arrow_down',
        color: 'lightblue',
        persistent: false,
        expiresAt: now + (state.displaySettings.iconDurationMs || 2500),
        seq: (state.icon.seq || 0) + 1
      };
    });
  }

  pauseCountdown() {
    this.update((state) => {
      if (state.countdown.status === 'running' || state.countdown.status === 'overtime') {
        const wasOvertime = state.countdown.status === 'overtime';
        state.countdown.status = 'paused';

        // Icon Rule 3: Pause countdown -> orange pause (persistent)
        state.icon = {
          name: 'pause',
          color: 'orange',
          persistent: true,
          expiresAt: 0,
          seq: (state.icon.seq || 0) + 1
        };
      }
    });
  }

  resetCountdown() {
    this.update((state) => {
      state.countdown.status = 'idle';
      state.countdown.remainingMs = state.countdown.initialSec * 1000;
      state.countdown.overtimeMs = 0;
      state.countdown.startedAt = null;
      state.countdown.targetEndTime = null;
      state.countdown.triggeredRuleIds = [];

      if (state.activeLayer === 'countdown') {
        state.icon = {
          name: '',
          color: '',
          persistent: false,
          expiresAt: 0,
          seq: (state.icon.seq || 0) + 1
        };
      }
    });
  }

  adjustCountdown(deltaSeconds) {
    this.update((state) => {
      const deltaMs = deltaSeconds * 1000;
      if (state.countdown.status === 'idle') {
        const newSec = Math.max(1, state.countdown.initialSec + deltaSeconds);
        state.countdown.initialSec = newSec;
        state.countdown.remainingMs = newSec * 1000;
      } else if (state.countdown.status === 'running') {
        state.countdown.targetEndTime += deltaMs;
        state.countdown.remainingMs += deltaMs;
      } else if (state.countdown.status === 'paused') {
        state.countdown.remainingMs += deltaMs;
      }
    });
  }

  // ==========================================
  // Bell Alert Rules Management
  // ==========================================
  addBellRule(rule) {
    this.update((state) => {
      const newRule = {
        id: 'rule_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        type: rule.type || 'remaining', // 'remaining' | 'at_zero' | 'overtime'
        timeSec: Math.max(0, parseInt(rule.timeSec) || 0),
        rings: Math.max(1, Math.min(10, parseInt(rule.rings) || 1)),
        label: rule.label || '自訂響鈴',
        enabled: true
      };
      state.bellRules.push(newRule);
    });
  }

  removeBellRule(ruleId) {
    this.update((state) => {
      state.bellRules = state.bellRules.filter(r => r.id !== ruleId);
    });
  }

  toggleBellRule(ruleId, enabled) {
    this.update((state) => {
      const r = state.bellRules.find(r => r.id === ruleId);
      if (r) r.enabled = !!enabled;
    });
  }

  triggerBellAlert(rings = 1, sound = 'chime') {
    const soundType = sound || this.state.soundSettings.sound;
    const ringCount = Math.max(1, rings);

    // Play sound locally via synth
    if (window.bellSynth) {
      window.bellSynth.playBell(ringCount, soundType);
    }

    // Set Icon Rule 3: yellow notifications_active
    const now = Date.now();
    const duration = ringCount * 650 + 1500; // Show icon during ringing plus cushion
    this.update((state) => {
      state.icon = {
        name: 'notifications_active',
        color: 'yellow',
        persistent: false,
        expiresAt: now + duration,
        seq: (state.icon.seq || 0) + 1
      };
    });

    // Broadcast bell trigger
    this.broadcast('BELL_TRIGGER', { rings: ringCount, sound: soundType });
  }

  // ==========================================
  // High-Precision Real-time Ticker Engine
  // ==========================================
  startTicker() {
    if (this.tickerInterval) return;

    // Tick every ~50ms for buttery smooth countdown & millisecond responsiveness
    this.tickerInterval = setInterval(() => {
      this.tick();
    }, 50);
  }

  tick() {
    const now = Date.now();
    let stateChanged = false;

    // Check count-up
    if (this.state.countup.status === 'running') {
      const elapsed = now - this.state.countup.startedAt;
      if (Math.abs(elapsed - this.state.countup.elapsedMs) >= 50) {
        this.state.countup.elapsedMs = elapsed;
        stateChanged = true;
      }
    }

    // Check countdown
    if (this.state.countdown.status === 'running' || this.state.countdown.status === 'overtime') {
      const diff = this.state.countdown.targetEndTime - now;

      if (diff > 0) {
        // Normal countdown counting down towards zero
        this.state.countdown.remainingMs = diff;
        this.state.countdown.overtimeMs = 0;
        this.state.countdown.status = 'running';
      } else {
        // Reached zero and counts UP in overtime!
        this.state.countdown.remainingMs = 0;
        this.state.countdown.overtimeMs = Math.abs(diff);
        this.state.countdown.status = 'overtime';
      }
      stateChanged = true;

      // Evaluate bell alert rules (only if master or single runner)
      if (this.isMaster) {
        this.checkBellRules();
      }
    }

    // Check temporary icon expiration
    if (this.state.icon.name && !this.state.icon.persistent && this.state.icon.expiresAt > 0) {
      if (now >= this.state.icon.expiresAt) {
        this.state.icon.name = '';
        this.state.icon.color = '';
        this.state.icon.expiresAt = 0;
        stateChanged = true;
      }
    }

    if (stateChanged) {
      this.notify();
    }
  }

  checkBellRules() {
    const cd = this.state.countdown;
    if (cd.status !== 'running' && cd.status !== 'overtime') return;

    const remainingSec = Math.ceil(cd.remainingMs / 1000);
    const overtimeSec = Math.floor(cd.overtimeMs / 1000);
    const triggered = new Set(cd.triggeredRuleIds || []);

    for (const rule of this.state.bellRules) {
      if (!rule.enabled || triggered.has(rule.id)) continue;

      let shouldFire = false;

      if (rule.type === 'remaining') {
        // Fires when remaining seconds <= rule.timeSec
        if (remainingSec <= rule.timeSec && cd.status === 'running') {
          shouldFire = true;
        }
      } else if (rule.type === 'at_zero') {
        // Fires when hits 0 or overtime starts
        if (cd.status === 'overtime' || (cd.remainingMs <= 100 && cd.status === 'running')) {
          shouldFire = true;
        }
      } else if (rule.type === 'overtime') {
        // Fires when overtime >= rule.timeSec
        if (cd.status === 'overtime' && overtimeSec >= rule.timeSec) {
          shouldFire = true;
        }
      }

      if (shouldFire) {
        triggered.add(rule.id);
        cd.triggeredRuleIds = Array.from(triggered);
        this.saveState();
        this.triggerBellAlert(rule.rings, this.state.soundSettings.sound);
        break; // Process one trigger per tick
      }
    }
  }

  // Utilities to format time
  static formatHMS(ms, options = {}) {
    if (ms < 0) ms = 0;
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');

    if (h > 0 || options.alwaysShowHours) {
      return `${pad(h)}:${pad(m)}:${pad(s)}`;
    }
    return `${pad(m)}:${pad(s)}`;
  }

  static formatTime(date, format24 = true, showSeconds = true) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    let ampm = '';

    if (!format24) {
      ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }
    const hStr = String(hours).padStart(2, '0');

    if (showSeconds) {
      return `${hStr}:${minutes}:${seconds}${ampm}`;
    }
    return `${hStr}:${minutes}${ampm}`;
  }
}

window.TimerStore = TimerStore;
