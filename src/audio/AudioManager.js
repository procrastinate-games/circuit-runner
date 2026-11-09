// =============================================================================
// AudioManager.js — owns the AudioContext, master + music/SFX buses, and the
// current BGM loop. Context is created on the first user gesture (autoplay
// policy); music requested before that starts as soon as audio unlocks.
// =============================================================================

import { AUDIO } from '../core/Constants.js';

class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicBus = null;
    this.musicFilter = null;
    this.sfxBus = null;
    this.noiseBuffer = null;
    this.currentBgm = null;
    this.pendingBgm = null;
    this.muted = false;
  }

  get ready() {
    return !!this.ctx;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : AUDIO.MASTER_VOLUME;
    // Gentle limiter so stacked SFX never clip
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 6;
    this.master.connect(comp).connect(this.ctx.destination);

    this.musicFilter = this.ctx.createBiquadFilter();
    this.musicFilter.type = 'lowpass';
    this.musicFilter.frequency.value = AUDIO.MUSIC_LPF_MIN;
    this.musicBus = this.ctx.createGain();
    this.musicBus.gain.value = AUDIO.MUSIC_VOLUME;
    this.musicBus.connect(this.musicFilter).connect(this.master);

    this.sfxBus = this.ctx.createGain();
    this.sfxBus.gain.value = AUDIO.SFX_VOLUME;
    this.sfxBus.connect(this.master);

    // One second of white noise, shared by hats, snares and whooshes
    const len = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else this.ctx.resume();
    });

    if (this.pendingBgm) {
      const fn = this.pendingBgm;
      this.pendingBgm = null;
      this.playMusic(fn);
    }
  }

  playMusic(patternFn) {
    this.stopMusic();
    if (!this.ctx) {
      this.pendingBgm = patternFn; // start once the first gesture unlocks audio
      return;
    }
    try {
      this.currentBgm = patternFn(this.ctx, this.musicBus, this.noiseBuffer);
    } catch (e) {
      console.warn('[Audio] BGM error:', e);
    }
  }

  stopMusic() {
    this.pendingBgm = null;
    if (this.currentBgm) {
      try { this.currentBgm.stop(); } catch (_) { /* already stopped */ }
      this.currentBgm = null;
    }
  }

  /** 0..1 — opens the music filter as the run speeds up. */
  setIntensity(t) {
    if (!this.ctx) return;
    const f = AUDIO.MUSIC_LPF_MIN * Math.pow(AUDIO.MUSIC_LPF_MAX / AUDIO.MUSIC_LPF_MIN, t);
    this.musicFilter.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.3);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : AUDIO.MASTER_VOLUME, this.ctx.currentTime, 0.02);
    }
  }
}

export const audioManager = new AudioManager();
