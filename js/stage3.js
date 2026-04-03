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

// ---- Reveal lines one by one ----
function revealLines() {
  const container = document.getElementById('s3-lines-container');
  if (!container) return;
  container.innerHTML = '';

  stage3Lines.forEach(({ text, cls, delay }) => {
    const span = document.createElement('span');
    span.className = `s3-line ${cls}`;
    span.textContent = text || '\u00A0'; // non-breaking space for blank lines
    container.appendChild(span);

    setTimeout(() => {
      if (window.GOVNET.currentStage !== 3) return;
      span.classList.add('visible');
      window.playAudio && window.playAudio('type');
    }, delay);
  });

  // Show button after all lines
  const lastDelay = stage3Lines[stage3Lines.length - 1].delay;
  setTimeout(() => {
    if (window.GOVNET.currentStage !== 3) return;
    const btn = document.getElementById('s3-terminal-btn');
    if (btn) {
      btn.style.display = 'inline-block';
      window.playAudio && window.playAudio('chime');
    }
  }, lastDelay + 1200);
}

// ---- Random entity text in corners ----
function startEntityFlashes() {
  const corners = ['s3-entity-tl', 's3-entity-tr', 's3-entity-bl', 's3-entity-br'];

  function flashEntity() {
    if (window.GOVNET.currentStage !== 3) return;

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

  // Start after a few seconds
  setTimeout(scheduleEntity, 8000);
}

// ---- Random 100ms black flashes ----
function startBlackFlashes() {
  function doFlash() {
    if (window.GOVNET.currentStage !== 3) return scheduleFlash();
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
