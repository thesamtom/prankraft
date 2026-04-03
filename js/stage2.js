/* ================================
   STAGE2.JS — Something Feels Wrong
   Glitches, drifting button, CLUE 2
   ================================ */

'use strict';

let submitAttempts = 0;
let navDriftInterval;
let legalBlurTimeout;

// ---- Name field "ARE YOU PAYING ATTENTION?" ----
function initNameField() {
  const nameInput = document.getElementById('s2-name');
  if (!nameInput) return;

  let resetTimer;
  nameInput.addEventListener('focus', () => {
    nameInput.value = 'ARE YOU PAYING ATTENTION?';
    resetTimer = setTimeout(() => {
      nameInput.value = '';
    }, 2000);
  });
  nameInput.addEventListener('blur', () => clearTimeout(resetTimer));
}

// ---- Submit button drifts away on hover ----
function initDriftButton() {
  const btn = document.getElementById('s2-submit-btn');
  if (!btn) return;

  let driftX = 0;
  let driftY = 0;

  btn.addEventListener('mouseenter', () => {
    if (submitAttempts >= 2) return; // stop drifting after 3rd click logic kicks in
    driftX = (Math.random() - 0.5) * 16;
    driftY = (Math.random() - 0.5) * 10;
    btn.style.setProperty('--drift-x', `${driftX}px`);
    btn.style.setProperty('--drift-y', `${driftY}px`);
    btn.classList.add('drifting');
  });
  btn.addEventListener('mouseleave', () => {
    btn.classList.remove('drifting');
    btn.style.setProperty('--drift-x', '0px');
    btn.style.setProperty('--drift-y', '0px');
  });
}

// ---- Field shake on submit with empty fields ----
function shakeField(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth; // reflow
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}

// ---- Submit button click logic ----
function initSubmitBtn() {
  const btn = document.getElementById('s2-submit-btn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    submitAttempts++;
    window.GOVNET.submitAttempts = submitAttempts;
    window.playAudio && window.playAudio('error');

    if (submitAttempts === 1) {
      showPopup(
        'GOVNET System Error',
        '⚠️ <strong>ERROR 33-B:</strong> System requires this form to be submitted in triplicate.<br><br>' +
        'Please print, sign, stamp, scan, re-enter, and submit all three copies simultaneously.<br><br>' +
        'Triplicate submission window closes in: <strong>Error computing time.</strong>',
        'Understood'
      );
      // Shake name field for effect
      shakeField('s2-name');
      shakeField('s2-citizen-id');

    } else if (submitAttempts === 2) {
      // Clock glitch before popup
      glitchClock();
      showPopup(
        'GOVNET — Office Hours Notice',
        '🕓 <strong>ERROR:</strong> Our offices closed at 4:00PM.<br><br>' +
        'Current time: <strong>Monday, 4:00PM</strong><br>' +
        'We will reopen: <strong>Monday, 9:00AM</strong><br><br>' +
        '<em>(This office is perpetually closed. Please try again later.)</em>',
        'It is Monday'
      );

    } else if (submitAttempts >= 3) {
      // Trigger the CLUE 2 moment + transition to Stage 3
      triggerClue2AndTransition();
    }
  });
}

// ---- Clock that shows wrong times ----
function initClock() {
  const clockEl = document.getElementById('s2-clock');
  if (!clockEl) return;

  const impossibleTimes = [
    '25:61', '13:99', '00:00:00 AM', '4:17 PM (PERMANENT)',
    '??:??', '--:--', 'TIME ERROR', 'NaN:NaN'
  ];
  let normal = true;

  setInterval(() => {
    if (window.GOVNET.currentStage !== 2) return;
    if (Math.random() < 0.12) {
      // Flicker to an impossible time
      const t = impossibleTimes[Math.floor(Math.random() * impossibleTimes.length)];
      clockEl.textContent = `Current Portal Time: ${t}`;
      setTimeout(() => {
        const now = new Date();
        clockEl.textContent = `Current Portal Time: ${now.toLocaleTimeString()}`;
      }, 800);
    } else {
      const now = new Date();
      clockEl.textContent = `Current Portal Time: ${now.toLocaleTimeString()}`;
    }
  }, 3000);
}

function glitchClock() {
  const clockEl = document.getElementById('s2-clock');
  if (!clockEl) return;
  clockEl.textContent = 'Current Portal Time: ̷̢̛̛͔̦͔̈́͝4̵:̵̡͔̙͒̊̂̐0̸̈́͊̑͜0̴̨͚͍͊Ø̶͚͓';
  setTimeout(() => {
    clockEl.textContent = 'Current Portal Time: ERROR';
  }, 500);
}

// ---- Nav link slowly drifts ----
function initNavDrift() {
  const driftEl = document.getElementById('s2-nav-drift');
  if (!driftEl) return;
  let driftAmount = 0;

  navDriftInterval = setInterval(() => {
    if (window.GOVNET.currentStage !== 2) return;
    driftAmount = Math.min(driftAmount + 1, 18);
    driftEl.style.marginLeft = `${driftAmount}px`;
  }, 5000);
}

// ---- Footer legal occasionally blurs ----
function initLegalBlur() {
  const legal = document.getElementById('s2-footer-legal');
  if (!legal) return;

  function doBlur() {
    if (window.GOVNET.currentStage !== 2) return scheduleLegalBlur();
    legal.classList.add('unreadable');
    setTimeout(() => legal.classList.remove('unreadable'), 600);
    scheduleLegalBlur();
  }

  function scheduleLegalBlur() {
    const delay = 15000 + Math.random() * 20000;
    legalBlurTimeout = setTimeout(doBlur, delay);
  }

  scheduleLegalBlur();
}

// ---- CLUE 2 — Marquee briefly says "ROOMS" ----
// Then transition to Stage 3
function triggerClue2AndTransition() {
  const marquee = document.getElementById('s2-marquee');
  if (!marquee) return;

  // Pause marquee animation, flash ROOMS
  const originalText = marquee.textContent;
  marquee.style.animationPlayState = 'paused';
  marquee.style.transform = 'translateX(0)';

  // Brief CSS glitch on the whole stage
  document.getElementById('stage2').style.animation =
    'brightnessShift 0.2s steps(1) 3, pageTilt 0.6s ease 1';

  // Change marquee to show ROOMS for 1 second
  setTimeout(() => {
    marquee.innerHTML =
      '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' +
      '<span style="color:#ff0;font-weight:bold;letter-spacing:6px;font-size:16px;">ROOMS</span>' +
      '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
  }, 300);

  // Then revert and glitch-transition to Stage 3
  setTimeout(() => {
    marquee.textContent = originalText;
    marquee.style.animationPlayState = '';
    marquee.style.transform = '';

    // Flash black then enter Stage 3
    window.flashBlack(700, () => {
      window.goToStage(3);
    });
  }, 1400);
}

// ---- Image that shifts slightly ----
function initImgDrift() {
  const img = document.getElementById('s2-gov-img');
  if (!img) return;

  // Already handled by CSS imgDrift animation
  // But occasionally do a more dramatic one every 30s
  setInterval(() => {
    if (window.GOVNET.currentStage !== 2) return;
    if (Math.random() < 0.3) {
      img.style.filter = 'hue-rotate(20deg) contrast(1.1)';
      setTimeout(() => {
        img.style.filter = '';
      }, 400);
    }
  }, 12000);
}

// ---- STAGE 2 ENTRY ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage !== 2) return;

  submitAttempts = window.GOVNET.submitAttempts || 0;

  initNameField();
  initDriftButton();
  initSubmitBtn();
  initClock();
  initNavDrift();
  initLegalBlur();
  initImgDrift();
});
