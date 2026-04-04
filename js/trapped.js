/* ================================
   TRAPPED.JS — Immersive Trap Mode
   Psychological discomfort without
   actual browser hijacking.
   ================================ */

'use strict';

// ---- State ----
const TRAP = {
  active: false,           // Is trap mode on?
  stage: null,             // Current trapped stage (3 or 4)
  leaveCount: 0,           // How many times user has tabbed away
  lastLeaveTime: null,     // Timestamp when they left
  tabSwitchCount4: 0,      // Tab switches specifically during Stage 4
  fullscreenDenied: false,
  overlayVisible: false,
  returnMessages: [],      // Queue of "we saw you" messages
};

// ---- Messages ----
const OVERLAY_MESSAGES_S3 = [
  { main: 'YOU CANNOT LEAVE YET.',         sub: 'THE BACKROOMS HAVE NO EXIT' },
  { main: 'RETURN TO THE PORTAL.',         sub: 'GOVNET IS WATCHING' },
  { main: 'WHERE ARE YOU GOING?',          sub: 'THERE IS NOTHING OUT THERE' },
  { main: 'THE HALLWAY EXTENDS FURTHER.',  sub: 'YOU ARE STILL IN LEVEL 0' },
  { main: 'YOU ARE NOT DONE HERE.',        sub: 'THE FLUORESCENT LIGHTS WAIT' },
];

const OVERLAY_MESSAGES_S4 = [
  { main: 'THE TERMINAL IS WAITING.',      sub: 'REALITY BREACH PAUSED' },
  { main: 'GOVNET DETECTED AN EXIT.',      sub: 'ENTITY PROXIMITY INCREASED' },
  { main: 'ACCESS ATTEMPT INTERRUPTED.',   sub: 'SESSION INTEGRITY COMPROMISED' },
  { main: 'THE CODE HAS NOT BEEN ENTERED.',sub: 'ESCAPE WINDOW NARROWING' },
  { main: 'WRONG DIRECTION, CITIZEN.',     sub: 'THE EXIT IS BEHIND THE TERMINAL' },
];

const OVERLAY_MESSAGES_S5 = [
  { main: 'THE MAZE IS STILL HERE.',       sub: 'SO ARE THEY' },
  { main: 'YOU CANNOT PAUSE THIS.',        sub: 'THE ENTITIES DO NOT STOP' },
  { main: 'WHERE DID YOU GO?',             sub: 'THEY MOVED WHILE YOU WERE GONE' },
  { main: 'THE BACKROOMS HAVE NO ALT-TAB.',sub: 'RETURN TO THE MAZE' },
];

const OVERLAY_MESSAGES_S6 = [
  { main: 'THE CREDITS ARE STILL ROLLING.',sub: 'THEY ALWAYS WILL BE' },
  { main: 'THERE IS NOTHING OUT THERE.',   sub: 'ONLY THE HUM REMAINS' },
  { main: 'YOU CANNOT LEAVE THE ARCHIVE.', sub: 'YOUR SESSION IS PERMANENT' },
];

const SAW_YOU_MESSAGES = [
  'WE SAW YOU LEAVE.',
  'YOU WERE GONE. WE NOTICED.',
  `YOU WERE GONE FOR {SEC} SECONDS.`,
  'DO NOT LEAVE AGAIN.',
  'WE COUNTED YOUR STEPS.',
  'THE LIGHTS FLICKERED WHILE YOU WERE AWAY.',
  'SOMETHING MOVED WHEN YOU LEFT.',
  'YOUR SESSION WAS OBSERVED.',
];

const S4_RETURN_LINES = [
  'YOU KEEP LEAVING.',
  'WHY ARE YOU AFRAID?',
  'THE BACKROOMS REMEMBER.',
  'ABSENCE NOTED IN SYSTEM LOG.',
  'ESCAPE PROBABILITY DECREASING.',
];

// ---- DOM refs ----
let trapOverlay, trapMainMsg, trapSubMsg, trapSawMsg, trapReturnHint;
let fullscreenWarning, trapDimFlash;

function initDOMRefs() {
  trapOverlay       = document.getElementById('trap-overlay');
  trapMainMsg       = document.getElementById('trap-main-msg');
  trapSubMsg        = document.getElementById('trap-sub-msg');
  trapSawMsg        = document.getElementById('trap-saw-msg');
  trapReturnHint    = document.getElementById('trap-return-hint');
  fullscreenWarning = document.getElementById('fullscreen-warning');
  trapDimFlash      = document.getElementById('trap-dim-flash');
}

// ---- Fullscreen ----
function requestFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen ||
              el.mozRequestFullScreen || el.msRequestFullscreen;
  if (req) {
    try {
      const promise = req.call(el);
      if (promise && promise.then) {
        promise.then(() => {
          // Hardware Lock: Uses the experimental Keyboard API to literally disable Esc (Chrome/Edge/Opera)
          if (navigator.keyboard && navigator.keyboard.lock) {
            navigator.keyboard.lock(['Escape']).catch(()=>{});
          }
        }).catch(() => {
          TRAP.fullscreenDenied = true;
          if (fullscreenWarning) {
            fullscreenWarning.textContent =
              '⚠ MANDATORY IMMERSION MODE: GOVNET HAS RESTRICTED LOCAL EXIT COMMANDS.';
            fullscreenWarning.classList.add('show');
            setTimeout(() => fullscreenWarning.classList.remove('show'), 6000);
          }
        });
      }
    } catch (e) {}
  }
}

function exitFullscreenSafe() {
  try {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      const ex = document.exitFullscreen || document.webkitExitFullscreen;
      if (ex) ex.call(document);
    }
  } catch (e) {}
}

// ---- Show trap overlay ----
function showTrapOverlay(stage) {
  if (!trapOverlay || TRAP.overlayVisible) return;

  TRAP.overlayVisible = true;
  TRAP.lastLeaveTime  = Date.now();

  const msgs = stage === 6 ? OVERLAY_MESSAGES_S6
             : stage === 5 ? OVERLAY_MESSAGES_S5
             : stage === 4 ? OVERLAY_MESSAGES_S4
             : OVERLAY_MESSAGES_S3;
  const pick = msgs[Math.floor(Math.random() * msgs.length)];

  trapMainMsg.textContent = pick.main;
  trapSubMsg.textContent  = pick.sub;
  trapSawMsg.textContent  = '';

  trapOverlay.className = `show stage${stage}-mode`;

  // Subtle return hint
  if (trapReturnHint) {
    trapReturnHint.textContent = '[CLICK OR PRESS ANY KEY TO CONTINUE]';
  }

  // Play static burst
  window.playAudio && window.playAudio('transition');

  // Intensity increase for audio contexts (Global 3-6 or Specialized 7)
  if (window.GOVNET.currentStage === 7) {
    if (window.s7MasterGain && window.setStage7AudioIntensity) {
       const ctx = window.s7MasterGain.context;
       window.s7MasterGain.gain.linearRampToValueAtTime(1.8, ctx.currentTime + 1.2);
       window.setStage7AudioIntensity(1.8, true);
    }
  } else if (window.GOVNET.currentStage >= 3) {
    if (window.setTrapIntensity) window.setTrapIntensity(2.0);
  }
}

// ---- Hide trap overlay ----
function hideTrapOverlay() {
  if (!trapOverlay || !TRAP.overlayVisible) return;
  TRAP.overlayVisible = false;

  // Flash dim then reveal
  if (trapDimFlash) {
    trapDimFlash.classList.add('flash-in');
    setTimeout(() => {
      trapOverlay.classList.remove('show');
      trapOverlay.className = '';
    }, 100);
    setTimeout(() => {
      trapDimFlash.classList.remove('flash-in');
    }, 500);
  } else {
    trapOverlay.classList.remove('show');
  }

  // Restore audio intensity
  if (window.GOVNET.currentStage === 7) {
    if (window.s7MasterGain && window.setStage7AudioIntensity) {
      const ctx = window.s7MasterGain.context;
      window.s7MasterGain.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.8);
      window.setStage7AudioIntensity(1.0, false);
    }
  } else if (window.GOVNET.currentStage >= 3) {
    if (window.setTrapIntensity) window.setTrapIntensity(0);
  }

  // Screen shake on return
  const stageEl = document.getElementById(`stage${TRAP.stage}`);
  if (stageEl) {
    stageEl.classList.add('shake');
    setTimeout(() => stageEl.classList.remove('shake'), 500);
  }

  // Static burst sound
  window.playAudio && setTimeout(() => window.playAudio('transition'), 150);

  // Side effects when returning
  onUserReturn();
}

// ---- Effects when user returns ----
function onUserReturn() {
  TRAP.leaveCount++;
  const elapsed = TRAP.lastLeaveTime
    ? Math.round((Date.now() - TRAP.lastLeaveTime) / 1000)
    : 0;

  // Show the "We saw you" message on the overlay before hiding it
  const rawMsg = SAW_YOU_MESSAGES[Math.floor(Math.random() * SAW_YOU_MESSAGES.length)];
  const sawMsg = rawMsg.replace('{SEC}', elapsed || Math.floor(Math.random() * 30 + 5));

  // Display it briefly after return (on the live stage)
  showReturnNotice(sawMsg);

  // Stage-specific return effects
  if (TRAP.stage === 3) handleStage3Return(elapsed);
  if (TRAP.stage === 4) handleStage4Return(elapsed);
}

// ---- Stage 3 return effects ----
function handleStage3Return(elapsed) {
  // Change visitor counter in Stage 1 for extra eeriness
  const counter = document.getElementById('s1-counter-display');
  if (counter) {
    const newVal = Math.floor(Math.random() * 200);
    counter.textContent = String(newVal).padStart(7, '0');
  }

  // Inject a "WE SAW YOU LEAVE" line into the stage 3 text container
  const container = document.getElementById('s3-lines-container');
  if (container) {
    const extraLine = document.createElement('span');
    extraLine.className = 's3-line bold-line';
    extraLine.style.color = '#cc0000';
    extraLine.style.opacity = '0';
    extraLine.textContent = `> WE SAW YOU LEAVE. YOU WERE GONE ${elapsed || '??'} SECONDS.`;
    container.appendChild(extraLine);
    setTimeout(() => { extraLine.style.opacity = '1'; }, 200);
  }

  // Stronger flicker for a few seconds
  const s3 = document.getElementById('stage3');
  if (s3) {
    s3.style.animation +=
      ', fluorescentFlicker 0.3s ease-in-out 6, pageBreath 1s ease-in-out 2';
  }
}

// ---- Stage 4 return effects ----
function handleStage4Return(elapsed) {
  TRAP.tabSwitchCount4++;

  // Add a new terminal line
  const msgs = S4_RETURN_LINES;
  const txt = msgs[Math.min(TRAP.tabSwitchCount4 - 1, msgs.length - 1)];
  addTerminalNote(txt);

  // Randomise the hum slightly
  window.playAudio && window.playAudio('terminal');

  // After 2+ switches, add a second note
  if (TRAP.tabSwitchCount4 >= 2) {
    setTimeout(() => {
      addTerminalNote(`SESSION INTERRUPTIONS: ${TRAP.tabSwitchCount4}. ENTITY PROXIMITY RISING.`);
    }, 800);
  }
}

// ---- Inject a line into Stage 4 output ----
function addTerminalNote(text) {
  const output = document.getElementById('s4-output');
  if (!output) return;
  const span = document.createElement('span');
  span.className = 's4-out-line typed error-line';
  span.style.color = '#ff8800';
  span.style.fontSize = '11px';
  span.textContent = `> [SYSTEM] ${text}`;
  output.appendChild(span);
  span.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

// ---- Show a brief floating return notice ----
function showReturnNotice(msg) {
  const notice = document.createElement('div');
  notice.style.cssText = `
    position: fixed;
    top: 60px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.85);
    color: #ff4444;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    letter-spacing: 2px;
    padding: 8px 20px;
    z-index: 6000;
    pointer-events: none;
    text-transform: uppercase;
    border: 1px solid rgba(255,68,68,0.3);
    animation: fadeIn 0.3s ease;
    white-space: nowrap;
  `;
  notice.textContent = msg;
  document.body.appendChild(notice);
  setTimeout(() => {
    notice.style.opacity = '0';
    notice.style.transition = 'opacity 0.5s';
    setTimeout(() => notice.remove(), 600);
  }, 3000);
}

// ---- Dismiss overlay on click or keypress ----
function setupOverlayDismiss() {
  if (!trapOverlay) return;
  trapOverlay.addEventListener('click', () => {
    if (TRAP.overlayVisible) hideTrapOverlay();
  });

  // GLOBAL KEYBOARD LOCKDOWN
  window.addEventListener('keydown', (e) => {
    if (!TRAP.active) return;
    
    // Disable Alt+Tab (kind of, depends on browser), Esc, F11, etc.
    const forbidden = ['Escape', 'F11', 'F12'];
    if (forbidden.includes(e.key)) {
      e.preventDefault();
      e.stopPropagation();
      
      // If they try to ESC, trigger the trap immediately
      if (e.key === 'Escape') {
         // Force the overlay if they aren't already in it
         showTrapOverlay(TRAP.stage);
         if (trapOverlay) {
           trapOverlay.classList.add('trap-glitch-error');
           trapOverlay.style.zIndex = "10000";
         }
         if (trapMainMsg) trapMainMsg.textContent = 'ACCESS DENIED';
         if (trapSubMsg) trapSubMsg.textContent = 'TAP TRACKPAD OR MOUSE TO CONTINUE SESSION';
         
         // Aggressively request FS again
         requestFullscreen();
      }
      return false;
    }

    if (TRAP.overlayVisible && !['Escape'].includes(e.key)) {
      hideTrapOverlay();
      if (trapOverlay) trapOverlay.classList.remove('trap-glitch-error');
    }
  }, true); // Use capture phase to intercept before other listeners
}

// ---- Visibility / focus listeners ---- 
function setupVisibilityListeners() {
  document.addEventListener('visibilitychange', () => {
    if (!TRAP.active) return;
    if (document.visibilityState === 'hidden') {
      // User switched tabs or minimized
      setTimeout(() => {
        // Only show overlay if still hidden after short delay
        if (document.visibilityState === 'hidden') {
          showTrapOverlay(TRAP.stage);
        }
      }, 300);
    } else {
      // User came back
      if (TRAP.overlayVisible) {
        hideTrapOverlay();
        if (trapOverlay) trapOverlay.classList.remove('trap-glitch-error');
      }
    }
  });

  window.addEventListener('blur', () => {
    if (!TRAP.active) return;
    // Small delay to avoid false positives (e.g. devtools)
    setTimeout(() => {
      if (!document.hasFocus() && TRAP.active) {
        showTrapOverlay(TRAP.stage);
      }
    }, 800);
  });

  window.addEventListener('focus', () => {
    if (!TRAP.active) return;
    if (TRAP.overlayVisible) {
      // Small delay so overlay is visible for at least 1 second
      setTimeout(() => {
        hideTrapOverlay();
        if (trapOverlay) trapOverlay.classList.remove('trap-glitch-error');
      }, 900);
    }
  });
}

// ---- Fullscreen change listener ----
function setupFullscreenListeners() {
  const onFSChange = () => {
    if (!TRAP.active) return;
    // Stage 7 gets trapped too now, but silently inside it! Wait, we STILL show the error overlay? Yes! "if any one tries to escape the fullscreen in bete=ween the stages 3 and above there should be a error message showing somethingin pure red and green glictchy"
    
    const isFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement
    );
    if (!isFullscreen && TRAP.active) {
      // Stage 3 and above (including Stage 7) are now inescapable
      if (TRAP.stage >= 3) {
         // Drop the glitchy trap overlay
         showTrapOverlay(TRAP.stage);
         if (trapOverlay) {
           trapOverlay.classList.add('trap-glitch-error');
           trapOverlay.style.zIndex = "10000";
         }

         if (trapMainMsg) trapMainMsg.textContent = 'YOU CANNOT ESCAPE THE BACKROOMS';
         if (trapSubMsg) trapSubMsg.textContent = 'TAP TRACKPAD OR MOUSE TO CONTINUE SESSION';

         // Aggressively attempt to re-enter fullscreen immediately.
         requestFullscreen();
         
         // Hammer it. Some browsers grant it eventually if a gesture token hangs around.
         const slamInterval = setInterval(() => {
           if (!TRAP.active) return clearInterval(slamInterval);
           const currentlyFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
           if (currentlyFS) {
             clearInterval(slamInterval);
             setTimeout(hideTrapOverlay, 800);
           } else {
             requestFullscreen();
           }
         }, 400);

         // The instant they touch the mouse or press any key, they give us a gesture token.
         // Snap them back into the nightmare.
         const instantReEnter = () => {
             const isFS = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement);
             if (!isFS) requestFullscreen();
             document.removeEventListener('keydown', instantReEnter);
             document.removeEventListener('mousemove', instantReEnter);
         };
         document.addEventListener('keydown', instantReEnter);
         document.addEventListener('mousemove', instantReEnter);

      } else {
         // Stage 1/2 just shows a warning
         if (fullscreenWarning) {
           fullscreenWarning.textContent =
             '⚠ GOVNET IMMERSION MODE DISENGAGED — ' +
             'CITIZEN SAFETY IS REDUCED OUTSIDE FULLSCREEN MODE.';
           fullscreenWarning.classList.add('show');
           setTimeout(() => fullscreenWarning.classList.remove('show'), 6000);
         }
      }
    }
  };
  document.addEventListener('fullscreenchange',       onFSChange);
  document.addEventListener('webkitfullscreenchange', onFSChange);
  document.addEventListener('mozfullscreenchange',    onFSChange);
}

// =============================
// Stage 4 — Enhanced wrong password effects
// Exported so terminal.js can call them
// =============================

let s4WrongAttempts = 0;

/**
 * Called by terminal.js on each wrong password attempt.
 * Returns a lockout duration in ms (0 = no lockout).
 */
function onWrongPassword() {
  s4WrongAttempts++;

  // Lock input for 2 seconds
  const inp = document.getElementById('s4-password-input');
  const btn = document.getElementById('s4-enter-btn');
  if (inp) inp.classList.add('locked');
  if (btn) btn.classList.add('locked');
  setTimeout(() => {
    if (inp) inp.classList.remove('locked');
    if (btn) btn.classList.remove('locked');
    if (inp && !inp.disabled) inp.focus();
  }, 2000);

  // After 3 wrong attempts — escalate
  if (s4WrongAttempts >= 3) triggerUnstableMode();

  return 2000; // lockout duration
}

function triggerUnstableMode() {
  const s4 = document.getElementById('stage4');
  if (s4) s4.classList.add('heavy-flicker');

  // Show unstable warning
  let warn = document.getElementById('s4-unstable-warning');
  if (!warn) {
    warn = document.createElement('div');
    warn.id = 's4-unstable-warning';
    warn.className = 's4-unstable-warning show';
    const terminal = document.getElementById('s4-terminal');
    if (terminal) terminal.appendChild(warn);
  }

  const unstableMsgs = [
    'THE EXIT IS BECOMING UNSTABLE.',
    'YOU ARE RUNNING OUT OF TIME.',
    'ENTITY HAS ENTERED THIS SECTOR.',
    'REALITY COHERENCE: CRITICAL.',
  ];
  warn.textContent = unstableMsgs[Math.min(s4WrongAttempts - 3, unstableMsgs.length - 1)];
  warn.classList.add('show');

  // Red screen flash
  window.flashRed && window.flashRed(600);

  // Play error sound louder (via new audio burst)
  window.playAudio && window.playAudio('error');
  setTimeout(() => window.playAudio && window.playAudio('backrooms'), 300);
}

// ---- Activate trap mode ----
function activateTrap(stage) {
  TRAP.active = true;
  TRAP.stage  = stage;
  s4WrongAttempts = 0;

  if (stage === 3) {
    TRAP.tabSwitchCount4 = 0;
    requestFullscreen();
  }
}

// ---- Deactivate trap mode ----
function deactivateTrap() {
  TRAP.active = false;
  TRAP.stage  = null;
  // Hide any overlay
  if (trapOverlay) {
    trapOverlay.classList.remove('show');
    trapOverlay.className = '';
  }
  TRAP.overlayVisible = false;
  // Exit fullscreen gracefully
  exitFullscreenSafe();
  // Hide fullscreen warning
  if (fullscreenWarning) fullscreenWarning.classList.remove('show');
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  initDOMRefs();
  setupOverlayDismiss();
  setupVisibilityListeners();
  setupFullscreenListeners();
});

// ---- Listen for stage transitions ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage === 3) {
    activateTrap(3);
  } else if (detail.stage === 4) {
    // Keep trap active, update stage ref
    TRAP.active = true;
    TRAP.stage  = 4;
    TRAP.tabSwitchCount4 = 0;
  } else if (detail.stage === 5) {
    // Keep trap active through the maze
    TRAP.active = true;
    TRAP.stage  = 5;
    requestFullscreen();
  } else if (detail.stage === 6) {
    // Keep trap active through credits — no escape
    TRAP.active = true;
    TRAP.stage  = 6;
    requestFullscreen();
  } else if (detail.stage === 7) {
    activateTrap(7);
    requestFullscreen();
  } else {
    // Stage 1, 2 — no trap
    deactivateTrap();
  }
});

// ---- Expose to other modules ----
window.TRAP      = TRAP;
window.onWrongPassword = onWrongPassword;
window.deactivateTrap  = deactivateTrap;
