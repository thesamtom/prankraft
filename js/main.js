/* ================================
   MAIN.JS — Stage Switching + Init
   GOVNET Backrooms Escape
   ================================ */

'use strict';

// ---- Global State ----
window.GOVNET = {
  currentStage: 1,
  submitAttempts: 0,
  passwordFound: false,
  startTime: null,
  endTime: null,
  audioUnlocked: false,
  paused: false,
};

// ---- Stage Sections ----
const stages = {
  1: document.getElementById('stage1'),
  2: document.getElementById('stage2'),
  3: document.getElementById('stage3'),
  4: document.getElementById('stage4'),
  5: document.getElementById('stage5'),
  6: document.getElementById('stage6'),
  7: document.getElementById('stage7'),
};

/**
 * Switch to a given stage with optional transition callback.
 * @param {number} num   - target stage number
 * @param {number} [delay=0] - ms delay before switching
 */
function goToStage(num, delay = 0) {
  const go = () => {
    // Hide all
    Object.values(stages).forEach(s => {
      if (s) s.classList.remove('active');
    });

    // Clear pause state if resuming or transitioning during a pause
    window.GOVNET.paused = false;

    // Show target
    if (stages[num]) {
      stages[num].classList.add('active');
      window.GOVNET.currentStage = num;
      // Scroll to top
      window.scrollTo(0, 0);
      // Fire stage-specific init
      const evt = new CustomEvent('govnet:stageEnter', { detail: { stage: num } });
      document.dispatchEvent(evt);
    }
  };
  if (delay > 0) {
    setTimeout(go, delay);
  } else {
    go();
  }
}

// ---- Black flash between stages ----
function flashBlack(duration = 600, callback) {
  const overlay = document.getElementById('flash-overlay');
  overlay.className = 'black';
  setTimeout(() => {
    overlay.className = '';
    if (callback) callback();
  }, duration);
}

function flashRed(duration = 400, callback) {
  const overlay = document.getElementById('flash-overlay');
  overlay.className = 'red';
  setTimeout(() => {
    overlay.className = '';
    if (callback) callback();
  }, duration);
}

// ---- Popup system ----
const popupOverlay = document.getElementById('popup-overlay');
const popupTitle   = document.getElementById('popup-title');
const popupBody    = document.getElementById('popup-body');
const popupBtn     = document.getElementById('popup-btn');
const popupClose   = document.getElementById('popup-close');

function showPopup(title, message, btnText = 'OK', callback) {
  popupTitle.textContent = title;
  popupBody.innerHTML = message;
  popupBtn.textContent = btnText;
  popupOverlay.classList.add('show');

  const dismiss = () => {
    popupOverlay.classList.remove('show');
    if (callback) callback();
  };
  popupBtn.onclick  = dismiss;
  popupClose.onclick = dismiss;
}

// ---- First-click audio unlock ----
document.addEventListener('click', () => {
  if (!window.GOVNET.audioUnlocked) {
    window.GOVNET.audioUnlocked = true;
    document.dispatchEvent(new Event('govnet:audioUnlocked'));
  }
}, { once: true, capture: true });

// ---- Pause / Resume system ----
function pauseCurrentStage() {
  if (window.GOVNET.paused) return; // guard against double-pause
  window.GOVNET.paused = true;

  const stage = window.GOVNET.currentStage;
  if (stage === 3) { window.pauseStage3 && window.pauseStage3(); }
  if (stage === 4) { window.pauseStage4 && window.pauseStage4(); }
  if (stage === 5) { window.pauseStage5 && window.pauseStage5(); }
  if (stage === 6) { window.pauseStage6 && window.pauseStage6(); }
}

function resumeCurrentStage() {
  if (!window.GOVNET.paused) return; // guard against spurious resumes
  window.GOVNET.paused = false;

  const stage = window.GOVNET.currentStage;
  if (stage === 3) { window.resumeStage3 && window.resumeStage3(); }
  if (stage === 4) { window.resumeStage4 && window.resumeStage4(); }
  if (stage === 5) { window.resumeStage5 && window.resumeStage5(); }
  if (stage === 6) { window.resumeStage6 && window.resumeStage6(); }
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  // Record start time
  window.GOVNET.startTime = Date.now();

  // Start on stage 1
  goToStage(1);

  // Expose goToStage globally for use in other modules
  window.goToStage            = goToStage;
  window.showPopup            = showPopup;
  window.flashBlack           = flashBlack;
  window.flashRed             = flashRed;
  window.pauseCurrentStage    = pauseCurrentStage;
  window.resumeCurrentStage   = resumeCurrentStage;
});
