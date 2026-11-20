/**
 * TMR Admin Console Master Script (v3.1)
 * Powered by DaisyUI + Tailwind CSS, with real-time multi-layer preview crossfade.
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

  const prevIconTime = document.getElementById('prev-icon-time');
  const prevIconCountup = document.getElementById('prev-icon-countup');
  const prevIconCountdown = document.getElementById('prev-icon-countdown');

  const prevSymbolTime = document.getElementById('prev-symbol-time');
  const prevSymbolCountup = document.getElementById('prev-symbol-countup');
  const prevSymbolCountdown = document.getElementById('prev-symbol-countdown');

  const previewActiveLabel = document.getElementById('preview-active-label');
  const btnOpenDisplay = document.getElementById('btn-open-display');
  const activeLayerBtns = document.querySelectorAll('.active-layer-btn');
  const toggleFadeAnim = document.getElementById('toggle-fade-anim');
  const selectFadeDuration = document.getElementById('select-fade-duration');
  const selectIconMode = document.getElementById('select-icon-mode');

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
  const btnAdjP60 = document.getElementById('btn-adj-p60');
  const btnAdjM60 = document.getElementById('btn-adj-m60');
  const btnAdjP30 = document.getElementById('btn-adj-p30');
  const btnAdjM30 = document.getElementById('btn-adj-m30');

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

  // Track connected display windows
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
      connBadge.className = 'badge badge-outline border-success/40 text-success gap-1.5 py-3 px-3 text-xs font-medium';
      connText.textContent = '展示視窗已連線';
    } else {
      connDot.className = 'w-2 h-2 rounded-full bg-gray-500';
      connBadge.className = 'badge badge-outline gap-1.5 py-3 px-3 text-xs font-medium';
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

  // Layer switching buttons
  activeLayerBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const layer = btn.dataset.layer;
      store.setActiveLayer(layer);
    });
  });

  // Transition settings
  toggleFadeAnim.addEventListener('change', () => {
    store.setFadeAnimation(toggleFadeAnim.checked, parseInt(selectFadeDuration.value));
  });

  selectFadeDuration.addEventListener('change', () => {
    store.setFadeAnimation(toggleFadeAnim.checked, parseInt(selectFadeDuration.value));
  });

  // Icon display mode
  selectIconMode.addEventListener('change', () => {
    store.update((state) => {
      state.displaySettings.iconMode = selectIconMode.value;
    });
  });

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

  btnShowTime.addEventListener('click', () => {
    store.setActiveLayer('time');
  });

  // Mode 2: Count-up (Requirement 4: Auto-switch layer on start, mutually exclusive start/pause)
  btnCountupStart.addEventListener('click', () => {
    store.startCountup(); // automatically switches layer to countup
  });

  btnCountupPause.addEventListener('click', () => {
    store.pauseCountup();
  });

  btnCountupReset.addEventListener('click', () => {
    store.resetCountup();
  });

  btnShowCountup.addEventListener('click', () => {
    store.setActiveLayer('countup');
  });

  // Mode 3: Countdown (Requirement 4: Auto-switch layer on start, mutually exclusive start/pause)
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
    store.startCountdown(); // automatically switches layer to countdown
  });

  btnCountdownPause.addEventListener('click', () => {
    store.pauseCountdown();
  });

  btnCountdownReset.addEventListener('click', () => {
    store.resetCountdown();
  });

  btnShowCountdown.addEventListener('click', () => {
    store.setActiveLayer('countdown');
  });

  btnAdjP60.addEventListener('click', () => store.adjustCountdown(60));
  btnAdjM60.addEventListener('click', () => store.adjustCountdown(-60));
  btnAdjP30.addEventListener('click', () => store.adjustCountdown(30));
  btnAdjM30.addEventListener('click', () => store.adjustCountdown(-30));

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

    store.addBellRule({ type, timeSec, rings });
    formAddBell.reset();
    modalAddBell.close();
  });

  /**
   * Helper to format digits HTML with blinking colon
   */
  function formatDigitsHTML(str, shouldBlink, isVisible) {
    const colonClass = shouldBlink && !isVisible ? 'digit-colon colon-hidden' : 'digit-colon';
    return str.split(':').map((part) => `<span>${part}</span>`).join(`<span class="${colonClass}">:</span>`);
  }

  // Subscribe to store state
  store.subscribe((state) => {
    renderAdmin(state);
  });

  function renderAdmin(state) {
    if (!state) return;

    // 1. Controls sync
    toggleFadeAnim.checked = !!state.fadeAnimation;
    selectFadeDuration.value = String(state.fadeDurationMs || 400);
    selectIconMode.value = state.displaySettings?.iconMode || 'side';
    checkTime24h.checked = !!state.timeConfig.format24;
    checkTimeSeconds.checked = !!state.timeConfig.showSeconds;
    checkTimeDate.checked = !!state.timeConfig.showDate;
    selectBellSound.value = state.soundSettings.sound || 'beep';
    sliderVolume.value = state.soundSettings.volume ?? 0.8;
    updateMuteUI(state.soundSettings.muted);

    // 2. Active Layer buttons & card outlines
    const active = state.activeLayer;
    activeLayerBtns.forEach((btn) => {
      const isActive = btn.dataset.layer === active;
      if (isActive) {
        btn.className = 'btn btn-sm btn-primary active-layer-btn';
      } else {
        btn.className = 'btn btn-sm btn-outline active-layer-btn';
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

    // 4. Update Preview Layers (Real crossfade animation)
    prevLayerTime.classList.toggle('active', active === 'time');
    prevLayerCountup.classList.toggle('active', active === 'countup');
    prevLayerCountdown.classList.toggle('active', active === 'countdown');
    prevLayerBlackout.classList.toggle('active', active === 'blackout');

    const iconMode = state.displaySettings?.iconMode || 'side';
    [prevContentTime, prevContentCountup, prevContentCountdown].forEach((el) => {
      if (el) el.className = `preview-content mode-${iconMode}`;
    });

    // Colon blink phase (500ms on / 500ms off)
    const isColonPhaseVisible = Date.now() % 1000 < 500;

    // Preview Layer: Time
    const now = new Date();
    const timeStr = TimerStore.formatTime(
      now,
      state.timeConfig.format24,
      state.timeConfig.showSeconds
    );
    prevDigitsTime.innerHTML = formatDigitsHTML(timeStr, true, isColonPhaseVisible);
    cardDigitsTime.innerHTML = formatDigitsHTML(timeStr, true, isColonPhaseVisible);

    if (state.timeConfig.showDate) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      prevSublineDate.textContent = `${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
      prevSublineDate.style.display = 'block';
    } else {
      prevSublineDate.style.display = 'none';
    }

    // Preview Layer: Count-up
    const cuRunning = state.countup.status === 'running';
    const cuStr = TimerStore.formatHMS(state.countup.elapsedMs);
    prevDigitsCountup.innerHTML = formatDigitsHTML(cuStr, cuRunning, isColonPhaseVisible);
    cardDigitsCountup.innerHTML = formatDigitsHTML(cuStr, cuRunning, isColonPhaseVisible);

    // Requirement 4: Count-up Start / Pause mutually exclusive
    if (cuRunning) {
      btnCountupStart.classList.add('hidden');
      btnCountupPause.classList.remove('hidden');
      statusCountup.className = 'badge badge-success badge-outline text-xs';
      statusCountup.textContent = '正計時中';
    } else {
      btnCountupStart.classList.remove('hidden');
      btnCountupPause.classList.add('hidden');
      const isPaused = state.countup.status === 'paused';
      textCountupStart.textContent = isPaused ? '繼續計時' : '開始正計時';
      statusCountup.className = isPaused ? 'badge badge-warning badge-outline text-xs' : 'badge badge-neutral text-xs';
      statusCountup.textContent = isPaused ? '已暫停' : '待命';
    }

    // Preview Layer: Countdown & Overtime
    const cd = state.countdown;
    const cdRunning = cd.status === 'running' || cd.status === 'overtime';
    if (cd.status === 'overtime') {
      const prefix = state.displaySettings?.overtimePrefix || '+';
      const cdStr = `${prefix}${TimerStore.formatHMS(cd.overtimeMs)}`;
      prevDigitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdRunning, isColonPhaseVisible);
      cardDigitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdRunning, isColonPhaseVisible);
      prevDigitsCountdown.classList.add('overtime');
      cardDigitsCountdown.classList.add('overtime');
      statusCountdown.className = 'badge badge-error text-xs text-white';
      statusCountdown.textContent = '超時中';
    } else {
      const cdStr = TimerStore.formatHMS(cd.remainingMs);
      prevDigitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdRunning, isColonPhaseVisible);
      cardDigitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdRunning, isColonPhaseVisible);
      prevDigitsCountdown.classList.remove('overtime');
      cardDigitsCountdown.classList.remove('overtime');
      const isPaused = cd.status === 'paused';
      statusCountdown.className = cdRunning ? 'badge badge-info badge-outline text-xs' : isPaused ? 'badge badge-warning badge-outline text-xs' : 'badge badge-neutral text-xs';
      statusCountdown.textContent = cdRunning ? '倒數中' : isPaused ? '已暫停' : '待命';
    }

    // Requirement 4: Countdown Start / Pause mutually exclusive
    if (cdRunning) {
      btnCountdownStart.classList.add('hidden');
      btnCountdownPause.classList.remove('hidden');
    } else {
      btnCountdownStart.classList.remove('hidden');
      btnCountdownPause.classList.add('hidden');
      textCountdownStart.textContent = cd.status === 'paused' ? '繼續倒數' : '開始倒數';
    }

    // 5. Update Preview Icons
    updatePreviewIcons(state, iconMode);

    // 6. Render Bell Alert Rules (Only "何時響幾次", no remarks)
    renderBellRules(state.bellRules);

    // 7. Update Blackout Button text
    textBlackoutBtn.textContent = active === 'blackout' ? '解除黑畫面 (恢復展示)' : '立即切換黑畫面';
  }

  function updatePreviewIcons(state, iconMode) {
    if (iconMode === 'none') {
      [prevIconTime, prevIconCountup, prevIconCountdown].forEach((slot) => {
        if (slot) slot.classList.remove('visible');
      });
      return;
    }

    const iconData = state.icon;
    const now = Date.now();
    const isVisible =
      iconData &&
      iconData.name &&
      state.activeLayer !== 'blackout' &&
      (iconData.persistent || (iconData.expiresAt > 0 && now < iconData.expiresAt));

    let activeSlot = null;
    let activeSymbol = null;

    if (state.activeLayer === 'time') {
      activeSlot = prevIconTime;
      activeSymbol = prevSymbolTime;
    } else if (state.activeLayer === 'countup') {
      activeSlot = prevIconCountup;
      activeSymbol = prevSymbolCountup;
    } else if (state.activeLayer === 'countdown') {
      activeSlot = prevIconCountdown;
      activeSymbol = prevSymbolCountdown;
    }

    [prevIconTime, prevIconCountup, prevIconCountdown].forEach((slot) => {
      if (slot !== activeSlot && slot) {
        slot.classList.remove('visible', 'color-gray', 'color-green', 'color-orange', 'color-lightblue', 'color-yellow');
      }
    });

    if (isVisible && activeSlot && activeSymbol) {
      activeSymbol.textContent = iconData.name;
      activeSlot.className = `preview-icon visible color-${iconData.color || 'gray'}`;
    } else if (activeSlot) {
      activeSlot.classList.remove('visible');
    }
  }

  function renderBellRules(rules) {
    bellRulesList.innerHTML = '';
    if (!rules || rules.length === 0) {
      bellRulesList.innerHTML = '<div class="text-xs text-base-content/50 py-1">尚未設定任何響鈴規則</div>';
      return;
    }

    rules.forEach((rule) => {
      const div = document.createElement('div');
      div.className = 'flex items-center justify-between bg-base-200 px-3 py-2 rounded text-xs';

      const ruleText = TimerStore.formatRuleText(rule);

      div.innerHTML = `
        <div class="flex items-center gap-2">
          <input type="checkbox" class="toggle toggle-primary toggle-xs" ${rule.enabled ? 'checked' : ''} data-rule-toggle="${rule.id}" />
          <span class="font-medium text-white">${ruleText}</span>
        </div>
        <div class="flex items-center gap-1">
          <button class="btn btn-ghost btn-circle btn-xs text-base-content/70 hover:text-white" data-rule-test="${rule.id}" title="試聽響鈴">
            <span class="material-symbols-rounded text-sm">volume_up</span>
          </button>
          <button class="btn btn-ghost btn-circle btn-xs text-error hover:bg-error/20" data-rule-delete="${rule.id}" title="刪除規則">
            <span class="material-symbols-rounded text-sm">delete</span>
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
          window.bellSynth.playBell(rule.rings, store.state.soundSettings.sound);
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
