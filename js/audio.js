/* ================================
   AUDIO.JS — Sound Management
   Web Audio API tone synthesis
   (No external files needed — all
    synthesized in-browser)
   ================================ */

'use strict';

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browser policy)
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play a synthesized sound by name.
 * All sounds are generated via Web Audio API — no external files needed.
 */
function playAudio(name) {
  if (!window.GOVNET.audioUnlocked) return;
  try {
    const ctx = getCtx();
    switch (name) {
      case 'click':     playClick(ctx); break;
      case 'error':     playError(ctx); break;
      case 'type':      playType(ctx);  break;
      case 'chime':     playChime(ctx); break;
      case 'success':   playSuccess(ctx); break;
      case 'terminal':  playTerminalHum(ctx); break;
      case 'backrooms': playBackroomsHum(ctx); break;
      case 'transition':playTransition(ctx); break;
      case 'celebrate': playCelebrate(ctx); break;
      default: break;
    }
  } catch (e) {
    // Silently fail — audio is non-critical
  }
}

// ---- Individual sound synthesizers ----

// Old mouse click
function playClick(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.exp(-i / 400);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

// Win95-style error beep
function playError(ctx) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(440, ctx.currentTime);
  osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.35);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.35);
}

// Typewriter key press
function playType(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.04, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 3) * 0.6;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const gain = ctx.createGain();
  gain.gain.value = 0.08;
  src.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

// Stage 3 "button appears" chime
function playChime(ctx) {
  const freqs = [523.25, 659.25, 783.99]; // C5-E5-G5
  freqs.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + i * 0.15 + 0.05);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.15 + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + i * 0.15 + 0.6);
  });
}

// Stage 4 success cascade
function playSuccess(ctx) {
  const notes = [261.63, 329.63, 392, 523.25, 659.25];
  notes.forEach((freq, i) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.1, ctx.currentTime + i * 0.12);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + i * 0.12 + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.12);
    osc.stop(ctx.currentTime + i * 0.12 + 0.5);
  });
}

// CRT / terminal low hum (short burst, call repeatedly)
function playTerminalHum(ctx) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = 60;
  gain.gain.setValueAtTime(0.04, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 0.5);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 1.5);
}

// Backrooms fluorescent hum
function playBackroomsHum(ctx) {
  const osc  = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo  = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.value = 120;

  lfo.frequency.value = 3.5; // flicker rate
  lfoGain.gain.value  = 0.015;
  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  gain.gain.setValueAtTime(0.035, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 4);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(ctx.currentTime);
  lfo.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 4);
  lfo.stop(ctx.currentTime + 4);
}

// Static burst transition sound
function playTransition(ctx) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const env = Math.min(i / 1000, 1) * Math.max(1 - (i - data.length + 2000) / 2000, 0);
    data[i] = (Math.random() * 2 - 1) * env * 0.25;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start();
}

// Stage 5 celebration — Win95 startup-style
function playCelebrate(ctx) {
  const melody = [
    { freq: 523.25, t: 0,    dur: 0.15 },
    { freq: 659.25, t: 0.15, dur: 0.15 },
    { freq: 783.99, t: 0.30, dur: 0.15 },
    { freq: 1046.5, t: 0.45, dur: 0.35 },
    { freq: 880,    t: 0.80, dur: 0.15 },
    { freq: 1046.5, t: 0.95, dur: 0.5  },
  ];

  melody.forEach(({ freq, t, dur }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + t + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + t + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + t);
    osc.stop(ctx.currentTime + t + dur + 0.05);
  });
}

// ---- Expose globally ----
window.playAudio = playAudio;

// Unlock on first interaction (handled in main.js with audioUnlocked flag)
document.addEventListener('govnet:audioUnlocked', () => {
  // Init AudioContext on first user gesture
  try { getCtx(); } catch(e) {}
});
