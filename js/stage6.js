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
let s6TransitionTimeout = null;
let s6VolumeTimeout = null;

/* ---- Stage 6 Pause / Resume ---- */
let s6PauseTime       = null;  // Date.now() when paused
let s6ElapsedBeforePause = 0;  // ms into the 180s transition timer
let s6TransitionTotal = 195000; // mirrors the setTimeout value

window.pauseStage6 = function () {
  // 1. Freeze the CSS credits scroll
  const el = document.getElementById('s6-credits-scroll');
  if (el) el.style.animationPlayState = 'paused';

  // 2. Freeze timers
  if (s6TransitionTimeout) {
    clearTimeout(s6TransitionTimeout);
    s6TransitionTimeout = null;
  }
  if (s6VolumeTimeout) {
    clearTimeout(s6VolumeTimeout);
    s6VolumeTimeout = null;
  }
  s6PauseTime = Date.now();
  s6ElapsedBeforePause += s6PauseTime - (window._s6EntryTime || s6PauseTime);

  // If already ramping, we need to cancel any current AudioParam ramps
  if (droneMasterGain && droneCtx) {
    droneMasterGain.gain.cancelScheduledValues(droneCtx.currentTime);
    droneMasterGain.gain.setValueAtTime(droneMasterGain.gain.value, droneCtx.currentTime);
  }
};

window.resumeStage6 = function () {
  // 1. Resume CSS credits scroll from same position
  const el = document.getElementById('s6-credits-scroll');
  if (el) el.style.animationPlayState = 'running';

  // 2. Restart timers
  const remainingTransition = s6TransitionTotal - s6ElapsedBeforePause;
  // Volume ramp starts at 160s (35s before 195s glitch)
  const volRampStart = 160000;
  const remainingVolume = volRampStart - s6ElapsedBeforePause;

  window._s6EntryTime = Date.now();
  s6PauseTime = null;

  if (remainingTransition > 0) {
    s6TransitionTimeout = setTimeout(() => {
      triggerStage7Glitch();
    }, remainingTransition);
  } else {
    triggerStage7Glitch();
  }

  if (remainingVolume > 0) {
    s6VolumeTimeout = setTimeout(() => {
      startExponentialVolumeRamp();
    }, remainingVolume);
  } else if (remainingTransition > 0) {
    // Already passed 145s, start ramp immediately with dynamic target
    startExponentialVolumeRamp();
  }
};


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
    if (window.GOVNET.paused) { const next = 12000 + Math.random() * 8000; noiseInterval = setTimeout(burst, next); return; }
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

function startExponentialVolumeRamp() {
  if (!droneMasterGain || !droneCtx) return;

  const now = droneCtx.currentTime;
  // Calculate remaining time until the 180s glitch
  const remainingMs = s6TransitionTotal - s6ElapsedBeforePause;
  if (remainingMs <= 0) return;

  const duration = remainingMs / 1000;

  // exponentialRampToValueAtTime requires a value > 0
  const currentVal = Math.max(droneMasterGain.gain.value, 0.001);
  droneMasterGain.gain.cancelScheduledValues(now);
  droneMasterGain.gain.setValueAtTime(currentVal, now);
  // Hum of the fluorescent lights becomes unbearable
  droneMasterGain.gain.exponentialRampToValueAtTime(1.8, now + duration);
  
  // Also increase the warble intensity
  if (droneOsc && droneCtx) {
    try {
      // Modulate frequency slightly up as tension rises
      droneOsc.frequency.linearRampToValueAtTime(74, now + duration);
    } catch(e) {}
  }
}

// (Ramp logic startVolumeRamp is above)


// ---- GLITCH TRANSITION TO STAGE 7 ----
function triggerStage7Glitch() {
  const glitchDiv = document.createElement('div');
  glitchDiv.id = 's7-glitch-transition';
  Object.assign(glitchDiv.style, {
    position: 'fixed', inset: '0', zIndex: '9000',
    backgroundColor: '#000', overflow: 'hidden'
  });
  document.body.appendChild(glitchDiv);

  // Phase 1: RGB Split
  const r = document.createElement('div');
  const g = document.createElement('div');
  const b = document.createElement('div');
  [r, g, b].forEach(el => {
    Object.assign(el.style, {
      position: 'absolute', inset: '0', mixBlendMode: 'screen', opacity: '0.7'
    });
    glitchDiv.appendChild(el);
  });
  r.style.backgroundColor = '#ff0000'; r.style.transform = 'translateX(-8px)';
  g.style.backgroundColor = '#00ff00'; g.style.transform = 'translateX(0px)';
  b.style.backgroundColor = '#0000ff'; b.style.transform = 'translateX(8px)';

  let rgbInterval = setInterval(() => {
    [r, g, b].forEach(el => {
      const tx = (Math.random() * 24 - 12);
      const ty = (Math.random() * 8 - 4);
      el.style.transform = `translate(${tx}px, ${ty}px)`;
    });
  }, 30);

  // Phase 2: Horizontal Scan Tears (at 150ms)
  let tearInterval;
  setTimeout(() => {
    tearInterval = setInterval(() => {
      const p = [];
      let y = 0;
      while (y < 100) {
        const h = Math.random() * 15 + 2;
        const off = (Math.random() * 35 + 5) * (Math.random() > 0.5 ? 1 : -1);
        p.push(`0% ${y}%`, `${off}px ${y}%`, `${off}px ${y + h}%`, `0% ${y + h}%`, `0% ${y}%`, `${-off}px ${y}%`); // simple alternating rects
        y += h;
      }
      glitchDiv.style.clipPath = `polygon(0 0, 100% 0, 100% 100%, 0 100%)`; // Placeholder, real clip path in next tick
      
      const r1 = Math.random() * 100;
      const r2 = r1 + Math.random() * 20;
      const offset = (Math.random() * 40 - 20);
      glitchDiv.style.clipPath = `polygon(0 0%, ${offset}px 0%, ${offset}px ${r1}%, 0 ${r1}%, 0 ${r2}%, ${-offset}px ${r2}%)`; 
    }, 40);
  }, 150);

  // Phase 3: Flicker to White (400ms to 500ms)
  let flickerInterval;
  setTimeout(() => {
    clearInterval(rgbInterval);
    clearInterval(tearInterval);
    glitchDiv.style.clipPath = '';
    [r, g, b].forEach(el => el.style.display = 'none');
    
    let isWhite = true;
    glitchDiv.style.backgroundColor = '#ffffff';
    flickerInterval = setInterval(() => {
      isWhite = !isWhite;
      glitchDiv.style.backgroundColor = isWhite ? '#ffffff' : '#000000';
    }, 25);
  }, 400);

  // Phase 4: Hold Black (500ms to 700ms)
  setTimeout(() => {
    clearInterval(flickerInterval);
    glitchDiv.style.backgroundColor = '#000000';
  }, 500);

  // Phase 5: Destroy and Start Stage 7
  setTimeout(() => {
    if (glitchDiv.parentNode) glitchDiv.parentNode.removeChild(glitchDiv);
    if (window.GOVNET && typeof window.goToStage === 'function') {
      window.goToStage(7);
    }
  }, 450);
}

// ---- STAGE 6 ENTRY ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage === 6) {
    initDrone();

    // Record entry time for pause accounting
    window._s6EntryTime  = Date.now();
    s6ElapsedBeforePause = 0;
    s6PauseTime          = null;

    // The "instant glitch" triggers at the 195s mark,
    // aligned with the whisper block during the slower 220s scroll.
    s6TransitionTimeout = setTimeout(() => {
      triggerStage7Glitch();
    }, s6TransitionTotal);

    // Volume ramp starts at 160s (35s before 195s glitch)
    s6VolumeTimeout = setTimeout(() => {
      startExponentialVolumeRamp();
    }, 160000);
  } else {
    // Cleanup Stage 6
    if (s6TransitionTimeout) {
      clearTimeout(s6TransitionTimeout);
      s6TransitionTimeout = null;
    }
    if (noiseInterval) {
      clearTimeout(noiseInterval);
      noiseInterval = null;
    }
    if (s6VolumeTimeout) {
      clearTimeout(s6VolumeTimeout);
      s6VolumeTimeout = null;
    }
    // Reset pause state
    s6ElapsedBeforePause = 0;
    s6PauseTime          = null;
    window._s6EntryTime  = null;
  }
});
