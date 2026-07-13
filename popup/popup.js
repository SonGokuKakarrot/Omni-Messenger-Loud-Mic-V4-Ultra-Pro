(() => {
  const EXT = globalThis.browser ?? globalThis.chrome;
  if (!EXT?.runtime || !EXT?.storage?.local) return;

  const PRESETS = {
    royal: {
      name: 'Royal Clear',
      description: 'Balanced & clean',
      config: {
        profileVersion: 9,
        enabled: true,
        gainDb: 65.0,
        thresholdDb: -50,
        knee: 15,
        ratio: 8,
        attack: 0.0005,
        release: 0.04,
        lowShelfDb: 8,
        presenceDb: 12,
        highShelfDb: 10,
        presencePeakDb: 8,
        presencePeakFreq: 5000,
        presencePeakQ: 1.5,
        limiterDb: -1.5,
        drive: 0.8,
        loudness: 1.0,
        saturationCurveIntensity: 0.8,
        maxBoost: 50000,
        sustain: true,
        sustainTargetDb: 5,
        sustainMaxGain: 80,
        forceRawMic: true,
        reverbEnabled: false,
        reverbDelay: 0.02,
        reverbFeedback: 0.2,
        reverbWet: 0.1,
        keepAlive: true,
        keepAliveGain: 0.0008,
        senderRefreshMs: 300
      }
    },
    lord: {
      name: 'Lord V4',
      description: 'Extreme volume',
      config: {
        profileVersion: 9,
        enabled: true,
        gainDb: 100.0,
        thresholdDb: -65,
        knee: 18,
        ratio: 18,
        attack: 0.00008,
        release: 0.028,
        lowShelfDb: 16,
        presenceDb: 28,
        highShelfDb: 20,
        presencePeakDb: 24,
        presencePeakFreq: 5000,
        presencePeakQ: 2.0,
        limiterDb: -0.5,
        drive: 2.2,
        loudness: 1.15,
        saturationCurveIntensity: 1.8,
        maxBoost: 150000,
        sustain: true,
        sustainTargetDb: 7,
        sustainMaxGain: 140,
        forceRawMic: true,
        reverbEnabled: true,
        reverbDelay: 0.05,
        reverbFeedback: 0.4,
        reverbWet: 0.2,
        keepAlive: true,
        keepAliveGain: 0.0015,
        senderRefreshMs: 200
      }
    },
    ultraQuetta: {
      name: 'Ultra Quetta MAX',
      description: 'Loudest call mode - browser max',
      config: {
        profileVersion: 9,
        enabled: true,
        gainDb: 140.0,
        thresholdDb: -88,
        knee: 28,
        ratio: 20,
        attack: 0.00002,
        release: 0.012,
        lowShelfDb: 30,
        presenceDb: 50,
        highShelfDb: 38,
        presencePeakDb: 48,
        presencePeakFreq: 4800,
        presencePeakQ: 3.4,
        limiterDb: 1.8,
        drive: 7.0,
        loudness: 1.8,
        saturationCurveIntensity: 5.2,
        maxBoost: 500000,
        sustain: true,
        sustainTargetDb: 12,
        sustainMaxGain: 300,
        forceRawMic: true,
        reverbEnabled: true,
        reverbDelay: 0.09,
        reverbFeedback: 0.62,
        reverbWet: 0.42,
        keepAlive: true,
        keepAliveGain: 0.004,
        senderRefreshMs: 250
      }
    }
  };

  const HAS_PROMISE_API = typeof globalThis.browser !== 'undefined' && EXT === globalThis.browser;
  let currentPreset = 'royal';

  function storageSet(key, value) {
    if (HAS_PROMISE_API) return EXT.storage.local.set({ [key]: value });
    return new Promise((resolve) => {
      try {
        EXT.storage.local.set({ [key]: value }, () => resolve());
      } catch (_) {
        resolve();
      }
    });
  }

  function storageGet(key) {
    if (HAS_PROMISE_API) return EXT.storage.local.get(key);
    return new Promise((resolve) => {
      try {
        EXT.storage.local.get(key, (res) => {
          if (EXT.runtime?.lastError) resolve({});
          else resolve(res || {});
        });
      } catch (_) {
        resolve({});
      }
    });
  }

  async function applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) return;
    
    currentPreset = presetName;
    const config = { ...preset.config };
    
    await storageSet('micMaximizerConfig', config);
    
    // Update UI
    updatePresetButtons(presetName);
    updateControlsFromConfig(config);
    
    console.log(`[Omni] Applied preset: ${preset.name}`);
  }

  function updatePresetButtons(active) {
    document.querySelectorAll('.preset').forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    const activeBtn = document.querySelector(`.preset.${active}`);
    if (activeBtn) {
      activeBtn.classList.add('active');
      activeBtn.setAttribute('aria-pressed', 'true');
    }
    document.body.dataset.theme = active;
  }

  function clearPresetButtons() {
    document.querySelectorAll('.preset').forEach((btn) => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    delete document.body.dataset.theme;
    currentPreset = 'custom';
  }

  function valuesMatch(expected, actual) {
    if (typeof expected === 'number') {
      return Math.abs(Number(actual) - expected) < 0.000001;
    }
    return expected === actual;
  }

  function getMatchingPreset(config) {
    return Object.entries(PRESETS).find(([, preset]) => (
      Object.entries(preset.config).every(([key, value]) => valuesMatch(value, config[key]))
    ))?.[0] || null;
  }

  function syncPresetSelection(config) {
    const matchedPreset = getMatchingPreset(config);
    if (matchedPreset) {
      currentPreset = matchedPreset;
      updatePresetButtons(matchedPreset);
    } else {
      clearPresetButtons();
    }
  }

  function updateControlsFromConfig(config) {
    // Update all control sliders to match preset
    const controls = [
      'gainDb', 'thresholdDb', 'knee', 'ratio', 'attack', 'release',
      'lowShelfDb', 'presenceDb', 'presencePeakDb', 'presencePeakFreq', 
      'presencePeakQ', 'highShelfDb', 'limiterDb', 'drive', 'loudness',
      'saturationCurveIntensity', 'sustainTargetDb', 'sustainMaxGain',
      'keepAliveGain', 'maxBoost', 'reverbDelay', 'reverbFeedback', 'reverbWet',
      'senderRefreshMs'
    ];

    controls.forEach((controlId) => {
      const input = document.getElementById(controlId);
      const output = document.getElementById(`${controlId}Val`);
      if (input && config[controlId] !== undefined) {
        input.value = config[controlId];
        if (output) output.textContent = formatOutput(controlId, config[controlId]);
      }
    });

    // Update checkboxes
    const checkboxes = ['enabled', 'sustain', 'forceRawMic', 'reverbEnabled', 'keepAlive'];
    checkboxes.forEach((checkId) => {
      const checkbox = document.getElementById(checkId);
      if (checkbox && config[checkId] !== undefined) {
        checkbox.checked = Boolean(config[checkId]);
      }
    });
  }

  function formatOutput(controlId, value) {
    if (controlId === 'senderRefreshMs') return `${Math.round(value)} ms`;
    if (controlId.includes('Freq')) return `${Math.round(value)} Hz`;
    if (controlId.includes('Q')) return value.toFixed(2);
    if (controlId === 'keepAliveGain') return value.toFixed(5);
    if (controlId === 'sustainMaxGain') return `${Math.round(value)}x`;
    if (controlId.includes('Gain') || controlId.includes('Db')) return `${value.toFixed(1)} dB`;
    if (controlId.includes('Bitrate')) return `${Math.round(value / 1000)} kbps`;
    if (controlId === 'maxBoost') return `${Math.round(value).toLocaleString()}x`;
    return value.toFixed(value < 1 ? 4 : 2);
  }

  async function onControlInput(id, el) {
    const config = await loadConfig();
    const value = parseFloat(el.value);
    config[id] = value;
    
    const output = document.getElementById(`${id}Val`);
    if (output) output.textContent = formatOutput(id, value);
    
    await storageSet('micMaximizerConfig', config);
    syncPresetSelection(config);
    console.log(`[Omni] Updated ${id}: ${value}`);
  }

  async function onCheckboxChange(id, el) {
    const config = await loadConfig();
    config[id] = el.checked;
    await storageSet('micMaximizerConfig', config);
    syncPresetSelection(config);
    console.log(`[Omni] Updated ${id}: ${el.checked}`);
  }

  async function init() {
    // Load current config
    const config = await loadConfig();
    updateControlsFromConfig(config);
    syncPresetSelection(config);
    
    // Setup preset buttons
    document.querySelectorAll('.preset').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const presetName = btn.classList.contains('royal') ? 'royal'
          : btn.classList.contains('lord') ? 'lord'
          : 'ultraQuetta';
        await applyPreset(presetName);
      });
    });

    // Setup control inputs
    const controls = [
      'gainDb', 'thresholdDb', 'knee', 'ratio', 'attack', 'release',
      'lowShelfDb', 'presenceDb', 'presencePeakDb', 'presencePeakFreq',
      'presencePeakQ', 'highShelfDb', 'limiterDb', 'drive', 'loudness',
      'saturationCurveIntensity', 'sustainTargetDb', 'sustainMaxGain',
      'keepAliveGain', 'maxBoost', 'reverbDelay', 'reverbFeedback', 'reverbWet',
      'senderRefreshMs'
    ];

    controls.forEach((controlId) => {
      const input = document.getElementById(controlId);
      if (input) input.addEventListener('input', (e) => onControlInput(controlId, e.target));
    });

    // Setup checkboxes
    const checkboxes = ['enabled', 'sustain', 'forceRawMic', 'reverbEnabled', 'keepAlive'];
    checkboxes.forEach((checkId) => {
      const checkbox = document.getElementById(checkId);
      if (checkbox) checkbox.addEventListener('change', (e) => onCheckboxChange(checkId, e.target));
    });

    await refreshHookStatus();
  }

  async function refreshHookStatus() {
    const status = document.querySelector('.status');
    if (!status) return;
    
    try {
      const response = await EXT.runtime.sendMessage({ type: 'MICMAX_STATUS_REQUEST' });
      if (response?.ok) {
        status.textContent = '✅ Hook Active | Current Facebook, Messenger, or Instagram tab is injected';
        status.classList.remove('warn');
        status.classList.add('ok');
      } else if (response?.reason === 'not_target_page') {
        status.textContent = '⚠️ Not active here. Open a Facebook, Messenger, or Instagram tab.';
        status.classList.remove('ok');
        status.classList.add('warn');
      } else {
        status.textContent = '⚠️ Waiting for this call page hook to load...';
        status.classList.remove('ok');
        status.classList.add('warn');
      }
    } catch (_) {
      status.textContent = '⚠️ Open Messenger/Instagram call to activate';
      status.classList.remove('ok');
      status.classList.add('warn');
    }
  }

  async function loadConfig() {
    try {
      const res = await storageGet('micMaximizerConfig');
      return res.micMaximizerConfig || PRESETS.royal.config;
    } catch (_) {
      return PRESETS.royal.config;
    }
  }

  // Initialize on load
  document.addEventListener('DOMContentLoaded', init);
  
  // Periodic status refresh
  setInterval(refreshHookStatus, 3000);

  console.log('[Omni Messenger Lord V4 ULTRA] popup loaded');
})();
