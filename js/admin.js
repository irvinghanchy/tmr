/**
 * TMR Admin Console Master Script (v3.3)
 * Implements synchronized colon blinking on second changes,
 * no-hour-rollover default (up to 99 min), and hours-steady colons.
 * Active display buttons are unclickable and locked without changing text.
 */

(function () {
  const store = new TimerStore(true); // Master mode

  // Header Elements
  const connBadge = document.getElementById('conn-badge');
  const connDot = document.getElementById('conn-dot');
  const connText = document.getElementById('conn-text');
  const btnToggleMute = document.getElementById('btn-toggle-mute');
  const iconMuteState = document.getElementById('icon-mute-state');
  const btnTestChime = document.getElementById('btn-test-chime');

  // Preview & Master Layer Controls
  const previewScreen = document.getElementById('preview-screen');
  const prevLayerTime = document.getElementById('preview-layer-time');
  const prevLayerCountup = document.getElementById('preview-layer-countup');
  const prevLayerCountdown = document.getElementById('preview-layer-countdown');
  const prevLayerBlackout = document.getElementById('preview-layer-blackout');

  const prevContentTime = document.getElementById('prev-content-time');
  const prevContentCountup = document.getElementById('prev-content-countup');
  const prevContentCountdown = document.getElementById('prev-content-countdown');

  const prevDigitsTime = document.getElementById('prev-digits-time');
  const prevSublineDate = document.getElementById('prev-subline-date');
  const prevDigitsCountup = document.getElementById('prev-digits-countup');
  const prevDigitsCountdown = document.getElementById('prev-digits-countdown');

  const prevIconSlotTime = document.getElementById('prev-icon-slot-time');
  const prevIconSlotCountup = document.getElementById('prev-icon-slot-countup');
  const prevIconSlotCountdown = document.getElementById('prev-icon-slot-countdown');

  const previewActiveLabel = document.getElementById('preview-active-label');
  const btnOpenDisplay = document.getElementById('btn-open-display');
  const activeLayerBtns = document.querySelectorAll('.active-layer-btn');
  const toggleFadeAnim = document.getElementById('toggle-fade-anim');
  const selectFadeDuration = document.getElementById('select-fade-duration');
  const selectIconMode = document.getElementById('select-icon-mode');
  const toggleAllowHour = document.getElementById('toggle-allow-hour');
  const sliderBorderDistance = document.getElementById('slider-border-distance');
  const labelBorderDistance = document.getElementById('label-border-distance');

  // Mode 1 (Time)
  const cardModeTime = document.getElementById('card-mode-time');
  const cardDigitsTime = document.getElementById('card-digits-time');
  const checkTime24h = document.getElementById('check-time-24h');
  const checkTimeSeconds = document.getElementById('check-time-seconds');
  const checkTimeDate = document.getElementById('check-time-date');
  const btnShowTime = document.getElementById('btn-show-time');

  // Mode 2 (Count-up)
  const cardModeCountup = document.getElementById('card-mode-countup');
  const cardDigitsCountup = document.getElementById('card-digits-countup');
  const statusCountup = document.getElementById('status-countup');
  const btnCountupStart = document.getElementById('btn-countup-start');
  const textCountupStart = document.getElementById('text-countup-start');
  const btnCountupPause = document.getElementById('btn-countup-pause');
  const btnCountupReset = document.getElementById('btn-countup-reset');
  const btnShowCountup = document.getElementById('btn-show-countup');

  // Mode 3 (Countdown)
  const cardModeCountdown = document.getElementById('card-mode-countdown');
  const cardDigitsCountdown = document.getElementById('card-digits-countdown');
  const statusCountdown = document.getElementById('status-countdown');
  const presetChips = document.querySelectorAll('.preset-chip');
  const inputCustomH = document.getElementById('input-custom-h');
  const inputCustomM = document.getElementById('input-custom-m');
  const inputCustomS = document.getElementById('input-custom-s');
  const btnApplyCustomTime = document.getElementById('btn-apply-custom-time');
  const btnCountdownStart = document.getElementById('btn-countdown-start');
  const textCountdownStart = document.getElementById('text-countdown-start');
  const btnCountdownPause = document.getElementById('btn-countdown-pause');
  const btnCountdownReset = document.getElementById('btn-countdown-reset');
  const btnShowCountdown = document.getElementById('btn-show-countdown');

  // Delta adjustment buttons (±5s, ±10s, ±15s, ±30s, ±45s, ±1m, ±3m, ±5m)
  const btnDeltas = document.querySelectorAll('.btn-delta');
  const inputCustomDeltaVal = document.getElementById('input-custom-delta-val');
  const selectCustomDeltaUnit = document.getElementById('select-custom-delta-unit');
  const btnApplyCustomDeltaPlus = document.getElementById('btn-apply-custom-delta-plus');
  const btnApplyCustomDeltaMinus = document.getElementById('btn-apply-custom-delta-minus');

  // Bell alerts & Sound
  const bellRulesList = document.getElementById('bell-rules-list');
  const btnAddBellRule = document.getElementById('btn-add-bell-rule');
  const selectBellSound = document.getElementById('select-bell-sound');
  const sliderVolume = document.getElementById('slider-volume');

  // Mode 4 (Blackout)
  const cardModeBlackout = document.getElementById('card-mode-blackout');
  const btnToggleBlackout = document.getElementById('btn-toggle-blackout');
  const textBlackoutBtn = document.getElementById('text-blackout-btn');

  // Modal: Add Bell
  const modalAddBell = document.getElementById('modal-add-bell');
  const formAddBell = document.getElementById('form-add-bell');
  const btnCancelBellModal = document.getElementById('btn-cancel-bell-modal');
  const ruleInputType = document.getElementById('rule-input-type');
  const ruleTimeGroup = document.getElementById('rule-time-group');
  const ruleInputM = document.getElementById('rule-input-m');
  const ruleInputS = document.getElementById('rule-input-s');
  const ruleInputRings = document.getElementById('rule-input-rings');
  const ruleInputLong = document.getElementById('rule-input-long');

  // Layer buttons
  const btnShowLayers = document.querySelectorAll('.btn-show-layer');

  // Client connection tracker
  let lastClientPingTime = 0;
  let displayWindowRef = null;

  if (store.channel) {
    store.channel.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CLIENT_PING') {
        lastClientPingTime = Date.now();
        updateConnectionStatus();
      }
    });
  }

  function updateConnectionStatus() {
    const isAlive = (Date.now() - lastClientPingTime < 5000) || (displayWindowRef && !displayWindowRef.closed);
    if (isAlive) {
      connDot.className = 'w-2 h-2 rounded-full bg-success shadow-[0_0_8px_#22c55e]';
      connBadge.className = 'badge badge-outline border-success/40 text-success gap-1.5 py-3 px-3 text-xs font-medium select-none';
      connText.textContent = '展示視窗已連線';
    } else {
      connDot.className = 'w-2 h-2 rounded-full bg-gray-500';
      connBadge.className = 'badge badge-outline gap-1.5 py-3 px-3 text-xs font-medium select-none';
      connText.textContent = '未連線展示視窗';
    }
  }
  setInterval(updateConnectionStatus, 2000);

  // Open presentation window
  btnOpenDisplay.addEventListener('click', () => {
    const w = 1280;
    const h = 720;
    const left = (screen.width - w) / 2;
    const top = (screen.height - h) / 2;
    displayWindowRef = window.open(
      './display.html',
      'TmrDisplayWindow',
      `width=${w},height=${h},top=${top},left=${left},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );

    if (displayWindowRef) {
      displayWindowRef.focus();
      lastClientPingTime = Date.now();
      updateConnectionStatus();
    } else {
      alert('彈出視窗被瀏覽器阻擋，請在瀏覽器網址列允許彈出視窗後重試！');
    }
  });

  // Master Layer Switcher
  activeLayerBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (btn.disabled || btn.classList.contains('btn-disabled') || btn.classList.contains('pointer-events-none')) {
        e.preventDefault();
        return;
      }
      const layer = btn.dataset.layer;
      if (layer === store.state.activeLayer) return;
      store.setActiveLayer(layer);
    });
  });

  // Card Show Layer Buttons: Click disabled when active
  btnShowLayers.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (btn.disabled || btn.classList.contains('btn-disabled') || btn.classList.contains('pointer-events-none')) {
        e.preventDefault();
        return;
      }
      const layer = btn.dataset.layer;
      if (layer === store.state.activeLayer) return;
      store.setActiveLayer(layer);
    });
  });

  // Transition & Settings
  toggleFadeAnim.addEventListener('change', () => {
    store.setFadeAnimation(toggleFadeAnim.checked, parseInt(selectFadeDuration.value));
  });

  selectFadeDuration.addEventListener('change', () => {
    store.setFadeAnimation(toggleFadeAnim.checked, parseInt(selectFadeDuration.value));
  });

  selectIconMode.addEventListener('change', () => {
    store.update((state) => {
      state.displaySettings.iconMode = selectIconMode.value;
    });
  });

  if (toggleAllowHour) {
    toggleAllowHour.addEventListener('change', () => {
      store.update((state) => {
        state.displaySettings.allowHourRollover = toggleAllowHour.checked;
      });
    });
  }

  if (sliderBorderDistance) {
    sliderBorderDistance.addEventListener('input', (e) => {
      const val = parseInt(e.target.value) ?? 100;
      store.setBorderDistance(val);
      if (labelBorderDistance) {
        if (val === 100) labelBorderDistance.textContent = '現況預設 (100%)';
        else if (val === 0) labelBorderDistance.textContent = '無邊界 (0%)';
        else labelBorderDistance.textContent = `${val}%`;
      }
    });
  }

  // Audio Controls
  selectBellSound.addEventListener('change', () => {
    store.update((state) => {
      state.soundSettings.sound = selectBellSound.value;
    });
  });

  sliderVolume.addEventListener('input', () => {
    const vol = parseFloat(sliderVolume.value);
    store.update((state) => {
      state.soundSettings.volume = vol;
    });
    if (window.bellSynth) {
      window.bellSynth.setVolume(vol);
    }
  });

  btnToggleMute.addEventListener('click', () => {
    const muted = !store.state.soundSettings.muted;
    store.update((state) => {
      state.soundSettings.muted = muted;
    });
    if (window.bellSynth) {
      window.bellSynth.setMuted(muted);
    }
    updateMuteUI(muted);
  });

  function updateMuteUI(muted) {
    iconMuteState.textContent = muted ? 'volume_off' : 'volume_up';
    btnToggleMute.title = muted ? '取消靜音 (M)' : '靜音鈴聲 (M)';
    if (muted) btnToggleMute.classList.add('text-error');
    else btnToggleMute.classList.remove('text-error');
  }

  btnTestChime.addEventListener('click', () => {
    if (window.bellSynth) {
      window.bellSynth.playBell(1, store.state.soundSettings.sound);
    }
  });

  // Mode 1: Time
  checkTime24h.addEventListener('change', () => {
    store.update((state) => {
      state.timeConfig.format24 = checkTime24h.checked;
    });
  });

  checkTimeSeconds.addEventListener('change', () => {
    store.update((state) => {
      state.timeConfig.showSeconds = checkTimeSeconds.checked;
    });
  });

  checkTimeDate.addEventListener('change', () => {
    store.update((state) => {
      state.timeConfig.showDate = checkTimeDate.checked;
    });
  });

  // Mode 2: Count-up
  btnCountupStart.addEventListener('click', () => {
    store.startCountup();
  });

  btnCountupPause.addEventListener('click', () => {
    store.pauseCountup();
  });

  btnCountupReset.addEventListener('click', () => {
    store.resetCountup();
  });

  // Mode 3: Countdown
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      presetChips.forEach((c) => {
        c.classList.remove('btn-primary');
        c.classList.add('btn-outline');
      });
      chip.classList.remove('btn-outline');
      chip.classList.add('btn-primary');
      const sec = parseInt(chip.dataset.sec);
      store.setCountdownDuration(sec);

      inputCustomH.value = Math.floor(sec / 3600);
      inputCustomM.value = Math.floor((sec % 3600) / 60);
      inputCustomS.value = sec % 60;
    });
  });

  btnApplyCustomTime.addEventListener('click', () => {
    const h = parseInt(inputCustomH.value) || 0;
    const m = parseInt(inputCustomM.value) || 0;
    const s = parseInt(inputCustomS.value) || 0;
    const totalSec = h * 3600 + m * 60 + s;
    if (totalSec > 0) {
      store.setCountdownDuration(totalSec);
      presetChips.forEach((c) => {
        c.classList.remove('btn-primary');
        c.classList.add('btn-outline');
      });
    }
  });

  btnCountdownStart.addEventListener('click', () => {
    store.startCountdown();
  });

  btnCountdownPause.addEventListener('click', () => {
    store.pauseCountdown();
  });

  btnCountdownReset.addEventListener('click', () => {
    store.resetCountdown();
  });

  // Quick Adjustment Buttons
  btnDeltas.forEach((btn) => {
    btn.addEventListener('click', () => {
      const delta = parseInt(btn.dataset.delta) || 0;
      if (delta !== 0) {
        store.adjustCountdown(delta);
      }
    });
  });

  // Custom Delta Adjustment
  function applyCustomDelta(multiplier) {
    const val = parseInt(inputCustomDeltaVal.value) || 0;
    if (val <= 0) return;
    const unit = selectCustomDeltaUnit.value;
    const seconds = val * (unit === 'min' ? 60 : 1) * multiplier;
    store.adjustCountdown(seconds);
  }

  btnApplyCustomDeltaPlus.addEventListener('click', () => applyCustomDelta(1));
  btnApplyCustomDeltaMinus.addEventListener('click', () => applyCustomDelta(-1));

  // Mode 4: Blackout
  btnToggleBlackout.addEventListener('click', () => {
    if (store.state.activeLayer === 'blackout') {
      store.setActiveLayer(store.state.previousLayer || 'time');
    } else {
      store.setActiveLayer('blackout');
    }
  });

  // Bell Alert Modal handlers
  btnAddBellRule.addEventListener('click', () => {
    modalAddBell.showModal();
  });

  btnCancelBellModal.addEventListener('click', () => {
    modalAddBell.close();
  });

  ruleInputType.addEventListener('change', () => {
    if (ruleInputType.value === 'at_zero') {
      ruleTimeGroup.style.display = 'none';
    } else {
      ruleTimeGroup.style.display = 'block';
    }
  });

  formAddBell.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = ruleInputType.value;
    const m = parseInt(ruleInputM.value) || 0;
    const s = parseInt(ruleInputS.value) || 0;
    const timeSec = type === 'at_zero' ? 0 : m * 60 + s;
    const rings = parseInt(ruleInputRings.value) || 1;
    const isLong = ruleInputLong.checked;

    store.addBellRule({ type, timeSec, rings, isLong });
    formAddBell.reset();
    modalAddBell.close();
  });

  /**
   * Helper to format digits HTML with blinking colons
   * When shouldBlink is false: colons stay constantly visible (e.g. when hours present).
   * When shouldBlink is true: colons blink in lockstep with the second tick.
   */
  function formatDigitsHTML(str, shouldBlink, isVisible) {
    const isHidden = shouldBlink && !isVisible;
    const colonClass = isHidden ? 'digit-colon colon-hidden' : 'digit-colon';
    return str
      .trim()
      .split(':')
      .map((part) => `<span>${part.trim()}</span>`)
      .join(`<span class="${colonClass}">:</span>`);
  }

  // Subscribe to store state
  store.subscribe((state) => {
    renderAdmin(state);
  });

  function renderAdmin(state) {
    if (!state) return;

    const allowHour = !!state.displaySettings?.allowHourRollover;

    // 1. Controls sync
    toggleFadeAnim.checked = !!state.fadeAnimation;
    selectFadeDuration.value = String(state.fadeDurationMs || 400);
    selectIconMode.value = state.displaySettings?.iconMode || 'side';
    if (toggleAllowHour) toggleAllowHour.checked = allowHour;

    // Requirement 1: Border distance sync & preview scale
    const borderDist = state.displaySettings?.borderDistance ?? 100;
    if (sliderBorderDistance && document.activeElement !== sliderBorderDistance) {
      sliderBorderDistance.value = String(borderDist);
    }
    if (labelBorderDistance) {
      if (borderDist === 100) labelBorderDistance.textContent = '現況預設 (100%)';
      else if (borderDist === 0) labelBorderDistance.textContent = '無邊界 (0%)';
      else labelBorderDistance.textContent = `${borderDist}%`;
    }
    const clockScale = 1.0 + (100 - borderDist) * 0.0036;
    previewScreen.style.setProperty('--clock-scale', clockScale);

    checkTime24h.checked = !!state.timeConfig.format24;
    checkTimeSeconds.checked = !!state.timeConfig.showSeconds;
    checkTimeDate.checked = !!state.timeConfig.showDate;
    selectBellSound.value = state.soundSettings.sound || 'beep';
    sliderVolume.value = state.soundSettings.volume ?? 0.8;
    updateMuteUI(state.soundSettings.muted);

    // 2. Active Layer buttons & card outlines
    const active = state.activeLayer;

    // Master Switcher Buttons: change active button to Disabled button (Requirement 2)
    activeLayerBtns.forEach((btn) => {
      const isActive = btn.dataset.layer === active;
      if (isActive) {
        btn.disabled = true;
        btn.className = 'btn btn-sm btn-disabled active-layer-btn select-none';
      } else {
        btn.disabled = false;
        btn.className = 'btn btn-sm btn-outline active-layer-btn select-none cursor-pointer';
      }
    });

    // Card Switch Display Buttons: change active button to Disabled button (Requirement 2)
    btnShowLayers.forEach((btn) => {
      const layer = btn.dataset.layer;
      const isCurrent = layer === active;
      if (isCurrent) {
        btn.disabled = true;
        btn.className = 'btn btn-sm btn-disabled select-none btn-show-layer';
      } else {
        btn.disabled = false;
        btn.className = 'btn btn-sm btn-outline btn-ghost select-none btn-show-layer cursor-pointer';
      }
    });

    [cardModeTime, cardModeCountup, cardModeCountdown, cardModeBlackout].forEach((card) => {
      if (card) {
        const isCurrent = card.dataset.layer === active;
        card.classList.toggle('is-active-layer', isCurrent);
        const liveBadge = card.querySelector('.live-indicator');
        if (liveBadge) {
          liveBadge.classList.toggle('hidden', !isCurrent);
        }
      }
    });

    const layerNames = {
      time: '目前時間',
      countup: '正計時',
      countdown: '倒數計時',
      blackout: '黑畫面'
    };
    previewActiveLabel.textContent = `舞臺目前：${layerNames[active] || active}`;

    // 3. Fade Animation duration config
    if (state.fadeAnimation) {
      previewScreen.classList.remove('no-fade');
      document.documentElement.style.setProperty('--fade-duration', `${state.fadeDurationMs || 400}ms`);
    } else {
      previewScreen.classList.add('no-fade');
    }

    // 4. Update Preview Layers
    prevLayerTime.classList.toggle('active', active === 'time');
    prevLayerCountup.classList.toggle('active', active === 'countup');
    prevLayerCountdown.classList.toggle('active', active === 'countdown');
    prevLayerBlackout.classList.toggle('active', active === 'blackout');

    const iconMode = state.displaySettings?.iconMode || 'side';
    [prevContentTime, prevContentCountup, prevContentCountdown].forEach((el) => {
      if (el) el.className = `preview-content mode-${iconMode}`;
    });

    // ------------------------------------------------------------------
    // Layer: Time
    // ------------------------------------------------------------------
    const now = new Date();
    const timeStr = TimerStore.formatTime(
      now,
      state.timeConfig.format24,
      state.timeConfig.showSeconds
    );
    // Requirement 2: If hours present, do not blink colons!
    const hasHoursInTime = timeStr.split(':').length === 3;
    const isTimeColonVisible = now.getMilliseconds() < 500;
    const shouldBlinkTime = !hasHoursInTime;

    prevDigitsTime.innerHTML = formatDigitsHTML(timeStr, shouldBlinkTime, isTimeColonVisible);
    cardDigitsTime.innerHTML = formatDigitsHTML(timeStr, shouldBlinkTime, isTimeColonVisible);

    if (state.timeConfig.showDate) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      prevSublineDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
      prevSublineDate.style.display = 'block';
    } else {
      prevSublineDate.style.display = 'none';
    }

    // ------------------------------------------------------------------
    // Layer: Count-up
    // ------------------------------------------------------------------
    const cuRunning = state.countup.status === 'running';
    const cuPaused = state.countup.status === 'paused';
    // Format HMS respecting allowHourRollover
    const cuStr = TimerStore.formatHMS(state.countup.elapsedMs, { allowHourRollover: allowHour });
    const hasHoursInCu = cuStr.split(':').length === 3;

    // Requirement 1 & 2:
    // Synchronize colon with exact second boundary (elapsedMs % 1000)
    // When hours present, colon does not blink
    const cuColonVisible = (state.countup.elapsedMs % 1000) < 500;
    const cuShouldBlink = cuRunning && !hasHoursInCu;

    prevDigitsCountup.innerHTML = formatDigitsHTML(cuStr, cuShouldBlink, cuColonVisible);
    cardDigitsCountup.innerHTML = formatDigitsHTML(cuStr, cuShouldBlink, cuColonVisible);

    // Mutual exclusive start/pause buttons
    if (cuRunning) {
      btnCountupStart.classList.add('hidden');
      btnCountupPause.classList.remove('hidden');
      statusCountup.className = 'badge badge-success badge-outline text-xs';
      statusCountup.textContent = '正計時中';
    } else {
      btnCountupStart.classList.remove('hidden');
      btnCountupPause.classList.add('hidden');
      textCountupStart.textContent = cuPaused ? '繼續計時' : '開始正計時';
      statusCountup.className = cuPaused ? 'badge badge-warning badge-outline text-xs' : 'badge badge-neutral text-xs';
      statusCountup.textContent = cuPaused ? '已暫停' : '待命';
    }

    // ------------------------------------------------------------------
    // Layer: Countdown & Overtime
    // ------------------------------------------------------------------
    const cd = state.countdown;
    const cdRunning = cd.status === 'running' || cd.status === 'overtime';
    const cdPaused = cd.status === 'paused';
    let cdStr = '';
    let cdColonVisible = true;

    if (cd.status === 'overtime') {
      const prefix = state.displaySettings?.overtimePrefix || '+';
      cdStr = `${prefix}${TimerStore.formatHMS(cd.overtimeMs, { allowHourRollover: allowHour })}`;
      cdColonVisible = (cd.overtimeMs % 1000) < 500;

      prevDigitsCountdown.classList.add('overtime');
      cardDigitsCountdown.classList.add('overtime');
      statusCountdown.className = 'badge badge-error text-xs text-white';
      statusCountdown.textContent = '超時中';
    } else {
      cdStr = TimerStore.formatHMS(cd.remainingMs, { allowHourRollover: allowHour });
      // Synchronize countdown colon with second tick boundary
      cdColonVisible = ((1000 - (cd.remainingMs % 1000)) % 1000) < 500;

      prevDigitsCountdown.classList.remove('overtime');
      cardDigitsCountdown.classList.remove('overtime');
      statusCountdown.className = cdRunning ? 'badge badge-info badge-outline text-xs' : cdPaused ? 'badge badge-warning badge-outline text-xs' : 'badge badge-neutral text-xs';
      statusCountdown.textContent = cdRunning ? '倒數中' : cdPaused ? '已暫停' : '待命';
    }

    const hasHoursInCd = cdStr.split(':').length === 3;
    const cdShouldBlink = cdRunning && !hasHoursInCd;

    prevDigitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdShouldBlink, cdColonVisible);
    cardDigitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdShouldBlink, cdColonVisible);

    // Mutual exclusive start/pause buttons
    if (cdRunning) {
      btnCountdownStart.classList.add('hidden');
      btnCountdownPause.classList.remove('hidden');
    } else {
      btnCountdownStart.classList.remove('hidden');
      btnCountdownPause.classList.add('hidden');
      textCountdownStart.textContent = cdPaused ? '繼續倒數' : '開始倒數';
    }

    // 5. Update Preview Icons Queue
    renderPreviewIcons(state, iconMode);

    // 6. Render Bell Alert Rules
    renderBellRules(state.bellRules);

    // 7. Update Blackout Button text
    textBlackoutBtn.textContent = active === 'blackout' ? '解除黑畫面 (恢復展示)' : '立即切換黑畫面';
  }

  function renderPreviewIcons(state, iconMode) {
    if (iconMode === 'none' || state.activeLayer === 'blackout') {
      [prevIconSlotTime, prevIconSlotCountup, prevIconSlotCountdown].forEach((slot) => {
        if (slot) {
          slot.innerHTML = '';
          delete slot.dataset.lastIconKey;
        }
      });
      return;
    }

    const now = Date.now();
    const activeLayer = state.activeLayer;

    const validIcons = (state.icons || []).filter(
      (i) => i.layer === activeLayer && (i.persistent || i.expiresAt > now)
    );

    let activeSlot = null;
    if (activeLayer === 'time') activeSlot = prevIconSlotTime;
    else if (activeLayer === 'countup') activeSlot = prevIconSlotCountup;
    else if (activeLayer === 'countdown') activeSlot = prevIconSlotCountdown;

    [prevIconSlotTime, prevIconSlotCountup, prevIconSlotCountdown].forEach((slot) => {
      if (slot !== activeSlot && slot) {
        slot.innerHTML = '';
        delete slot.dataset.lastIconKey;
      }
    });

    if (!activeSlot) return;

    // Only reconcile DOM if the icon list changed
    const currentKey = activeLayer + ':' + validIcons.map((i) => `${i.id}_${i.name}_${i.color}`).join('|');
    if (currentKey === activeSlot.dataset.lastIconKey) {
      return;
    }
    activeSlot.dataset.lastIconKey = currentKey;

    const existingElements = Array.from(activeSlot.querySelectorAll('.preview-icon-item:not(.leaving)'));
    const validIds = new Set(validIcons.map((i) => i.id));

    // 1. Mark expired/removed icons as .leaving
    existingElements.forEach((el) => {
      const id = el.dataset.iconId;
      if (!validIds.has(id)) {
        el.classList.add('leaving');
        setTimeout(() => {
          if (el.parentNode) {
            el.remove();
          }
        }, 220);
      }
    });

    // 2. Add new icons or keep existing in order
    validIcons.forEach((icon) => {
      let el = activeSlot.querySelector(`[data-icon-id="${icon.id}"]`);
      if (!el) {
        el = document.createElement('span');
        el.className = `preview-icon-item color-${icon.color || 'gray'} select-none`;
        el.dataset.iconId = icon.id;
        el.innerHTML = `<span class="material-symbols-rounded select-none">${icon.name}</span>`;
        activeSlot.appendChild(el);
      } else if (el.classList.contains('leaving')) {
        el.classList.remove('leaving');
      }
    });
  }

  function renderBellRules(rules) {
    bellRulesList.innerHTML = '';
    if (!rules || rules.length === 0) {
      bellRulesList.innerHTML = '<div class="text-xs text-base-content/50 py-1 select-none">尚未設定任何響鈴規則</div>';
      return;
    }

    rules.forEach((rule) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between bg-base-200 px-3 py-2 rounded text-xs select-none';

      const ruleText = TimerStore.formatRuleText(rule);

      div.innerHTML = `
        <div class="flex items-center gap-2 select-none">
          <input type="checkbox" class="toggle toggle-primary toggle-xs" ${rule.enabled ? 'checked' : ''} data-rule-toggle="${rule.id}" />
          <span class="font-medium text-white">${ruleText}</span>
        </div>
        <div class="flex items-center gap-1 select-none">
          <button class="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-white" data-rule-test="${rule.id}" title="試聽響鈴">
            <span class="material-symbols-rounded text-sm select-none">volume_up</span>
          </button>
          <button class="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/20" data-rule-delete="${rule.id}" title="刪除規則">
            <span class="material-symbols-rounded text-sm select-none">delete</span>
          </button>
        </div>
      `;

      const toggle = div.querySelector(`[data-rule-toggle="${rule.id}"]`);
      toggle.addEventListener('change', () => {
        store.toggleBellRule(rule.id, toggle.checked);
      });

      const testBtn = div.querySelector(`[data-rule-test="${rule.id}"]`);
      testBtn.addEventListener('click', () => {
        if (window.bellSynth) {
          window.bellSynth.playBell(rule.rings, store.state.soundSettings.sound, !!rule.isLong);
        }
      });

      const delBtn = div.querySelector(`[data-rule-delete="${rule.id}"]`);
      delBtn.addEventListener('click', () => {
        store.removeBellRule(rule.id);
      });

      bellRulesList.appendChild(div);
    });
  }

  // Keyboard Shortcuts Listener
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (modalAddBell.hasAttribute('open')) return;

    if (e.key === '1') {
      e.preventDefault();
      store.setActiveLayer('time');
    } else if (e.key === '2') {
      e.preventDefault();
      store.setActiveLayer('countup');
    } else if (e.key === '3') {
      e.preventDefault();
      store.setActiveLayer('countdown');
    } else if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      btnToggleBlackout.click();
    } else if (e.code === 'Space') {
      e.preventDefault();
      const active = store.state.activeLayer;
      if (active === 'countup') {
        if (store.state.countup.status === 'running') store.pauseCountup();
        else store.startCountup();
      } else if (active === 'countdown') {
        if (store.state.countdown.status === 'running' || store.state.countdown.status === 'overtime') {
          store.pauseCountdown();
        } else {
          store.startCountdown();
        }
      }
    } else if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      const active = store.state.activeLayer;
      if (active === 'countup') store.resetCountup();
      else if (active === 'countdown') store.resetCountdown();
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      btnToggleMute.click();
    }
  });

  // RAF loop for live colon blinking and clock ticker
  function adminAnimLoop() {
    renderAdmin(store.state);
    requestAnimationFrame(adminAnimLoop);
  }
  requestAnimationFrame(adminAnimLoop);

})();
