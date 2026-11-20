/**
 * TMR Presentation Display Window Script
 * Dedicated stage renderer: minimal, ultra-clean, synchronized with master admin console.
 */

(function () {
  const store = new TimerStore(false); // client mode

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

  const iconSymbolTime = document.getElementById('icon-symbol-time');
  const iconSymbolCountup = document.getElementById('icon-symbol-countup');
  const iconSymbolCountdown = document.getElementById('icon-symbol-countdown');

  const hudControls = document.getElementById('hud-controls');
  const btnFullscreen = document.getElementById('btn-fullscreen');
  const syncIndicator = document.getElementById('sync-indicator');

  let mouseTimer = null;

  // Send request for initial state
  store.broadcast('REQUEST_STATE', {});

  // Heartbeat ping to master
  setInterval(() => {
    store.broadcast('CLIENT_PING', { timestamp: Date.now() });
  }, 3000);

  // Play bell when alert triggered
  store.subscribeBell((rings, sound) => {
    if (window.bellSynth) {
      window.bellSynth.playBell(rings, sound);
    }
  });

  // Render loop driven by store subscription
  store.subscribe((state) => {
    render(state);
  });

  function render(state) {
    if (!state) return;

    // 1. Fade animation config
    if (state.fadeAnimation) {
      stageContainer.classList.remove('no-fade');
      document.documentElement.style.setProperty('--fade-duration', `${state.fadeDurationMs || 400}ms`);
    } else {
      stageContainer.classList.add('no-fade');
    }

    // 2. Icon position setting (left vs right)
    const isIconLeft = state.displaySettings?.iconPosition === 'left';
    [contentTime, contentCountup, contentCountdown].forEach((el) => {
      if (el) {
        if (isIconLeft) el.classList.add('icon-left');
        else el.classList.remove('icon-left');
      }
    });

    // 3. Active Layer Switcher
    const active = state.activeLayer;
    layerTime.classList.toggle('active', active === 'time');
    layerCountup.classList.toggle('active', active === 'countup');
    layerCountdown.classList.toggle('active', active === 'countdown');
    layerBlackout.classList.toggle('active', active === 'blackout');

    // 4. Layer (a): Current Time
    if (active === 'time' || true) {
      const now = new Date();
      const timeStr = TimerStore.formatTime(
        now,
        state.timeConfig.format24,
        state.timeConfig.showSeconds
      );
      digitsTime.textContent = timeStr;

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
    }

    // 5. Layer (b): Count-up
    digitsCountup.textContent = TimerStore.formatHMS(state.countup.elapsedMs);

    // 6. Layer (c): Countdown & Overtime
    const cd = state.countdown;
    if (cd.status === 'overtime') {
      const prefix = state.displaySettings?.overtimePrefix || '+';
      digitsCountdown.textContent = `${prefix}${TimerStore.formatHMS(cd.overtimeMs)}`;
      digitsCountdown.classList.add('overtime');
    } else {
      digitsCountdown.textContent = TimerStore.formatHMS(cd.remainingMs);
      digitsCountdown.classList.remove('overtime');
    }

    // 7. Icon State Handling
    updateIcon(state);
  }

  function updateIcon(state) {
    const iconData = state.icon;
    const now = Date.now();
    const isVisible =
      iconData &&
      iconData.name &&
      state.activeLayer !== 'blackout' &&
      (iconData.persistent || (iconData.expiresAt > 0 && now < iconData.expiresAt));

    // Determine target slot based on active layer
    let activeSlot = null;
    let activeSymbol = null;

    if (state.activeLayer === 'time') {
      activeSlot = iconTime;
      activeSymbol = iconSymbolTime;
    } else if (state.activeLayer === 'countup') {
      activeSlot = iconCountup;
      activeSymbol = iconSymbolCountup;
    } else if (state.activeLayer === 'countdown') {
      activeSlot = iconCountdown;
      activeSymbol = iconSymbolCountdown;
    }

    // Reset all slots first
    [iconTime, iconCountup, iconCountdown].forEach((slot) => {
      if (slot !== activeSlot) {
        slot.classList.remove('visible', 'color-white', 'color-green', 'color-orange', 'color-lightblue', 'color-yellow');
      }
    });

    if (isVisible && activeSlot && activeSymbol) {
      activeSymbol.textContent = iconData.name;
      activeSlot.className = 'icon-slot visible color-' + (iconData.color || 'white');
    } else if (activeSlot) {
      activeSlot.classList.remove('visible');
    }
  }

  // Real-time animation frame clock tick for millisecond accuracy
  function clockTick() {
    if (store.state.activeLayer === 'time') {
      const now = new Date();
      digitsTime.textContent = TimerStore.formatTime(
        now,
        store.state.timeConfig.format24,
        store.state.timeConfig.showSeconds
      );
    }
    requestAnimationFrame(clockTick);
  }
  requestAnimationFrame(clockTick);

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
