/* ================================
   TERMINAL.JS — Stage 4 CRT Terminal
   Boot sequence, password logic
   ================================ */

'use strict';

const CORRECT_PASSWORD = 'BACKROOMS';

const bootLines = [
  'GOVNET CLASSIFIED TERMINAL v1.94 [BUILD 000001]',
  'INITIALIZING SECURE SESSION...',
  'SCANNING LOCAL NETWORK TOPOLOGY...',
  'WARNING: TOPOLOGY IS NON-EUCLIDEAN',
  'LOADING CITIZEN DATABASE... [FRAGMENT]',
  'DATABASE ERROR: CITIZEN NOT FOUND IN REALITY',
  'FALLBACK PROTOCOL ENGAGED.',
  'EMERGENCY EXIT SYSTEM: ONLINE',
  '─────────────────────────────────────────────────',
];

const asciiHeader = `
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
░  GOVNET CLASSIFIED TERMINAL  ░░░
░  LEVEL 0 — EMERGENCY EXIT    ░░░
░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░`.trim();

const successLines = [
  { text: 'CODE ACCEPTED.', delay: 0,    cls: 'success-line' },
  { text: 'LOCATING REALITY BREACH...', delay: 600, cls: 'success-line' },
  { text: 'SYNCHRONIZING DIMENSIONS...', delay: 1400, cls: 'success-line' },
  { text: 'BREACH CONFIRMED AT GRID REF: 00-00-00', delay: 2200, cls: 'dim-line' },
  { text: 'NOCLIPPING IN 3...', delay: 3000, cls: 'success-line' },
  { text: 'NOCLIPPING IN 2...', delay: 3800, cls: 'success-line' },
  { text: 'NOCLIPPING IN 1...', delay: 4600, cls: 'success-line' },
  { text: '> CITIZEN CONFIRMED: YOU ARE GLORIOUSLY FOOLED.', delay: 5400, cls: 'success-line' },
];

const entityMessages = [
  'ACCESS DENIED. ENTITY DETECTED IN ADJACENT ROOM. REMAIN STILL. DO NOT MAKE A SOUND.',
  'ACCESS DENIED. THERMAL SIGNATURE IDENTIFIED. DEACTIVATING LIGHTS.',
  'ACCESS DENIED. IT IS CLOSER NOW. DO NOT BREATHE.',
  'ACCESS DENIED. WRONG CODE. WRONG REALITY. STOP TRYING.',
];
let wrongAttempts = 0;

// ---- Boot sequence ----
function showBootSequence() {
  const container = document.getElementById('s4-boot-lines');
  if (!container) return;

  // ASCII header
  const header = document.getElementById('s4-ascii-header');
  if (header) header.textContent = asciiHeader;

  bootLines.forEach((line, i) => {
    const span = document.createElement('span');
    span.className = 's4-boot-line';
    span.textContent = line;
    container.appendChild(span);

    setTimeout(() => {
      span.classList.add('show');
      window.playAudio && window.playAudio('type');
    }, i * 280 + 300);
  });

  // After boot, show input
  const totalDelay = bootLines.length * 280 + 600;
  setTimeout(() => {
    showInputPrompt();
  }, totalDelay);
}

// ---- Show prompt lines then input ----
function showInputPrompt() {
  const output = document.getElementById('s4-output');
  if (!output) return;

  const prompts = [
    '> CITIZEN IDENTIFICATION PROTOCOL INITIATED',
    '> ENTER THE ESCAPE CODE TO NOCLIP BACK TO REALITY',
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
  // 3rd wrong attempt
  'THE ANSWER WAS COUNTING DOWN IN PLAIN SIGHT. NUMBERS ARE NOT ALWAYS JUST NUMBERS.',
  // 4th wrong attempt
  'RETURN TO WHERE YOU BEGAN. SOMETHING THERE STUTTERED. FOR LESS THAN A SECOND.',
  // 5th+ wrong attempt — most direct but still twisted
  'CITIZEN ADVICE: THE PORTAL HOMEPAGE CONTAINS A DISPLAY THAT BRIEFLY LOSES CONTROL OF ITSELF. WHAT DID IT SAY?',
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
  // Deactivate trap mode before transition
  window.deactivateTrap && window.deactivateTrap();

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
