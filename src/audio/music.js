// =============================================================================
// music.js — procedural synthwave BGM on a Web Audio look-ahead sequencer.
// Gameplay loop: A-minor Am–F–C–G, 124 BPM, 16th-note grid, 8-bar lead with
// two phrases + random hat drops so it doesn't feel like a 2-second loop.
// =============================================================================

import { AUDIO } from '../core/Constants.js';

const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

/** 'A4' → 440 */
export function freq(name) {
  const m = /^([A-G]#?)(\d)$/.exec(name);
  if (!m) return 0;
  const midi = (Number(m[2]) + 1) * 12 + NOTE_INDEX[m[1]];
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 'E5:4 D5:2 R:2' → per-16th-step array; a note occupies its first step,
 * held steps are null.
 */
function seq(str) {
  const out = [];
  for (const tok of str.trim().split(/\s+/)) {
    const [name, lenStr] = tok.split(':');
    const len = Number(lenStr || 1);
    out.push(name === 'R' ? null : { f: freq(name), len });
    for (let i = 1; i < len; i++) out.push(null);
  }
  return out;
}

/** Repeat each note `n` times as single steps: 'A2 A3' x8 etc. */
function steps(str) {
  return str.trim().split(/\s+/).map((n) => (n === 'R' ? null : { f: freq(n), len: 1 }));
}

// --- voices -----------------------------------------------------------------

function tone(ctx, dest, f, t, dur, o) {
  const osc = ctx.createOscillator();
  osc.type = o.type || 'square';
  osc.frequency.setValueAtTime(f, t);
  if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(o.freqEnd, t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = ctx.createGain();
  const peak = o.gain ?? 0.1;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  let node = osc.connect(g);
  if (o.lpf) {
    const f2 = ctx.createBiquadFilter();
    f2.type = 'lowpass';
    f2.frequency.value = o.lpf;
    f2.Q.value = o.q ?? 1;
    node = g.connect(f2);
  }
  node.connect(dest);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function noiseHit(ctx, dest, buffer, t, dur, o) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const g = ctx.createGain();
  g.gain.setValueAtTime(o.gain ?? 0.1, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const filt = ctx.createBiquadFilter();
  filt.type = o.filter || 'highpass';
  filt.frequency.value = o.freq || 6000;
  if (o.q) filt.Q.value = o.q;
  src.connect(filt).connect(g).connect(dest);
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function kick(ctx, dest, t, gain = 0.55) {
  tone(ctx, dest, 150, t, 0.16, { type: 'sine', freqEnd: 42, gain, attack: 0.002 });
}

function scheduler(ctx, bpm, stepsPerBeat, onStep) {
  const stepDur = 60 / bpm / stepsPerBeat;
  let next = ctx.currentTime + 0.06;
  let i = 0;
  let stopped = false;
  let timer = null;
  const tick = () => {
    if (stopped) return;
    while (next < ctx.currentTime + 0.12) {
      onStep(i, next, stepDur);
      i++;
      next += stepDur;
    }
    timer = setTimeout(tick, 25);
  };
  tick();
  return { stop() { stopped = true; clearTimeout(timer); } };
}

// --- patterns -----------------------------------------------------------------

const CHORDS = [
  { bass: ['A2', 'A3'], arp: ['A4', 'C5', 'E5', 'A5', 'E5', 'C5', 'A4', 'E4'] },
  { bass: ['F2', 'F3'], arp: ['F4', 'A4', 'C5', 'F5', 'C5', 'A4', 'F4', 'C4'] },
  { bass: ['C3', 'C4'], arp: ['C5', 'E5', 'G5', 'C6', 'G5', 'E5', 'C5', 'G4'] },
  { bass: ['G2', 'G3'], arp: ['G4', 'B4', 'D5', 'G5', 'D5', 'B4', 'G4', 'D4'] },
];
const BASS_SHAPE = [0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0]; // 0 root, 1 octave

const LEAD = seq(`
  E5:4 D5:2 C5:2 D5:4 E5:4
  C5:4 A4:4 C5:2 D5:2 C5:4
  E5:4 G5:4 E5:2 D5:2 C5:4
  D5:8 B4:4 R:4
  A5:4 G5:2 E5:2 G5:4 A5:4
  F5:4 E5:4 C5:4 A4:4
  G5:4 E5:4 C5:4 E5:4
  D5:6 E5:2 B4:8
`);

export function gameplayBGM(ctx, dest, noise) {
  return scheduler(ctx, AUDIO.BPM, 4, (i, t, sd) => {
    const bar = Math.floor(i / 16);
    const s = i % 16;
    const chord = CHORDS[bar % CHORDS.length];
    const section = Math.floor(bar / 8) % 4; // intro → full → full → breakdown

    // Drums
    if (s % 4 === 0) kick(ctx, dest, t, section === 3 ? 0.35 : 0.55);
    if (section !== 3 && (s === 4 || s === 12)) {
      noiseHit(ctx, dest, noise, t, 0.14, { gain: 0.22, filter: 'bandpass', freq: 1900, q: 0.8 });
      tone(ctx, dest, 190, t, 0.08, { type: 'triangle', gain: 0.08 });
    }
    if (s % 2 === 1 && Math.random() > 0.15) noiseHit(ctx, dest, noise, t, 0.03, { gain: 0.05, freq: 8000 });
    if (s % 4 === 2) noiseHit(ctx, dest, noise, t, 0.09, { gain: 0.045, freq: 6500 });

    // Bass — pumping 16ths
    const b = chord.bass[BASS_SHAPE[s]];
    tone(ctx, dest, freq(b), t, sd * 0.85, { type: 'sawtooth', gain: 0.09, lpf: 700 + (s % 4 === 0 ? 500 : 0), q: 4 });

    // Arp — sparkle on top
    if (section > 0) {
      tone(ctx, dest, freq(chord.arp[s % 8]), t, sd * 0.9, { type: 'square', gain: 0.025, lpf: 3200 });
    }

    // Lead — only in the "full" sections
    if (section === 1 || section === 2) {
      const note = LEAD[i % LEAD.length];
      if (note) {
        const dur = note.len * sd * 0.95;
        tone(ctx, dest, note.f, t, dur, { type: 'triangle', gain: 0.1, attack: 0.01 });
        tone(ctx, dest, note.f, t, dur, { type: 'sawtooth', gain: 0.025, detune: 7, lpf: 2600, attack: 0.02 });
      }
    }
  });
}

const OVER_ARP = steps('A3 C4 E4 A4 E4 C4 F3 A3 C4 F4 C4 A3 D3 F3 A3 D4 A3 F3 E3 G#3 B3 E4 B3 G#3');

export function gameOverTheme(ctx, dest) {
  return scheduler(ctx, AUDIO.GAMEOVER_BPM, 2, (i, t, sd) => {
    const note = OVER_ARP[i % OVER_ARP.length];
    if (note) tone(ctx, dest, note.f, t, sd * 1.8, { type: 'triangle', gain: 0.09, attack: 0.02 });
    if (i % 6 === 0) {
      tone(ctx, dest, note ? note.f / 2 : 110, t, sd * 6, { type: 'sine', gain: 0.08, attack: 0.15 });
    }
  });
}
