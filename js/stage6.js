/* ================================
   STAGE6.JS — The Lore Credits
   Web Audio API drone + infinite
   CRT credit scroll. No escape.
   ================================ */

'use strict';

let droneCtx = null;
let droneOsc = null;
let droneLfo = null;
let droneMasterGain = null;
let noiseInterval = null;

// ---- Web Audio API Drone ----
function initDrone() {
  try {
    droneCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (droneCtx.state === 'suspended') droneCtx.resume();

    // Master gain — fade in from 0
    droneMasterGain = droneCtx.createGain();
    droneMasterGain.gain.setValueAtTime(0, droneCtx.currentTime);
    droneMasterGain.gain.linearRampToValueAtTime(0.08, droneCtx.currentTime + 3);
    droneMasterGain.connect(droneCtx.destination);

    // Primary drone — 60Hz sine
    droneOsc = droneCtx.createOscillator();
    droneOsc.type = 'sine';
    droneOsc.frequency.setValueAtTime(60, droneCtx.currentTime);

    const droneGain = droneCtx.createGain();
    droneGain.gain.value = 1;
    droneOsc.connect(droneGain);
    droneGain.connect(droneMasterGain);

    // LFO — slow modulation on drone frequency
    droneLfo = droneCtx.createOscillator();
    droneLfo.type = 'sine';
    droneLfo.frequency.value = 0.08; // very slow warble

    const lfoGain = droneCtx.createGain();
    lfoGain.gain.value = 8; // ±8Hz modulation depth
    droneLfo.connect(lfoGain);
    lfoGain.connect(droneOsc.frequency);

    // Start oscillators
    droneOsc.start(droneCtx.currentTime);
    droneLfo.start(droneCtx.currentTime);

    // Schedule random white noise bursts
    scheduleNoiseBursts();

  } catch (e) {
    // Audio is non-critical
  }
}

// ---- Random White Noise Bursts ----
function scheduleNoiseBursts() {
  function burst() {
    if (window.GOVNET.currentStage !== 6) return;
    try {
      playNoiseBurst();
    } catch (e) {}
    const next = 12000 + Math.random() * 8000;
    noiseInterval = setTimeout(burst, next);
  }
  const first = 8000 + Math.random() * 5000;
  noiseInterval = setTimeout(burst, first);
}

function playNoiseBurst() {
  if (!droneCtx) return;

  const duration = 0.4;
  const bufferSize = Math.floor(droneCtx.sampleRate * duration);
  const buffer = droneCtx.createBuffer(1, bufferSize, droneCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const src = droneCtx.createBufferSource();
  src.buffer = buffer;

  const noiseGain = droneCtx.createGain();
  noiseGain.gain.setValueAtTime(0, droneCtx.currentTime);
  noiseGain.gain.linearRampToValueAtTime(0.15, droneCtx.currentTime + 0.02);
  noiseGain.gain.linearRampToValueAtTime(0.1, droneCtx.currentTime + duration * 0.5);
  noiseGain.gain.linearRampToValueAtTime(0, droneCtx.currentTime + duration);

  src.connect(noiseGain);
  noiseGain.connect(droneCtx.destination);
  src.start(droneCtx.currentTime);
  src.stop(droneCtx.currentTime + duration + 0.01);
}

// ---- STAGE 6 ENTRY ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage !== 6) return;

  // Start the drone
  initDrone();

  // Credits scroll is handled entirely by CSS animation
  // No JS needed for scroll — it loops forever automatically.
});
