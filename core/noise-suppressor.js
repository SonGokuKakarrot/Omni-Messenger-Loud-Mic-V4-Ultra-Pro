// Advanced Noise Suppression Module for Omni Messenger
// Integrates spectral subtraction, voice activity detection, and adaptive noise gating
// Seamlessly works with the main audio processing pipeline

class NoiseSuppressor {
  constructor(audioContext, analyser, sampleRate = 48000) {
    this.ctx = audioContext;
    this.analyser = analyser;
    this.sampleRate = sampleRate;

    // Voice Activity Detection (VAD) parameters
    this.voiceThresholdDb = -35;
    this.noiseFloorDb = -70;
    this.voiceConfidence = 0;
    this.smoothingFactor = 0.15;

    // Noise gate parameters - optimized for real-time performance
    this.gateThreshold = -45;
    this.gateAttack = 0.005;      // 5ms attack
    this.gateRelease = 0.1;       // 100ms release
    this.gateGain = 1.0;
    this.gateHistory = [];
    this.gateHistorySize = 5;

    // Spectral characteristics for voice detection (human speech ranges)
    this.voiceFreqRanges = [
      { min: 300, max: 1000, weight: 0.4 },   // Fundamental frequency
      { min: 1000, max: 4000, weight: 0.5 },  // Formants (most important)
      { min: 4000, max: 8000, weight: 0.1 }   // High-frequency detail
    ];

    // Adaptive noise profiling
    this.noiseProfile = null;
    this.noiseEstimate = new Uint8Array(128);
    this.calibrationCount = 0;
    this.calibrationTarget = 30;  // Calibrate with 30 frames of silence
    this.adaptationRate = 0.02;   // Slow noise profile adaptation

    // Performance optimization
    this.frequencyBinCache = null;
    this.lastProcessTime = 0;
  }

  /**
   * Calibrate noise profile from initial silent frames
   * Learns the background noise characteristics
   */
  calibrateNoiseProfile(frequencyData) {
    if (this.calibrationCount < this.calibrationTarget) {
      if (!this.noiseProfile) {
        this.noiseProfile = new Uint8Array(frequencyData.length);
      }

      // Conservative noise profile update
      for (let i = 0; i < frequencyData.length; i++) {
        this.noiseProfile[i] = Math.max(
          this.noiseProfile[i],
          frequencyData[i] * 0.9
        );
      }
      this.calibrationCount++;
      return this.calibrationCount >= this.calibrationTarget;
    }
    return true;
  }

  /**
   * Adaptive noise profile update - tracks changing background noise
   * Only updates when confidence in voice is low
   */
  adaptNoiseProfile(frequencyData, voiceConfidence) {
    if (!this.noiseProfile || voiceConfidence > 0.3) return;

    // Slow adaptive update when no voice detected
    for (let i = 0; i < frequencyData.length; i++) {
      this.noiseProfile[i] = Math.round(
        this.noiseProfile[i] * (1 - this.adaptationRate) +
        frequencyData[i] * this.adaptationRate
      );
    }
  }

  /**
   * Detect voice activity using spectral analysis
   * Analyzes energy distribution across voice-specific frequency ranges
   */
  detectVoiceActivity(frequencyData) {
    if (!frequencyData || frequencyData.length < 32) return false;

    let voiceScore = 0;
    let energyInVoiceBands = 0;
    let totalBandEnergy = 0;

    // Analyze voice-specific frequency ranges
    for (const range of this.voiceFreqRanges) {
      const minBin = Math.floor((range.min * frequencyData.length) / (this.sampleRate / 2));
      const maxBin = Math.floor((range.max * frequencyData.length) / (this.sampleRate / 2));

      let energy = 0;
      for (let i = minBin; i < maxBin && i < frequencyData.length; i++) {
        const normalized = frequencyData[i] / 255;
        energy += normalized * normalized;
      }

      energyInVoiceBands += energy * range.weight;
      totalBandEnergy += energy;

      // Weighted voice score based on energy presence
      if (energy > 0.02) {
        voiceScore += range.weight * (Math.min(1, energy) ** 0.5);
      }
    }

    // Normalize and smooth voice confidence with exponential moving average
    const currentConfidence = energyInVoiceBands > 0.01 ? Math.min(1, voiceScore * 1.2) : 0;
    this.voiceConfidence = (this.voiceConfidence * (1 - this.smoothingFactor)) +
                           (currentConfidence * this.smoothingFactor);

    return this.voiceConfidence > 0.5;
  }

  /**
   * Spectral subtraction with over-subtraction control
   * Removes noise while preserving speech characteristics
   */
  subtractNoise(frequencyData) {
    if (!this.noiseProfile || !frequencyData) return frequencyData;

    const processed = new Uint8Array(frequencyData.length);
    const noiseReductionFactor = 0.80; // Balanced noise reduction
    const floorFactor = 0.25;           // Prevent over-processing

    for (let i = 0; i < frequencyData.length; i++) {
      const signal = frequencyData[i];
      const noise = this.noiseProfile[i] || 30;

      // Spectral subtraction with over-subtraction control
      let reduced = signal - (noise * noiseReductionFactor);

      // Preserve minimum noise floor to avoid artifacts
      const floor = Math.max(noise * floorFactor, 15);
      reduced = Math.max(reduced, floor);

      // Soft limiting to prevent clipping
      processed[i] = Math.min(Math.round(reduced), 255);
    }

    return processed;
  }

  /**
   * Apply noise gate with smooth attack/release
   * Uses history-based smoothing to prevent chatter
   */
  updateGate(isVoicePresent) {
    const targetGain = isVoicePresent ? 1.0 : 0.05;
    const rate = isVoicePresent ? this.gateAttack : this.gateRelease;

    // Smooth gain transition
    this.gateGain += (targetGain - this.gateGain) * rate;

    // History-based smoothing for stability
    this.gateHistory.push(this.gateGain);
    if (this.gateHistory.length > this.gateHistorySize) {
      this.gateHistory.shift();
    }

    // Average recent values for smoother output
    const smoothedGain = this.gateHistory.reduce((a, b) => a + b, 0) / this.gateHistory.length;
    return Math.max(0, Math.min(1, smoothedGain));
  }

  /**
   * Get noise floor estimation in dB
   * Useful for monitoring suppression effectiveness
   */
  getNoiseFloor() {
    if (!this.noiseProfile) return -70;
    let sum = 0;
    for (let i = 0; i < this.noiseProfile.length; i++) {
      sum += this.noiseProfile[i];
    }
    const avg = sum / this.noiseProfile.length;
    return 20 * Math.log10(Math.max(avg, 1) / 255);
  }

  /**
   * Get current signal-to-noise ratio (SNR) in dB
   * Higher values indicate better voice clarity
   */
  getSignalToNoiseRatio(frequencyData) {
    if (!frequencyData || !this.noiseProfile) return 0;

    let signalEnergy = 0;
    let noiseEnergy = 0;

    for (let i = 0; i < frequencyData.length; i++) {
      signalEnergy += (frequencyData[i] / 255) ** 2;
      noiseEnergy += (this.noiseProfile[i] / 255) ** 2;
    }

    signalEnergy = Math.sqrt(signalEnergy / frequencyData.length);
    noiseEnergy = Math.sqrt(noiseEnergy / this.noiseProfile.length);

    return 20 * Math.log10(Math.max(signalEnergy, 0.0001) / Math.max(noiseEnergy, 0.0001));
  }

  /**
   * Main processing function - orchestrates all noise suppression steps
   */
  process() {
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);

    // Step 1: Calibrate noise profile if needed
    if (!this.noiseProfile) {
      this.calibrateNoiseProfile(data);
    }

    // Step 2: Detect voice activity
    const hasVoice = this.detectVoiceActivity(data);

    // Step 3: Adaptively update noise profile
    this.adaptNoiseProfile(data, this.voiceConfidence);

    // Step 4: Subtract noise from spectrum
    const processed = this.subtractNoise(data);

    // Step 5: Update noise gate
    const gateGain = this.updateGate(hasVoice);

    // Performance metrics for debugging
    const snr = this.getSignalToNoiseRatio(data);

    return {
      hasVoice,
      gateGain,
      confidence: this.voiceConfidence,
      snr,
      noiseFloor: this.getNoiseFloor(),
      processed  // Return processed spectrum for optional use
    };
  }

  /**
   * Force recalibration when environment noise changes
   */
  recalibrate() {
    this.noiseProfile = null;
    this.calibrationCount = 0;
    this.voiceConfidence = 0;
    this.gateGain = 1.0;
    this.gateHistory = [];
  }

  /**
   * Force sensitivity adjustment
   * @param {number} level - 0 (aggressive) to 1 (conservative)
   */
  setSensitivity(level) {
    // Clamp between 0 and 1
    const clamped = Math.max(0, Math.min(1, level));
    // Adjust detection thresholds
    this.voiceThresholdDb = -35 - (clamped * 10);  // -35 to -45 dB
    this.smoothingFactor = 0.1 + (clamped * 0.1);  // 0.1 to 0.2
  }

  /**
   * Get current suppression statistics
   */
  getStats() {
    return {
      isCalibrated: this.calibrationCount >= this.calibrationTarget,
      calibrationProgress: `${this.calibrationCount}/${this.calibrationTarget}`,
      voiceConfidence: (this.voiceConfidence * 100).toFixed(1) + '%',
      gateGain: (this.gateGain * 100).toFixed(1) + '%',
      noiseFloor: this.getNoiseFloor().toFixed(1) + ' dB'
    };
  }
}

// Export for use in injector and browser context
if (typeof window !== 'undefined') {
  window.NoiseSuppressor = NoiseSuppressor;
}

// Export for Node.js/module systems if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = NoiseSuppressor;
}
