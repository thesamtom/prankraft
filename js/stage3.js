/* ================================
   STAGE3.JS — Backrooms Takeover
   Text reveal, flicker, entity text
   ================================ */

'use strict';

const stage3Lines = [
  { text: 'GOVNET SESSION INTERRUPTED.',         cls: 'bold-line',  delay: 400  },
  { text: '',                                     cls: '',           delay: 900  },
  { text: 'You have been away from your desk too long.', cls: '',  delay: 1200 },
  { text: '',                                     cls: '',           delay: 1700 },
  { text: 'The system has logged you out.',       cls: '',           delay: 2000 },
  { text: '',                                     cls: '',           delay: 2600 },
  { text: '...but the exit is not where you left it.', cls: '',    delay: 3000 },
  { text: '',                                     cls: '',           delay: 3700 },
  { text: 'You noclipped.',                       cls: 'bold-line',  delay: 4200 },
  { text: '',                                     cls: '',           delay: 4900 },
  { text: 'Welcome to Level 0.',                  cls: 'bold-line',  delay: 5400 },
  { text: '',                                     cls: '',           delay: 6200 },
  { text: 'The smell of old moist carpet surrounds you.', cls: 'dim-line', delay: 6800 },
  { text: 'The fluorescent lights hum at maximum buzz.',  cls: 'dim-line', delay: 7400 },
  { text: 'There is no door. There is no window.',        cls: 'dim-line', delay: 8000 },
  { text: 'There is only the endless yellow.',            cls: 'dim-line', delay: 8700 },
  { text: '',                                             cls: '',          delay: 9400 },
  { text: 'GOVNET has no record of your existence, CITIZEN.', cls: 'bold-line', delay: 10000 },
  { text: '',                                             cls: '',          delay: 10800 },
  { text: 'Something is in the next room.',               cls: '',          delay: 11400 },
  { text: 'It has heard you.',                            cls: '',          delay: 12200 },
  { text: '',                                             cls: '',          delay: 13000 },
  { text: 'Find the terminal. Enter the code. Escape before it finds you.', cls: 'bold-line', delay: 13800 },
];

const entityTexts = [
  'IT KNOWS', 'LEVEL 0', 'NO EXIT', 'IT HEARS', 'COME CLOSER',
  'DONT LOOK', 'STAY STILL', 'ALWAYS WATCHING', 'ENTITY_DETECTED',
];

/* ---- Pause / Resume state ---- */
let s3PauseTimeout = null;   // active timeout ID (one at a time via sequential scheduling)
let s3CurrentLineIndex = 0;  // next line index to reveal
let s3IsPaused = false;
let s3RevealActive = false;  // true when sequencer is running
let s3SpanElements = [];     // pre-created span elements in order

/** Clears the current pending timeout, freezing the sequencer. */
window.pauseStage3 = function () {
  s3IsPaused = true;
  if (s3PauseTimeout !== null) {
    clearTimeout(s3PauseTimeout);
    s3PauseTimeout = null;
  }
};

/** Resumes the sequencer from the line it stopped at. */
window.resumeStage3 = function () {
  if (!s3IsPaused) return;
  s3IsPaused = false;
  if (s3RevealActive) {
    revealNextLine();
  }
};

// ---- Sequential line reveal (one timeout at a time so it's cancellable) ----
function revealNextLine() {
  if (s3IsPaused) return;
  if (window.GOVNET.currentStage !== 3) return;

  if (s3CurrentLineIndex >= stage3Lines.length) {
    // All lines done — show button
    s3PauseTimeout = setTimeout(() => {
      s3PauseTimeout = null;
      if (window.GOVNET.currentStage !== 3 || s3IsPaused) return;
      const btn = document.getElementById('s3-terminal-btn');
      if (btn) {
        btn.style.display = 'inline-block';
        window.playAudio && window.playAudio('chime');
      }
    }, 1200);
    return;
  }

  const lineData  = stage3Lines[s3CurrentLineIndex];
  const span      = s3SpanElements[s3CurrentLineIndex];

  // The original design used absolute delays from entry; here we convert
  // them into relative gaps between consecutive lines.
  let gap;
  if (s3CurrentLineIndex === 0) {
    gap = lineData.delay; // first line: delay from stage entry
  } else {
    gap = lineData.delay - stage3Lines[s3CurrentLineIndex - 1].delay;
  }
  gap = Math.max(gap, 0);

  s3PauseTimeout = setTimeout(() => {
    s3PauseTimeout = null;
    if (s3IsPaused) return;
    if (window.GOVNET.currentStage !== 3) return;

    span.classList.add('visible');
    window.playAudio && window.playAudio('type');

    s3CurrentLineIndex++;
    revealNextLine(); // chain to next line
  }, gap);
}

function revealLines() {
  const container = document.getElementById('s3-lines-container');
  if (!container) return;
  container.innerHTML = '';
  s3SpanElements = [];
  s3CurrentLineIndex = 0;
  s3IsPaused = false;
  s3RevealActive = true;
  s3PauseTimeout = null;

  // Pre-create all span elements (hidden), then start sequencer
  stage3Lines.forEach(({ text, cls }) => {
    const span = document.createElement('span');
    span.className = `s3-line ${cls}`;
    span.textContent = text || '\u00A0';
    container.appendChild(span);
    s3SpanElements.push(span);
  });

  revealNextLine();
}

// ---- Random entity text in corners ----
function startEntityFlashes() {
  const corners = ['s3-entity-tl', 's3-entity-tr', 's3-entity-bl', 's3-entity-br'];

  function flashEntity() {
    if (window.GOVNET.currentStage !== 3) return;
    if (window.GOVNET.paused) { scheduleEntity(); return; }

    const id = corners[Math.floor(Math.random() * corners.length)];
    const el = document.getElementById(id);
    if (!el) return scheduleEntity();

    const txt = entityTexts[Math.floor(Math.random() * entityTexts.length)];
    el.textContent = txt;
    el.style.opacity = '0.25';

    setTimeout(() => {
      el.style.opacity = '0';
      setTimeout(() => { el.textContent = ''; }, 300);
    }, 1200);

    scheduleEntity();
  }

  function scheduleEntity() {
    const delay = 6000 + Math.random() * 12000;
    setTimeout(flashEntity, delay);
  }

  setTimeout(scheduleEntity, 8000);
}

// ---- Random 100ms black flashes ----
function startBlackFlashes() {
  function doFlash() {
    if (window.GOVNET.currentStage !== 3) return scheduleFlash();
    if (window.GOVNET.paused) return scheduleFlash();
    if (Math.random() < 0.4) {
      const overlay = document.getElementById('flash-overlay');
      overlay.className = 'black';
      setTimeout(() => { overlay.className = ''; }, 100);
    }
    scheduleFlash();
  }

  function scheduleFlash() {
    const delay = 20000 + Math.random() * 40000;
    setTimeout(doFlash, delay);
  }

  setTimeout(scheduleFlash, 15000);
}

// ---- Terminal button click ----
function initTerminalBtn() {
  const btn = document.getElementById('s3-terminal-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    window.playAudio && window.playAudio('transition');
    window.flashBlack(900, () => window.goToStage(4));
  });
}

// ---- STAGE 3 ENTRY ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage !== 3) return;

  revealLines();
  startEntityFlashes();
  startBlackFlashes();
  initTerminalBtn();

  // Play backrooms ambience
  window.playAudio && setTimeout(() => window.playAudio('backrooms'), 800);
});
