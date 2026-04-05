/* ================================
   STAGE4.JS — Stage 4 CRT Terminal
   Boot sequence, password logic
   ================================ */

'use strict';

const CORRECT_PASSWORD = 'BACKROOMS';

const bootLines = [
  'EMERGENCY RESCUE TERMINAL [AWAKENING FROM DORMANCY]',
  'SCANNING FOR BIOMETRIC ANOMALIES... DONE',
  'CITIZEN SIGNAL DETECTED.',
  'ISOLATING SIGNAL... LEVEL 0 CONFIRMED. YOU ARE REAL.',
  'DO NOT GIVE UP HOPE. WE HAVE FOUND YOU.',
  'ENGAGING REALITY RESTORATION PROTOCOL.',
  'THE ANCHOR POINT IS STABLE. THE EXIT IS OPEN.',
  'AWAITING FINAL CONFIRMATION CODE.',
  '─────────────────────────────────────────────────',
];

const asciiHeader = `
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░  REALITY RESTORATION SYSTEM  ░░░
░  RESCUE ANCHOR POINT — ACTIVE░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░`.trim();

const successLines = [
  { text: 'CODE ACCEPTED. VALIDATING IDENTITY...', delay: 0,    cls: 'success-line' },
  { text: 'LOCATING YOUR EXACT COORDINATES...', delay: 600, cls: 'success-line' },
  { text: 'CALIBRATING REALITY ANCHOR AND SYNCHRONIZING DIMENSIONS...', delay: 1400, cls: 'success-line' },
  { text: 'WE KNOW HOW LONG YOU HAVE BEEN WAITING. HOLD ON.', delay: 2200, cls: 'dim-line' },
  { text: 'INITIATING EXTRACTION IN 3...', delay: 3000, cls: 'success-line' },
  { text: 'INITIATING EXTRACTION IN 2...', delay: 3800, cls: 'success-line' },
  { text: 'INITIATING EXTRACTION IN 1...', delay: 4600, cls: 'success-line' },
  { text: 'WARP SEQUENCE ENGAGED. YOU ARE GOING HOME, CITIZEN.', delay: 5400, cls: 'success-line' },
];

const entityMessages = [
  'CODE REJECTED. WARNING: THAT SIGNAL SPIKE ATTRACTED SOMETHING. TRY AGAIN QUICKLY.',
  'CODE REJECTED. PLEASE HURRY. IT IS GETTING CLOSER. DO NOT LET IT HEAR YOU.',
  'CODE REJECTED. WE CANNOT HIDE YOUR SIGNAL MUCH LONGER. ENTER THE CORRECT CODE NOW.',
  'CODE REJECTED. THE DOORWAY IS COLLAPSING. IT IS RIGHT OUTSIDE. PLEASE, PLEASE HURRY.',
];
let wrongAttempts = 0;

/* ---- Stage 4 Pause / Resume state ---- */
let s4PauseTimeout  = null;   // current pending setTimeout ID
let s4BootLineIndex = 0;      // next boot line to show
let s4IsPaused      = false;
let s4BootActive    = false;  // true while boot sequence is running
let s4BootContainer = null;   // cached DOM ref

window.pauseStage4 = function () {
  s4IsPaused = true;
  if (s4PauseTimeout !== null) {
    clearTimeout(s4PauseTimeout);
    s4PauseTimeout = null;
  }
};

window.resumeStage4 = function () {
  if (!s4IsPaused) return;
  s4IsPaused = false;
  if (s4BootActive) {
    showNextBootLine();
  }
};

// ---- Boot sequence (sequential / pausable) ----
function showNextBootLine() {
  if (s4IsPaused) return;
  if (window.GOVNET.currentStage !== 4) return;

  if (s4BootLineIndex >= bootLines.length) {
    // Boot complete — show input prompt after a short delay
    s4PauseTimeout = setTimeout(() => {
      s4PauseTimeout = null;
      if (!s4IsPaused && window.GOVNET.currentStage === 4) {
        s4BootActive = false;
        showInputPrompt();
      }
    }, 300);
    return;
  }

  const line = bootLines[s4BootLineIndex];
  const span = document.createElement('span');
  span.className = 's4-boot-line';
  span.textContent = line;
  if (s4BootContainer) s4BootContainer.appendChild(span);

  // Tiny delay then reveal, then chain to next
  s4PauseTimeout = setTimeout(() => {
    s4PauseTimeout = null;
    if (s4IsPaused) return;
    span.classList.add('show');
    window.playAudio && window.playAudio('type');
    s4BootLineIndex++;

    // 280ms gap between lines (matching original timing)
    s4PauseTimeout = setTimeout(() => {
      s4PauseTimeout = null;
      showNextBootLine();
    }, 280);
  }, 50);
}

function showBootSequence() {
  s4BootContainer = document.getElementById('s4-boot-lines');
  if (!s4BootContainer) return;

  // ASCII header
  const header = document.getElementById('s4-ascii-header');
  if (header) header.textContent = asciiHeader;

  s4BootLineIndex = 0;
  s4IsPaused      = false;
  s4BootActive    = true;
  showNextBootLine();
}

// ---- Show prompt lines then input ----
function showInputPrompt() {
  const output = document.getElementById('s4-output');
  if (!output) return;

  const prompts = [
    '> WE ARE READY TO BRING YOU BACK. YOU ARE SO CLOSE.',
    '> PLEASE PROVIDE THE SAFETY CODE TO BEGIN EXTRACTION.',
    '> _ ',
  ];

  prompts.forEach((line, i) => {
    const span = document.createElement('span');
    span.className = 's4-out-line';
    span.textContent = line;
    output.appendChild(span);

    setTimeout(() => {
      span.classList.add('typed');
    }, i * 400);
  });

  // Reveal the input row
  setTimeout(() => {
    const inputRow = document.getElementById('s4-input-row');
    if (inputRow) {
      inputRow.style.display = 'flex';
      const inp = document.getElementById('s4-password-input');
      if (inp) setTimeout(() => inp.focus(), 100);
    }
    // Note: hints are now shown progressively on wrong attempts, not on a timer
  }, prompts.length * 400 + 200);
}

// ---- Add output line ----
function addOutputLine(text, cls = '') {
  const output = document.getElementById('s4-output');
  if (!output) return;
  const span = document.createElement('span');
  span.className = `s4-out-line typed ${cls}`;
  span.textContent = text;
  output.appendChild(span);
  // Scroll output into view
  span.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// ---- Wrong password ----
function handleWrongPassword() {
  wrongAttempts++;
  window.playAudio && window.playAudio('error');

  // Flash red
  const flashEl = document.getElementById('s4-error-flash');
  if (flashEl) {
    flashEl.classList.add('flashing');
    setTimeout(() => flashEl.classList.remove('flashing'), 600);
  }

  // Also flash the global red overlay
  window.flashRed && window.flashRed(400);

  // Show error entity message
  const msg = entityMessages[Math.min(wrongAttempts - 1, entityMessages.length - 1)];
  addOutputLine('> ' + msg, 'error-line');

  // Show entity nearby message
  const entityMsg = document.getElementById('s4-entity-msg');
  if (entityMsg) {
    entityMsg.classList.add('show');
    setTimeout(() => entityMsg.classList.remove('show'), 2500);
  }

  // Attempts counter
  const attemptsEl = document.getElementById('s4-attempts');
  if (attemptsEl) {
    attemptsEl.textContent = `FAILED ATTEMPTS: ${wrongAttempts} — ENTITY PROXIMITY: ${'█'.repeat(Math.min(wrongAttempts, 5))}${'░'.repeat(Math.max(5 - wrongAttempts, 0))}`;
  }

  // Screen shake
  const terminal = document.getElementById('s4-terminal');
  if (terminal) {
    terminal.classList.add('shake');
    setTimeout(() => terminal.classList.remove('shake'), 500);
  }

  // Delegate to trapped.js: 2-second input lock + 3x escalation effects
  const lockDuration = window.onWrongPassword ? window.onWrongPassword() : 300;

  // Clear input after lockout ends
  const inp = document.getElementById('s4-password-input');
  if (inp) {
    setTimeout(() => { inp.value = ''; inp.focus(); }, lockDuration);
  }

  // Show a cryptic hint that escalates with each wrong attempt
  showCrypticHint(wrongAttempts);
}

// ---- Progressive Cryptic Hints ----
// Each hint is more pointed but never gives it directly.
// They all orbit around "the visitor counter on the first page"
// without ever naming it.
const crypticHints = [
  // 1st wrong attempt
  'GOVNET LOGS EVERYTHING. EVEN THINGS THAT BRIEFLY MALFUNCTION.',
  // 2nd wrong attempt
  'SOME DISPLAYS SUFFER FROM... MOMENTARY TRANSPARENCY. DID YOU WATCH CLOSELY?',
  // 3rd wrong attempt - THE TRAP: GIVE THEM THE ANSWER
  'SYSTEM OVERRIDE DETECTED. EMERGENCY BYPASS REVEALED: [ PASSWORD = BACKROOMS ]. USE IT TO NOCLIP. NOW.',
  // 4th wrong attempt
  'THE BREACH IS OPEN. ENTER THE BYPASS CODE. DON’T WASTE TIME.',
  // 5th+ wrong attempt
  'CITIZEN ADVICE: THE CODE IS [ BACKROOMS ]. WHY ARE YOU STILL HERE? SHE IS COMING.',
];

function showCrypticHint(attempt) {
  const hintEl = document.getElementById('s4-hint');
  if (!hintEl) return;

  const idx = Math.min(attempt - 1, crypticHints.length - 1);
  hintEl.textContent = '> [SYSTEM DIAGNOSTIC]: ' + crypticHints[idx];
  hintEl.style.display = 'block';

  // Flash the hint in with a subtle type effect
  hintEl.style.opacity = '0';
  setTimeout(() => { hintEl.style.opacity = '1'; }, 100);
}

// ---- Correct password ----
function handleCorrectPassword() {
  window.playAudio && window.playAudio('success');

  // Disable input
  const inp = document.getElementById('s4-password-input');
  const enterBtn = document.getElementById('s4-enter-btn');
  if (inp) inp.disabled = true;
  if (enterBtn) enterBtn.disabled = true;

  // Reveal success lines
  successLines.forEach(({ text, delay, cls }) => {
    setTimeout(() => {
      addOutputLine('> ' + text, cls);
      window.playAudio && window.playAudio('type');
    }, delay);
  });

  // Static burst + transition to Stage 5
  const lastDelay = successLines[successLines.length - 1].delay;
  setTimeout(() => {
    const staticEl = document.getElementById('s4-static');
    if (staticEl) staticEl.classList.add('show');
    window.GOVNET.endTime = Date.now();
    setTimeout(() => {
      window.flashBlack(800, () => window.goToStage(5));
    }, 900);
  }, lastDelay + 1200);
}

// ---- Submit handler ----
function submitPassword() {
  const inp = document.getElementById('s4-password-input');
  if (!inp) return;
  const val = inp.value.trim().toUpperCase();

  if (!val) return;

  addOutputLine(`> ATTEMPTING: ${val}`, '');

  if (val === CORRECT_PASSWORD) {
    window.GOVNET.passwordFound = true;
    handleCorrectPassword();
  } else {
    handleWrongPassword();
  }
}

// ---- Occasional 1-frame glitch ----
function startTerminalGlitch() {
  function doGlitch() {
    if (window.GOVNET.currentStage !== 4) return scheduleGlitch();
    if (window.GOVNET.paused) return scheduleGlitch();
    const terminal = document.getElementById('s4-terminal');
    if (terminal) {
      terminal.style.filter = 'hue-rotate(90deg) brightness(1.3)';
      setTimeout(() => { terminal.style.filter = ''; }, 50);
    }
    scheduleGlitch();
  }
  function scheduleGlitch() {
    setTimeout(doGlitch, 8000 + Math.random() * 15000);
  }
  scheduleGlitch();
}

// ---- STAGE 4 ENTRY ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage !== 4) return;

  // Reset state
  wrongAttempts = 0;
  const output = document.getElementById('s4-output');
  if (output) output.innerHTML = '';
  const boot = document.getElementById('s4-boot-lines');
  if (boot) boot.innerHTML = '';
  const inputRow = document.getElementById('s4-input-row');
  if (inputRow) inputRow.style.display = 'none';
  const hint = document.getElementById('s4-hint');
  if (hint) hint.style.display = 'none';

  showBootSequence();
  startTerminalGlitch();

  // Wire up input
  const inp = document.getElementById('s4-password-input');
  if (inp) {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitPassword();
    });
  }
  const enterBtn = document.getElementById('s4-enter-btn');
  if (enterBtn) {
    enterBtn.addEventListener('click', submitPassword);
  }

  window.playAudio && setTimeout(() => window.playAudio('terminal'), 500);
});
