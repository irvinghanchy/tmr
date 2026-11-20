/**
 * TMR Presentation Display Window Script (v3.2)
 * Features multi-icon stacking and smooth queue reflow.
 */

(function () {
  const store = new TimerStore(false); // Client mode

  // Elements
  const stageContainer = document.getElementById('stage-container');
  const layerTime = document.getElementById('layer-time');
  const layerCountup = document.getElementById('layer-countup');
  const layerCountdown = document.getElementById('layer-countdown');
  const layerBlackout = document.getElementById('layer-blackout');

  const contentTime = document.getElementById('content-time');
  const contentCountup = document.getElementById('content-countup');
  const contentCountdown = document.getElementById('content-countdown');

  const digitsTime = document.getElementById('digits-time');
  const sublineDate = document.getElementById('subline-date');
  const digitsCountup = document.getElementById('digits-countup');
  const digitsCountdown = document.getElementById('digits-countdown');

  const iconTime = document.getElementById('icon-time');
  const iconCountup = document.getElementById('icon-countup');
  const iconCountdown = document.getElementById('icon-countdown');

  const hudControls = document.getElementById('hud-controls');
  const btnFullscreen = document.getElementById('btn-fullscreen');

  let mouseTimer = null;

  // Ask master for initial state
  store.broadcast('REQUEST_STATE', {});

  // Heartbeat ping to master
  setInterval(() => {
    store.broadcast('CLIENT_PING', { timestamp: Date.now() });
  }, 2500);

  // Play bell when alert triggered
  store.subscribeBell((rings, sound, isLong) => {
    if (window.bellSynth) {
      window.bellSynth.playBell(rings, sound, isLong);
    }
  });

  // Render loop driven by store subscription
  store.subscribe((state) => {
    render(state);
  });

  /**
   * Format digits HTML with blinking colons (strictly trimmed, zero trailing space)
   */
  function formatDigitsHTML(str, shouldBlink, isVisible) {
    const colonClass = shouldBlink && !isVisible ? 'digit-colon colon-hidden' : 'digit-colon';
    return str
      .trim()
      .split(':')
      .map((part) => `<span>${part.trim()}</span>`)
      .join(`<span class="${colonClass}">:</span>`);
  }

  function render(state) {
    if (!state) return;

    // 1. Fade animation config
    if (state.fadeAnimation) {
      stageContainer.classList.remove('no-fade');
      document.documentElement.style.setProperty('--fade-duration', `${state.fadeDurationMs || 400}ms`);
    } else {
      stageContainer.classList.add('no-fade');
    }

    // 2. Icon display mode: 'side' | 'bottom' | 'none'
    const iconMode = state.displaySettings?.iconMode || 'side';
    [contentTime, contentCountup, contentCountdown].forEach((el) => {
      if (el) {
        el.className = `clock-content mode-${iconMode}`;
      }
    });

    // 3. Active Layer Switcher (Pure opacity transition)
    const active = state.activeLayer;
    layerTime.classList.toggle('active', active === 'time');
    layerCountup.classList.toggle('active', active === 'countup');
    layerCountdown.classList.toggle('active', active === 'countdown');
    layerBlackout.classList.toggle('active', active === 'blackout');

    // Colon blink clock phase (500ms on / 500ms off)
    const isColonPhaseVisible = Date.now() % 1000 < 500;

    // 4. Layer: Current Time
    const now = new Date();
    const timeStr = TimerStore.formatTime(
      now,
      state.timeConfig.format24,
      state.timeConfig.showSeconds
    );
    digitsTime.innerHTML = formatDigitsHTML(timeStr, true, isColonPhaseVisible);

    if (state.timeConfig.showDate) {
      const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const weekday = weekdays[now.getDay()];
      sublineDate.textContent = `${year}年${month}月${day}日 星期${weekday}`;
      sublineDate.style.display = 'block';
    } else {
      sublineDate.style.display = 'none';
    }

    // 5. Layer: Count-up
    const cuRunning = state.countup.status === 'running';
    const cuStr = TimerStore.formatHMS(state.countup.elapsedMs);
    digitsCountup.innerHTML = formatDigitsHTML(cuStr, cuRunning, isColonPhaseVisible);

    // 6. Layer: Countdown & Overtime
    const cd = state.countdown;
    const cdRunning = cd.status === 'running' || cd.status === 'overtime';
    if (cd.status === 'overtime') {
      const prefix = state.displaySettings?.overtimePrefix || '+';
      const cdStr = `${prefix}${TimerStore.formatHMS(cd.overtimeMs)}`;
      digitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdRunning, isColonPhaseVisible);
      digitsCountdown.classList.add('overtime');
    } else {
      const cdStr = TimerStore.formatHMS(cd.remainingMs);
      digitsCountdown.innerHTML = formatDigitsHTML(cdStr, cdRunning, isColonPhaseVisible);
      digitsCountdown.classList.remove('overtime');
    }

    // 7. Multi-Icon Queue Handling (Requirement 11)
    renderIcons(state, iconMode);
  }

  function renderIcons(state, iconMode) {
    if (iconMode === 'none' || state.activeLayer === 'blackout') {
      [iconTime, iconCountup, iconCountdown].forEach((slot) => {
        if (slot) slot.innerHTML = '';
      });
      return;
    }

    const now = Date.now();
    const activeLayer = state.activeLayer;

    // Filter icons for active layer only (prevents paused leak from other layer)
    const validIcons = (state.icons || []).filter(
      (i) => i.layer === activeLayer && (i.persistent || i.expiresAt > now)
    );

    let activeSlot = null;
    if (activeLayer === 'time') activeSlot = iconTime;
    else if (activeLayer === 'countup') activeSlot = iconCountup;
    else if (activeLayer === 'countdown') activeSlot = iconCountdown;

    // Clear inactive slots
    [iconTime, iconCountup, iconCountdown].forEach((slot) => {
      if (slot !== activeSlot && slot) slot.innerHTML = '';
    });

    if (!activeSlot) return;

    // Render HTML for stacked icons
    const html = validIcons
      .map(
        (i) =>
          `<span class="icon-item color-${i.color || 'gray'} select-none" data-icon-id="${i.id}"><span class="material-symbols-rounded select-none">${i.name}</span></span>`
      )
      .join('');

    activeSlot.innerHTML = html;
  }

  // Animation frame loop for continuous sub-second accuracy & colon blinking
  function animLoop() {
    render(store.state);
    requestAnimationFrame(animLoop);
  }
  requestAnimationFrame(animLoop);

  // HUD mouse hover controls
  window.addEventListener('mousemove', () => {
    hudControls.classList.add('show');
    clearTimeout(mouseTimer);
    mouseTimer = setTimeout(() => {
      hudControls.classList.remove('show');
    }, 2400);
  });

  // Fullscreen support
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request blocked:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  if (btnFullscreen) {
    btnFullscreen.addEventListener('click', toggleFullscreen);
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  });

})();
