/**
 * TMR Core State & Synchronization Engine (v3.2)
 * Handles multi-icon queue, new default bell rules, and layer-scoped icons.
 */

const STORAGE_KEY = 'tmr_timer_state_v3_2';
const CHANNEL_NAME = 'tmr_timer_channel';

// Default initial state matching new requirements
const defaultState = {
  // Active layer: 'time' | 'countup' | 'countdown' | 'blackout'
  activeLayer: 'time',
  previousLayer: null,
  fadeAnimation: true,
  fadeDurationMs: 400,

  // Options (showSeconds and showDate default to FALSE)
  timeConfig: {
    format24: true,
    showSeconds: false,
    showDate: false
  },

  // Count-up timer
  countup: {
    status: 'idle', // 'idle' | 'running' | 'paused'
    elapsedMs: 0,
    startedAt: null,
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
    triggeredRuleIds: []
  },

  // Requirement 13: 
  // 剩餘三分鐘響鈴一聲，一分半時兩聲，三十秒時三聲，時間到長鳴三聲，超時30秒再次長鳴三聲
  bellRules: [
    { id: 'rule_1', type: 'remaining', timeSec: 180, rings: 1, isLong: false, enabled: true },
    { id: 'rule_2', type: 'remaining', timeSec: 90, rings: 2, isLong: false, enabled: true },
    { id: 'rule_3', type: 'remaining', timeSec: 30, rings: 3, isLong: false, enabled: true },
    { id: 'rule_4', type: 'at_zero', timeSec: 0, rings: 3, isLong: true, enabled: true },
    { id: 'rule_5', type: 'overtime', timeSec: 30, rings: 3, isLong: true, enabled: true }
  ],

  // Sound settings (default: 'beep')
  soundSettings: {
    sound: 'beep', // 'beep' | 'chime' | 'marimba'
    volume: 0.8,
    muted: false
  },

  // Requirement 11: Multi-icon queue
  // Array of { id, name, color, persistent, expiresAt, layer }
  icons: [
    {
      id: 'init_watch',
      name: 'watch',
      color: 'gray',
      persistent: false,
      expiresAt: Date.now() + 1250,
      layer: 'time'
    }
  ],

  // Display settings
  displaySettings: {
    iconMode: 'side',     // 'side' | 'bottom' | 'none'
    iconDurationMs: 1250, // 1.25s
    overtimePrefix: '+'   // '+' prefix when overtime
  },

  version: 3.2
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
          icons: parsed.icons || defaultState.icons
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
          this.notifyBell(payload.rings, payload.sound, payload.isLong);
        } else if (type === 'REQUEST_STATE' && this.isMaster) {
          this.broadcast('STATE_UPDATE', this.state);
        } else if (type === 'CLIENT_PING' && this.isMaster) {
          this.broadcast('PONG', { role: 'master' });
        }
      };
    }

    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          this.state = JSON.parse(e.newValue);
          this.notify();
        } catch (err) {}
      }
    });

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

  notifyBell(rings, sound, isLong = false) {
    for (const cb of this.bellListeners) {
      try {
        cb(rings, sound, isLong);
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

  // ==========================================
  // Icon Queue Management (Requirement 11)
  // ==========================================
  addIcon(iconConfig) {
    const now = Date.now();
    const duration = iconConfig.durationMs || this.state.displaySettings.iconDurationMs || 1250;
    const newIcon = {
      id: iconConfig.id || ('icon_' + now + '_' + Math.floor(Math.random() * 1000)),
      name: iconConfig.name,
      color: iconConfig.color || 'gray',
      persistent: !!iconConfig.persistent,
      expiresAt: iconConfig.persistent ? 0 : now + duration,
      layer: iconConfig.layer || this.state.activeLayer
    };

    // Remove any existing icon with same id or same persistent type
    this.state.icons = this.state.icons.filter(i => {
      if (iconConfig.persistent && i.name === iconConfig.name && i.layer === newIcon.layer) {
        return false;
      }
      return i.id !== newIcon.id;
    });

    this.state.icons.push(newIcon);
  }

  removeIconByName(name, layer = null) {
    this.state.icons = this.state.icons.filter(i => {
      if (layer) {
        return !(i.name === name && i.layer === layer);
      }
      return i.name !== name;
    });
  }

  clearIconsForLayer(layer) {
    this.state.icons = this.state.icons.filter(i => i.layer !== layer);
  }

  // ==========================================
  // Layer Switching (Requirements 1, 3, 9)
  // ==========================================
  setActiveLayer(layer) {
    if (this.state.activeLayer === layer) return;

    this.update((state) => {
      state.previousLayer = state.activeLayer;
      state.activeLayer = layer;

      // Requirement 1: Clear icons from previous layer so paused icons do not leak
      state.icons = [];

      const now = Date.now();
      const duration = state.displaySettings.iconDurationMs || 1250;

      if (layer === 'time') {
        // Icon Rule 1: Briefly show gray watch
        this.addIcon({ name: 'watch', color: 'gray', layer: 'time', durationMs: duration });
      } else if (layer === 'countup') {
        // Requirement 3: If running when switched, show timer_arrow_up
        if (state.countup.status === 'running') {
          this.addIcon({ name: 'timer_arrow_up', color: 'green', layer: 'countup', durationMs: duration });
        } else if (state.countup.status === 'paused') {
          // Requirement 9: timer_pause
          this.addIcon({ name: 'timer_pause', color: 'orange', persistent: true, layer: 'countup' });
        }
      } else if (layer === 'countdown') {
        // Requirement 3: If running when switched, show timer_arrow_down
        if (state.countdown.status === 'running' || state.countdown.status === 'overtime') {
          this.addIcon({ name: 'timer_arrow_down', color: 'lightblue', layer: 'countdown', durationMs: duration });
        } else if (state.countdown.status === 'paused') {
          // Requirement 9: timer_pause
          this.addIcon({ name: 'timer_pause', color: 'orange', persistent: true, layer: 'countdown' });
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
      state.previousLayer = state.activeLayer;
      state.activeLayer = 'countup';

      if (state.countup.status === 'idle') {
        state.countup.status = 'running';
        state.countup.elapsedMs = 0;
        state.countup.startedAt = now;
      } else if (state.countup.status === 'paused') {
        state.countup.status = 'running';
        state.countup.startedAt = now - state.countup.elapsedMs;
      }

      // Remove persistent pause icon
      this.removeIconByName('timer_pause', 'countup');

      // Add green timer_arrow_up
      const duration = state.displaySettings.iconDurationMs || 1250;
      this.addIcon({ name: 'timer_arrow_up', color: 'green', layer: 'countup', durationMs: duration });
    });
  }

  pauseCountup() {
    this.update((state) => {
      if (state.countup.status === 'running') {
        state.countup.status = 'paused';
        state.countup.pausedAt = Date.now();
        state.countup.elapsedMs = Date.now() - (state.countup.startedAt || Date.now());

        // Requirement 9: Show orange timer_pause (persistent)
        this.addIcon({ name: 'timer_pause', color: 'orange', persistent: true, layer: 'countup' });
      }
    });
  }

  resetCountup() {
    this.update((state) => {
      state.countup.status = 'idle';
      state.countup.elapsedMs = 0;
      state.countup.startedAt = null;
      state.countup.pausedAt = null;

      this.removeIconByName('timer_pause', 'countup');
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

      this.removeIconByName('timer_pause', 'countdown');
    });
  }

  startCountdown() {
    this.update((state) => {
      const now = Date.now();
      state.previousLayer = state.activeLayer;
      state.activeLayer = 'countdown';

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
          state.countdown.status = 'overtime';
          state.countdown.targetEndTime = now - state.countdown.overtimeMs;
        }
      }

      this.removeIconByName('timer_pause', 'countdown');

      const duration = state.displaySettings.iconDurationMs || 1250;
      this.addIcon({ name: 'timer_arrow_down', color: 'lightblue', layer: 'countdown', durationMs: duration });
    });
  }

  pauseCountdown() {
    this.update((state) => {
      if (state.countdown.status === 'running' || state.countdown.status === 'overtime') {
        state.countdown.status = 'paused';
        // Requirement 9: Show orange timer_pause
        this.addIcon({ name: 'timer_pause', color: 'orange', persistent: true, layer: 'countdown' });
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

      this.removeIconByName('timer_pause', 'countdown');
    });
  }

  // Requirement 10: Adjust countdown with more_time / search_activity in gray
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
      } else if (state.countdown.status === 'overtime') {
        state.countdown.targetEndTime += deltaMs;
        if (state.countdown.targetEndTime > Date.now()) {
          state.countdown.status = 'running';
          state.countdown.remainingMs = state.countdown.targetEndTime - Date.now();
          state.countdown.overtimeMs = 0;
        } else {
          state.countdown.overtimeMs = Math.max(0, state.countdown.overtimeMs - deltaMs);
        }
      }

      // Requirement 10: if adjusting while counting down:
      // + time -> gray more_time
      // - time -> gray search_activity
      const duration = state.displaySettings.iconDurationMs || 1250;
      if (deltaSeconds > 0) {
        this.addIcon({ name: 'more_time', color: 'gray', layer: 'countdown', durationMs: duration });
      } else if (deltaSeconds < 0) {
        this.addIcon({ name: 'search_activity', color: 'gray', layer: 'countdown', durationMs: duration });
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
        type: rule.type || 'remaining',
        timeSec: Math.max(0, parseInt(rule.timeSec) || 0),
        rings: Math.max(1, Math.min(10, parseInt(rule.rings) || 1)),
        isLong: !!rule.isLong,
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

  triggerBellAlert(rings = 1, sound = 'beep', isLong = false) {
    const soundType = sound || this.state.soundSettings.sound || 'beep';
    const ringCount = Math.max(1, rings);

    if (window.bellSynth) {
      window.bellSynth.playBell(ringCount, soundType, isLong);
    }

    const duration = ringCount * (isLong ? 600 : 250) + 1200;
    this.update((state) => {
      this.addIcon({
        name: 'notifications_active',
        color: 'yellow',
        layer: 'countdown',
        durationMs: duration
      });
    });

    this.broadcast('BELL_TRIGGER', { rings: ringCount, sound: soundType, isLong });
  }

  // ==========================================
  // High-Precision Real-time Ticker Engine
  // ==========================================
  startTicker() {
    if (this.tickerInterval) return;

    this.tickerInterval = setInterval(() => {
      this.tick();
    }, 50);
  }

  tick() {
    const now = Date.now();
    let stateChanged = false;

    if (this.state.countup.status === 'running') {
      const elapsed = now - this.state.countup.startedAt;
      if (Math.abs(elapsed - this.state.countup.elapsedMs) >= 50) {
        this.state.countup.elapsedMs = elapsed;
        stateChanged = true;
      }
    }

    if (this.state.countdown.status === 'running' || this.state.countdown.status === 'overtime') {
      const diff = this.state.countdown.targetEndTime - now;

      if (diff > 0) {
        this.state.countdown.remainingMs = diff;
        this.state.countdown.overtimeMs = 0;
        this.state.countdown.status = 'running';
      } else {
        this.state.countdown.remainingMs = 0;
        this.state.countdown.overtimeMs = Math.abs(diff);
        this.state.countdown.status = 'overtime';
      }
      stateChanged = true;

      if (this.isMaster) {
        this.checkBellRules();
      }
    }

    // Expire icons in queue
    const unexpiredIcons = this.state.icons.filter(i => i.persistent || i.expiresAt > now);
    if (unexpiredIcons.length !== this.state.icons.length) {
      this.state.icons = unexpiredIcons;
      stateChanged = true;
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
        if (remainingSec <= rule.timeSec && cd.status === 'running') {
          shouldFire = true;
        }
      } else if (rule.type === 'at_zero') {
        if (cd.status === 'overtime' || (cd.remainingMs <= 100 && cd.status === 'running')) {
          shouldFire = true;
        }
      } else if (rule.type === 'overtime') {
        if (cd.status === 'overtime' && overtimeSec >= rule.timeSec) {
          shouldFire = true;
        }
      }

      if (shouldFire) {
        triggered.add(rule.id);
        cd.triggeredRuleIds = Array.from(triggered);
        this.saveState();
        this.triggerBellAlert(rule.rings, this.state.soundSettings.sound, !!rule.isLong);
        break;
      }
    }
  }

  // Utilities
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

  static formatTime(date, format24 = true, showSeconds = false) {
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
      return `${hStr}:${minutes}:${seconds}${ampm}`.trim();
    }
    return `${hStr}:${minutes}${ampm}`.trim();
  }

  static formatRuleText(rule) {
    let when = '';
    const timeStr = TimerStore.formatHMS(rule.timeSec * 1000);
    if (rule.type === 'remaining') {
      when = `剩餘 ${timeStr}`;
    } else if (rule.type === 'at_zero') {
      when = `倒數歸零 00:00`;
    } else if (rule.type === 'overtime') {
      when = `超時 ${timeStr}`;
    }
    const longSuffix = rule.isLong ? '長鳴' : '響';
    return `${when} ➔ ${longSuffix} ${rule.rings} 聲`;
  }
}

window.TimerStore = TimerStore;
