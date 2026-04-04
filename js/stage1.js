/* ================================
   STAGE1.JS — Retro Gov Site Effects
   Marquee, counter, popups, jitter
   ================================ */

'use strict';

// ---- Visitor Counter ----
// Ticks DOWN slowly for eerie effect.
// Secretly glitches to flash "BACKROOMS" once every ~60s.
let counterValue = 312;
let counterEl;
let counterGlitchCount = 0;

function initCounter() {
  counterEl = document.getElementById('s1-counter-display');
  if (!counterEl) return;
  updateCounter();
  scheduleNextTick();
  scheduleCounterGlitch(); // start the secret glitch cycle
}

function updateCounter() {
  if (!counterEl) return;
  counterEl.textContent = String(counterValue).padStart(7, '0');
}

function scheduleNextTick() {
  const delay = 5000 + Math.random() * 9000;
  setTimeout(() => {
    if (window.GOVNET.currentStage === 1) {
      counterValue = Math.max(0, counterValue - 1);
      updateCounter();
    }
    scheduleNextTick();
  }, delay);
}

// ---- Counter Glitch — the real clue ----
// Scrambles to noise for 120ms, then flashes the password for 200ms,
// then snaps back to the number.
function doCounterGlitch() {
  if (!counterEl || window.GOVNET.currentStage !== 1) return scheduleCounterGlitch();

  counterGlitchCount++;

  // Phase 1: scramble (noise characters) — 120ms
  counterEl.style.color = '#ffff00';
  counterEl.style.letterSpacing = '2px';
  counterEl.textContent = randomNoise(9);

  // Phase 2: flash the password — 600ms (0.5–0.7s visible window)
  setTimeout(() => {
    counterEl.textContent = 'BACKROOMS';
    counterEl.style.color = '#ff0';
    counterEl.style.fontSize  = '16px';
    counterEl.style.letterSpacing = '3px';
  }, 120);

  // Phase 3: scramble again — 80ms
  setTimeout(() => {
    counterEl.textContent = randomNoise(9);
    counterEl.style.color = '#ffff00';
    counterEl.style.fontSize = '';
  }, 720);

  // Phase 4: snap back to normal counter, then schedule next
  setTimeout(() => {
    counterEl.style.color = '';
    counterEl.style.letterSpacing = '';
    counterEl.style.fontSize = '';
    updateCounter();
    scheduleCounterGlitch();
  }, 820);
}

function randomNoise(len) {
  const chars = '0123456789#@%&*!?-XZQWV';
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

function scheduleCounterGlitch() {
  // Glitch every 5–6 seconds, indefinitely
  const delay = 5000 + Math.random() * 1000;
  setTimeout(doCounterGlitch, delay);
}

// ---- Header Glitch ----
// Aggressively glitch the main portal header every ~10s
function doHeaderGlitch() {
  if (window.GOVNET.currentStage !== 1) return scheduleHeaderGlitch();

  const h1 = document.querySelector('#s1-header-text h1');
  if (!h1) return scheduleHeaderGlitch();

  const originalText = 'GOVNET PORTAL v2.1 — MINISTRY OF CITIZEN SERVICES';

  // Phase 1: scramble 
  h1.style.color = '#ff0000';
  h1.style.fontFamily = "'Courier New', monospace";
  h1.textContent = randomNoise(originalText.length);
  // Add some skewed glitch via transform if possible
  h1.style.transform = 'skewX(10deg)';

  // Phase 2: BACKROOMS
  setTimeout(() => {
    h1.textContent = 'BACKROOMS BACKROOMS BACKROOMS';
    h1.style.color = '#ffff00';
    h1.style.letterSpacing = '8px';
    h1.style.transform = 'skewX(-15deg)';
  }, 100);

  // Phase 3: Scramble again
  setTimeout(() => {
    h1.textContent = randomNoise(originalText.length);
    h1.style.color = '#ff0';
    h1.style.letterSpacing = '2px';
    h1.style.transform = 'skewX(5deg)';
  }, 400);

  // Phase 4: Restore
  setTimeout(() => {
    h1.textContent = originalText;
    h1.style.color = '';
    h1.style.fontFamily = '';
    h1.style.letterSpacing = '';
    h1.style.transform = '';
    scheduleHeaderGlitch();
  }, 500);
}

function scheduleHeaderGlitch() {
  const delay = 10000; // 10 seconds exactly per requirement
  setTimeout(doHeaderGlitch, delay);
}

// ---- Dead Nav Link Popups ----
function initNavLinks() {
  const handlers = {
    'nav-complaint': () => showPopup(
      'GOVNET Error 404-B',
      'This action requires Form 404-B to be filed in triplicate.<br><br>Form 404-B is available at the third sub-basement office, hours 9:00AM – 9:01AM (Tuesdays only).',
      'OK fine'
    ),
    'nav-tax': () => showPopup(
      'GOVNET — Tax Portal',
      'The Tax Portal Server has been temporarily unavailable since <strong>March 14, 2003</strong>.<br><br>Citizens are advised to continue payment regardless. Penalties apply.',
      'Of course'
    ),
    'nav-contact': () => showPopup(
      'GOVNET — Contact Us',
      'Our office hours are <strong>9:00AM to 4:00PM</strong>, Monday to Friday.<br><br>It is currently <strong>4:17PM on a Monday</strong>. Please try again tomorrow. (Office will be closed tomorrow.)',
      'This is fine'
    ),
    'nav-home': () => showPopup(
      'GOVNET — Portal v2.1',
      'You are already on the Home page, CITIZEN.<br><br>Attempting to navigate to a location you are already in is a violation of Directive 7-C. This incident has been logged.',
      'I understand'
    ),
    'nav-services': () => showPopup(
      'GOVNET — Citizen Services',
      'Citizen Services are currently <strong>offline for scheduled maintenance</strong>.<br><br>Estimated restoration: Q4 1998.',
      'OK'
    ),
  };

  Object.entries(handlers).forEach(([id, fn]) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        fn();
      });
    }
  });

  // Apply for Benefits → go to Stage 2
  const applyBtn = document.getElementById('nav-apply');
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.Audio && window.playAudio && window.playAudio('click');
      window.goToStage(2);
    });
  }
}

// ---- Very Subtle Screen Jitter (every few minutes) ----
function initJitter() {
  const jitterTarget = document.getElementById('stage1');
  if (!jitterTarget) return;

  function doJitter() {
    if (window.GOVNET.currentStage !== 1) return scheduleJitter();
    jitterTarget.classList.add('jitter');
    setTimeout(() => jitterTarget.classList.remove('jitter'), 400);
    scheduleJitter();
  }

  function scheduleJitter() {
    const delay = 90000 + Math.random() * 120000; // 1.5–3.5 min
    setTimeout(doJitter, delay);
  }

  scheduleJitter();
}

// ---- Footer Tiny Text update ----
function initFooter() {
  // The footer already flickers via CSS animation
  // Make BACK stand out for exactly 1 pixel bigger via JS toggling
  // The real clue is CSS color: #555 on #clue-word-back
}

// ---- Ticker ----
function initTicker() {
  const ticker = document.getElementById('s1-ticker');
  if (!ticker) return;
  ticker.textContent =
    '[ CLASSIFIED SUBSECTION 0 ] ' +
    'Level 0 of the Backrooms spans approximately 600 million square miles of identical yellow rooms. ' +
    ' ||| ' +
    'The fluorescent lights never go out. They hum at exactly 60 Hz. Citizens are advised to ignore this frequency. ' +
    ' ||| ' +
    'Entities in Level 0 are blind but are attracted to sound. Do not run. Do not speak. Do not breathe loudly. ' +
    ' ||| ' +
    'The moist carpet in Level 0 has been damp since before recorded history. Its moisture source is unknown. ' +
    ' ||| ' +
    'There are no windows. There are no doors. The only exit is the one you cannot find yet. ' +
    ' ||| ' +
    'Citizens who noclipped through reality report the smell of old moist carpet and a faint buzzing of lights as the first sensory inputs. ' +
    ' ||| ' +
    'Level 0 is non-Euclidean. You may walk in a straight line for 6 hours and return to where you started. ' +
    ' ||| ' +
    'The Backrooms were first documented in 2019. Origin is unknown. GOVNET classifies this as an administrative matter. ' +
    ' ||| ' +
    'Almond Water found in Level 1 is the primary hydration source for those who survive the first 72 hours. ' +
    ' ||| ' +
    'Do not look at the corners for too long. This is standard GOVNET Directive 00-∅. ';

}

// ---- Main entry for Stage 1 ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage !== 1) return;

  initCounter();
  initNavLinks();
  initJitter();
  initTicker();
  scheduleHeaderGlitch(); // start aggressive header glitch
});
