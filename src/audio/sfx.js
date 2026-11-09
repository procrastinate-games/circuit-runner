// =============================================================================
// sfx.js — one-shot Web Audio sound effects (oscillators + filtered noise).
// Every function is a no-op until the AudioContext has been unlocked.
// =============================================================================

import { audioManager } from './AudioManager.js';
import { AUDIO } from '../core/Constants.js';

function out() {
  return audioManager.ready ? { ctx: audioManager.ctx, dest: audioManager.sfxBus } : null;
}

function tone(f, dur, { type = 'square', gain = 0.2, freqEnd, lpf = 6000, delay = 0, attack = 0.004 } = {}) {
  const o = out();
  if (!o) return;
  const { ctx, dest } = o;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f, t);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = lpf;
  osc.connect(filt).connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noise(dur, { gain = 0.2, type = 'lowpass', from = 4000, to, q = 1, delay = 0 } = {}) {
  const o = out();
  if (!o) return;
  const { ctx, dest } = o;
  const t = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = audioManager.noiseBuffer;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(from, t);
  if (to) filt.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(dest);
  src.start(t, Math.random() * 0.4);
  src.stop(t + dur + 0.02);
}

// Note frequencies used below
const E5 = 659.25;
const B5 = 987.77;

/** Pickup blip — climbs a semitone per combo step so chains sound exciting. */
export function cellSfx(combo = 0) {
  const semis = Math.min(AUDIO.CELL_BASE_SEMITONE + combo, AUDIO.CELL_MAX_SEMITONES);
  const k = Math.pow(2, semis / 12);
  tone(E5 * k, 0.08, { type: 'square', gain: 0.12, lpf: 5000 });
  tone(B5 * k, 0.14, { type: 'square', gain: 0.12, lpf: 6000, delay: 0.05 });
  tone(B5 * 2 * k, 0.12, { type: 'sine', gain: 0.06, delay: 0.05 });
}

export function jumpSfx() {
  tone(260, 0.16, { type: 'square', gain: 0.13, freqEnd: 900, lpf: 3200 });
  noise(0.12, { gain: 0.08, type: 'highpass', from: 2000, to: 6000 });
}

export function landSfx() {
  tone(110, 0.1, { type: 'sine', gain: 0.25, freqEnd: 50 });
  noise(0.07, { gain: 0.08, from: 900 });
}

export function slideSfx() {
  noise(0.4, { gain: 0.2, type: 'bandpass', from: 3000, to: 600, q: 0.9 });
  tone(180, 0.25, { type: 'sawtooth', gain: 0.04, freqEnd: 90, lpf: 900 });
}

export function laneSfx(dir = 1) {
  noise(0.14, { gain: 0.13, type: 'bandpass', from: dir > 0 ? 1200 : 2400, to: dir > 0 ? 3600 : 900, q: 1.4 });
}

export function clearSfx() {
  tone(880, 0.06, { type: 'triangle', gain: 0.1 });
  tone(1320, 0.09, { type: 'triangle', gain: 0.1, delay: 0.05 });
}

export function nearMissSfx() {
  noise(0.35, { gain: 0.22, type: 'bandpass', from: 600, to: 5000, q: 2 });
  tone(1760, 0.25, { type: 'sine', gain: 0.1, delay: 0.08 });
  tone(2637, 0.3, { type: 'sine', gain: 0.06, delay: 0.12 });
}

export function streakSfx() {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    tone(f, 0.18, { type: 'square', gain: 0.1, lpf: 4000, delay: i * 0.06 });
  });
  tone(1046.5, 0.5, { type: 'triangle', gain: 0.1, delay: 0.24 });
}

export function speedTierSfx() {
  tone(220, 0.6, { type: 'sawtooth', gain: 0.08, freqEnd: 880, lpf: 2400 });
  noise(0.6, { gain: 0.1, type: 'bandpass', from: 400, to: 4000, q: 1.5 });
}

export function crashSfx() {
  noise(0.6, { gain: 0.45, from: 3500, to: 200 });
  tone(320, 0.7, { type: 'sawtooth', gain: 0.18, freqEnd: 40, lpf: 1600 });
  tone(70, 0.4, { type: 'sine', gain: 0.4, freqEnd: 30 });
}

export function entranceSfx() {
  // Landing boom when the robot slams down
  tone(160, 0.5, { type: 'sine', gain: 0.45, freqEnd: 35 });
  noise(0.4, { gain: 0.22, from: 2500, to: 150 });
  tone(440, 0.25, { type: 'square', gain: 0.06, lpf: 2000, delay: 0.02 });
}

export function clickSfx() {
  tone(1200, 0.04, { type: 'square', gain: 0.08, lpf: 4000 });
}
