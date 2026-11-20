/**
 * TMR Admin Console Master Script
 * Coordinates preview rendering, state mutations, audio alerts, and UI event binding.
 */

(function () {
  const store = new TimerStore(true); // Master mode

  // DOM Elements - Header
  const connPill = document.getElementById('conn-pill');
  const connText = document.getElementById('conn-text');
  const btnToggleMute = document.getElementById('btn-toggle-mute');
  const iconMuteState = document.getElementById('icon-mute-state');
  const btnTestChime = document.getElementById('btn-test-chime');
  const btnOpenGuide = document.getElementById('btn-open-guide');

  // DOM Elements - Preview & Switcher
  const previewScreen = document.getElementById('preview-screen');
  const previewContent = document.getElementById('preview-content');
  const previewDigits = document.getElementById('preview-digits');
  const previewSubline = document.getElementById('preview-subline');
  const previewIconSlot = document.getElementById('preview-icon-slot');
  const previewIconSymbol = document.getElementById('preview-icon-symbol');
  const previewActiveLabel = document.getElementById('preview-active-label');
  const btnOpenDisplay = document.getElementById('btn-open-display');
  const layerTabs = document.querySelectorAll('.btn-layer-tab');
  const toggleFadeAnim = document.getElementById('toggle-fade-anim');
  const selectFadeDuration = document.getElementById('select-fade-duration');
  const selectIconPos = document.getElementById('select-icon-pos');

  // DOM Elements - Mode (a) Time
  const cardModeTime = document.getElementById('card-mode-time');
  const cardDigitsTime = document.getElementById('card-digits-time');
  const checkTime24h = document.getElementById('check-time-24h');
  const checkTimeSeconds = document.getElementById('check-time-seconds');
  const checkTimeDate = document.getElementById('check-time-date');
  const btnShowTime = document.getElementById('btn-show-time');

  // DOM Elements - Mode (b) Count-up
  const cardModeCountup = document.getElementById('card-mode-countup');
  const cardDigitsCountup = document.getElementById('card-digits-countup');
  const statusCountup = document.getElementById('status-countup');
  const btnCountupStart = document.getElementById('btn-countup-start');
  const btnCountupPause = document.getElementById('btn-countup-pause');
  const btnCountupReset = document.getElementById('btn-countup-reset');
  const btnShowCountup = document.getElementById('btn-show-countup');

  // DOM Elements - Mode (c) Countdown
  const cardModeCountdown = document.getElementById('card-mode-countdown');
  const cardDigitsCountdown = document.getElementById('card-digits-countdown');
  const statusCountdown = document.getElementById('status-countdown');
  const presetChips = document.querySelectorAll('.preset-chip');
  const inputCustomH = document.getElementById('input-custom-h');
  const inputCustomM = document.getElementById('input-custom-m');
  const inputCustomS = document.getElementById('input-custom-s');
  const btnApplyCustomTime = document.getElementById('btn-apply-custom-time');
  const btnCountdownStart = document.getElementById('btn-countdown-start');
  const btnCountdownPause = document.getElementById('btn-countdown-pause');
  const btnCountdownReset = document.getElementById('btn-countdown-reset');
  const btnShowCountdown = document.getElementById('btn-show-countdown');
  const btnAdjP60 = document.getElementById('btn-adj-p60');
  const btnAdjM60 = document.getElementById('btn-adj-m60');
  const btnAdjP30 = document.getElementById('btn-adj-p30');
  const btnAdjM30 = document.getElementById('btn-adj-m30');

  // Bell Alert rules & audio settings
  const bellRulesList = document.getElementById('bell-rules-list');
  const btnAddBellRule = document.getElementById('btn-add-bell-rule');
  const selectBellSound = document.getElementById('select-bell-sound');
  const sliderVolume = document.getElementById('slider-volume');

  // DOM Elements - Mode (d) Blackout
  const cardModeBlackout = document.getElementById('card-mode-blackout');
  const btnToggleBlackout = document.getElementById('btn-toggle-blackout');

  // Modals
  const modalAddBell = document.getElementById('modal-add-bell');
  const btnCloseBellModal = document.getElementById('btn-close-bell-modal');
  const btnCancelBellModal = document.getElementById('btn-cancel-bell-modal');
  const formAddBell = document.getElementById('form-add-bell');
  const ruleInputType = document.getElementById('rule-input-type');
  const ruleTimeGroup = document.getElementById('rule-time-group');
  const ruleInputM = document.getElementById('rule-input-m');
  const ruleInputS = document.getElementById('rule-input-s');
  const ruleInputRings = document.getElementById('rule-input-rings');
  const ruleInputLabel = document.getElementById('rule-input-label');

  const modalGuide = document.getElementById('modal-guide');
  const btnCloseGuideModal = document.getElementById('btn-close-guide-modal');
  const btnConfirmGuide = document.getElementById('btn-confirm-guide');

  // Client connection tracker
  let lastClientPingTime = 0;
  let displayWindowRef = null;

  // Listen for client pings on channel
  if (store.channel) {
    store.channel.addEventListener('message', (e) => {
      if (e.data && e.data.type === 'CLIENT_PING') {
        lastClientPingTime = Date.now();
        updateConnectionStatus();
      }
    });
  }

  function updateConnectionStatus() {
    const isAlive = (Date.now() - lastClientPingTime < 6000) || (displayWindowRef && !displayWindowRef.closed);
    if (isAlive) {
      connPill.classList.add('connected');
      connText.textContent = '展示視窗已連線';
    } else {
      connPill.classList.remove('connected');
      connText.textContent = '未開啟展示視窗';
    }
  }
  setInterval(updateConnectionStatus, 2000);

  // Open presentation window
  btnOpenDisplay.addEventListener('click', () => {
    // Open in separate window
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

  // Layer switching tabs
  layerTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const layer = tab.dataset.layer;
      store.setActiveLayer(layer);
    });
  });

  // Fade animation controls
  toggleFadeAnim.addEventListener('change', () => {
    store.setFadeAnimation(toggleFadeAnim.checked, parseInt(selectFadeDuration.value));
  });

  selectFadeDuration.addEventListener('change', () => {
    store.setFadeAnimation(toggleFadeAnim.checked, parseInt(selectFadeDuration.value));
  });

  // Icon position
  selectIconPos.addEventListener('change', () => {
    store.update((state) => {
      state.displaySettings.iconPosition = selectIconPos.value;
    });
  });

  // Audio settings
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
    btnToggleMute.style.color = muted ? 'var(--accent-red)' : '';
  }

  btnTestChime.addEventListener('click', () => {
    if (window.bellSynth) {
      window.bellSynth.playBell(1, store.state.soundSettings.sound);
    }
  });

  // Mode (a) Time controls
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

  // Mode (b) Count-up controls
  btnCountupStart.addEventListener('click', () => {
    store.startCountup();
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

  // Mode (c) Countdown controls
  presetChips.forEach((chip) => {
    chip.addEventListener('click', () => {
      presetChips.forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      const sec = parseInt(chip.dataset.sec);
      store.setCountdownDuration(sec);

      // sync custom inputs
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
      presetChips.forEach((c) => c.classList.remove('active'));
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

  btnShowCountdown.addEventListener('click', () => {
    store.setActiveLayer('countdown');
  });

  btnAdjP60.addEventListener('click', () => store.adjustCountdown(60));
  btnAdjM60.addEventListener('click', () => store.adjustCountdown(-60));
  btnAdjP30.addEventListener('click', () => store.adjustCountdown(30));
  btnAdjM30.addEventListener('click', () => store.adjustCountdown(-30));

  // Mode (d) Blackout
  btnToggleBlackout.addEventListener('click', () => {
    if (store.state.activeLayer === 'blackout') {
      store.setActiveLayer(store.state.previousLayer || 'time');
    } else {
      store.setActiveLayer('blackout');
    }
  });

  // Bell Alert Modal handlers
  btnAddBellRule.addEventListener('click', () => {
    modalAddBell.classList.add('open');
  });

  function closeBellModal() {
    modalAddBell.classList.remove('open');
  }

  btnCloseBellModal.addEventListener('click', closeBellModal);
  btnCancelBellModal.addEventListener('click', closeBellModal);

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
    let label = ruleInputLabel.value.trim();

    if (!label) {
      if (type === 'remaining') label = `剩餘 ${TimerStore.formatHMS(timeSec * 1000)}`;
      else if (type === 'at_zero') label = `倒數歸零 00:00`;
      else if (type === 'overtime') label = `超時 ${TimerStore.formatHMS(timeSec * 1000)}`;
    }

    store.addBellRule({ type, timeSec, rings, label });
    formAddBell.reset();
    closeBellModal();
  });

  // Guide Modal handlers
  btnOpenGuide.addEventListener('click', () => modalGuide.classList.add('open'));
  btnCloseGuideModal.addEventListener('click', () => modalGuide.classList.remove('open'));
  btnConfirmGuide.addEventListener('click', () => modalGuide.classList.remove('open'));

  // Main UI State Subscription
  store.subscribe((state) => {
    renderAdmin(state);
  });

  function renderAdmin(state) {
    if (!state) return;

    // 1. Sync controls
    toggleFadeAnim.checked = !!state.fadeAnimation;
    selectFadeDuration.value = String(state.fadeDurationMs || 400);
    selectIconPos.value = state.displaySettings?.iconPosition || 'right';
    checkTime24h.checked = !!state.timeConfig.format24;
    checkTimeSeconds.checked = !!state.timeConfig.showSeconds;
    checkTimeDate.checked = !!state.timeConfig.showDate;
    selectBellSound.value = state.soundSettings.sound || 'chime';
    sliderVolume.value = state.soundSettings.volume ?? 0.8;
    updateMuteUI(state.soundSettings.muted);

    // 2. Layer tabs & mode cards active highlights
    const active = state.activeLayer;
    layerTabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.layer === active);
    });

    [cardModeTime, cardModeCountup, cardModeCountdown, cardModeBlackout].forEach((card) => {
      if (card) {
        card.classList.toggle('is-active-layer', card.dataset.layer === active);
      }
    });

    // Layer label in preview header
    const layerNames = {
      time: '目前時間',
      countup: '正計時',
      countdown: '倒數計時',
      blackout: '黑畫面'
    };
    previewActiveLabel.textContent = `舞臺目前：${layerNames[active] || active}`;

    // 3. Preview Screen Rendering
    const isIconLeft = state.displaySettings?.iconPosition === 'left';
    if (isIconLeft) previewContent.classList.add('icon-left');
    else previewContent.classList.remove('icon-left');

    if (active === 'blackout') {
      previewScreen.classList.add('blackout-active');
      previewDigits.style.visibility = 'hidden';
      previewSubline.style.visibility = 'hidden';
      previewIconSlot.classList.remove('visible');
    } else {
      previewScreen.classList.remove('blackout-active');
      previewDigits.style.visibility = 'visible';

      if (active === 'time') {
        const now = new Date();
        previewDigits.textContent = TimerStore.formatTime(
          now,
          state.timeConfig.format24,
          state.timeConfig.showSeconds
        );
        previewDigits.classList.remove('overtime');

        if (state.timeConfig.showDate) {
          const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
          previewSubline.textContent = `${now.getMonth() + 1}月${now.getDate()}日 (週${weekdays[now.getDay()]})`;
          previewSubline.style.visibility = 'visible';
        } else {
          previewSubline.style.visibility = 'hidden';
        }
      } else if (active === 'countup') {
        previewDigits.textContent = TimerStore.formatHMS(state.countup.elapsedMs);
        previewDigits.classList.remove('overtime');
        previewSubline.style.visibility = 'hidden';
      } else if (active === 'countdown') {
        const cd = state.countdown;
        if (cd.status === 'overtime') {
          const prefix = state.displaySettings?.overtimePrefix || '+';
          previewDigits.textContent = `${prefix}${TimerStore.formatHMS(cd.overtimeMs)}`;
          previewDigits.classList.add('overtime');
        } else {
          previewDigits.textContent = TimerStore.formatHMS(cd.remainingMs);
          previewDigits.classList.remove('overtime');
        }
        previewSubline.style.visibility = 'hidden';
      }

      // Preview Icon Slot
      const iconData = state.icon;
      const now = Date.now();
      const isIconVisible =
        iconData &&
        iconData.name &&
        (iconData.persistent || (iconData.expiresAt > 0 && now < iconData.expiresAt));

      if (isIconVisible) {
        previewIconSymbol.textContent = iconData.name;
        previewIconSlot.className = `preview-icon-slot visible color-${iconData.color || 'white'}`;
      } else {
        previewIconSlot.classList.remove('visible');
      }
    }

    // 4. Update Card A (Time)
    const now = new Date();
    cardDigitsTime.textContent = TimerStore.formatTime(
      now,
      state.timeConfig.format24,
      state.timeConfig.showSeconds
    );

    // 5. Update Card B (Count-up)
    cardDigitsCountup.textContent = TimerStore.formatHMS(state.countup.elapsedMs);
    const cuStatus = state.countup.status;
    statusCountup.className = 'card-timer-status ' + (cuStatus === 'running' ? 'running' : cuStatus === 'paused' ? 'paused' : '');
    statusCountup.textContent = cuStatus === 'running' ? '正計時中' : cuStatus === 'paused' ? '已暫停' : '待命';
    btnCountupStart.innerHTML = cuStatus === 'paused'
      ? '<span class="material-symbols-rounded">play_arrow</span><span>繼續計時</span>'
      : '<span class="material-symbols-rounded">play_arrow</span><span>開始正計時</span>';

    // 6. Update Card C (Countdown)
    const cd = state.countdown;
    if (cd.status === 'overtime') {
      const prefix = state.displaySettings?.overtimePrefix || '+';
      cardDigitsCountdown.textContent = `${prefix}${TimerStore.formatHMS(cd.overtimeMs)}`;
      cardDigitsCountdown.classList.add('overtime');
      statusCountdown.className = 'card-timer-status overtime';
      statusCountdown.textContent = '已超時 (正計時中)';
    } else {
      cardDigitsCountdown.textContent = TimerStore.formatHMS(cd.remainingMs);
      cardDigitsCountdown.classList.remove('overtime');
      const cdStatus = cd.status;
      statusCountdown.className = 'card-timer-status ' + (cdStatus === 'running' ? 'running' : cdStatus === 'paused' ? 'paused' : '');
      statusCountdown.textContent = cdStatus === 'running' ? '倒數中' : cdStatus === 'paused' ? '已暫停' : '待命';
    }
    btnCountdownStart.innerHTML = cd.status === 'paused'
      ? '<span class="material-symbols-rounded">play_arrow</span><span>繼續倒數</span>'
      : '<span class="material-symbols-rounded">play_arrow</span><span>開始倒數</span>';

    // 7. Render Bell Alert Rules
    renderBellRules(state.bellRules);

    // 8. Update Card D (Blackout) button text
    btnToggleBlackout.innerHTML = active === 'blackout'
      ? '<span class="material-symbols-rounded">videocam</span><span>解除黑畫面 (恢復展示)</span>'
      : '<span class="material-symbols-rounded">videocam_off</span><span>立即切換黑畫面</span>';
  }

  function renderBellRules(rules) {
    bellRulesList.innerHTML = '';
    if (!rules || rules.length === 0) {
      bellRulesList.innerHTML = '<div style="font-size: 0.82rem; color: var(--text-muted); padding: 0.5rem 0;">尚未設定任何響鈴規則</div>';
      return;
    }

    rules.forEach((rule) => {
      const div = document.createElement('div');
      div.className = 'bell-rule-item';

      let timeText = '';
      if (rule.type === 'remaining') timeText = `剩餘 ${TimerStore.formatHMS(rule.timeSec * 1000)}`;
      else if (rule.type === 'at_zero') timeText = `歸零 00:00`;
      else if (rule.type === 'overtime') timeText = `超時 ${TimerStore.formatHMS(rule.timeSec * 1000)}`;

      div.innerHTML = `
        <div class="bell-rule-info">
          <label class="switch" style="width: 34px; height: 18px;">
            <input type="checkbox" ${rule.enabled ? 'checked' : ''} data-rule-toggle="${rule.id}">
            <span class="slider" style="border-radius: 18px;"></span>
          </label>
          <span style="font-weight: 500;">${rule.label || timeText}</span>
          <span class="bell-rule-ring-count">響 ${rule.rings} 聲</span>
        </div>
        <div class="bell-rule-actions">
          <button class="btn btn-sm btn-icon-only" data-rule-test="${rule.id}" title="試聽此規則響鈴">
            <span class="material-symbols-rounded" style="font-size: 1.1rem;">volume_up</span>
          </button>
          <button class="btn btn-sm btn-icon-only" data-rule-delete="${rule.id}" title="刪除此規則" style="color: #f87171;">
            <span class="material-symbols-rounded" style="font-size: 1.1rem;">delete</span>
          </button>
        </div>
      `;

      // Event listeners on dynamic item
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
    // If inside an input field or modal, ignore shortcuts
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    if (modalAddBell.classList.contains('open') || modalGuide.classList.contains('open')) return;

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

  // RAF ticker to update time digits
  function adminTick() {
    if (store.state.activeLayer === 'time') {
      const now = new Date();
      cardDigitsTime.textContent = TimerStore.formatTime(
        now,
        store.state.timeConfig.format24,
        store.state.timeConfig.showSeconds
      );
      if (!previewScreen.classList.contains('blackout-active')) {
        previewDigits.textContent = cardDigitsTime.textContent;
      }
    }
    requestAnimationFrame(adminTick);
  }
  requestAnimationFrame(adminTick);

})();
