/* ================================
   STAGE5.JS — Escape Celebration
   Timer, certificate, confetti
   ================================ */

'use strict';

// ---- Format elapsed time ----
function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  if (mins > 0) {
    return `${mins} minute${mins !== 1 ? 's' : ''} and ${secs} second${secs !== 1 ? 's' : ''}`;
  }
  return `${secs} second${secs !== 1 ? 's' : ''}`;
}

// ---- Generate random citizen number ----
function randomCitizenId() {
  return Math.floor(1000 + Math.random() * 9000);
}

// ---- Show escape time + certificate ----
function populateCertificate() {
  const start = window.GOVNET.startTime;
  const end   = window.GOVNET.endTime || Date.now();
  const elapsed = end - start;

  const timerEl = document.getElementById('s5-timer-value');
  if (timerEl) timerEl.textContent = formatTime(elapsed);

  const certIdEl = document.getElementById('s5-cert-citizen-id');
  if (certIdEl) certIdEl.textContent = randomCitizenId();

  const certTimeEl = document.getElementById('s5-cert-time');
  if (certTimeEl) certTimeEl.textContent = formatTime(elapsed);
}

// ---- Floating background particles ----
function spawnParticles() {
  const container = document.getElementById('s5-particles');
  if (!container) return;

  const colors = ['#f5c842', '#4f80ff', '#1966b3', '#a8d8ff', '#fffbe6'];
  const count = 18;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';

    const size = 8 + Math.random() * 24;
    const left = Math.random() * 100;
    const top  = Math.random() * 100;
    const dur  = 6 + Math.random() * 10;
    const delay = Math.random() * 8;
    const color = colors[Math.floor(Math.random() * colors.length)];

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      top: ${top}%;
      background: ${color};
      animation-duration: ${dur}s;
      animation-delay: -${delay}s;
      opacity: 0.35;
    `;
    container.appendChild(p);
  }
}

// ---- Confetti burst ----
function launchConfetti() {
  const canvas = document.getElementById('s5-confetti-canvas');
  if (!canvas) return;

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const colors = [
    '#f5c842','#1966b3','#4f80ff','#ff6b6b',
    '#51e898','#a78fff','#ff9f43','#00d2d3'
  ];

  const pieces = Array.from({ length: 180 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 200,
    r: 4 + Math.random() * 7,
    d: 3 + Math.random() * 5,
    color: colors[Math.floor(Math.random() * colors.length)],
    tilt: Math.random() * 10 - 5,
    tiltIncrement: (Math.random() - 0.5) * 0.15,
    opacity: 1,
    shape: Math.random() > 0.5 ? 'circle' : 'rect',
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.2,
  }));

  let frame = 0;

  function draw() {
    if (window.GOVNET.currentStage !== 5) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pieces.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;

      if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.r, -p.r / 2, p.r * 2, p.r);
      }
      ctx.restore();

      p.y += p.d;
      p.x += Math.sin(frame * 0.01 + p.tilt) * 0.8;
      p.angle += p.spin;
      p.tilt += p.tiltIncrement;

      if (p.y > canvas.height) {
        p.opacity -= 0.003;
      }
    });

    frame++;
    if (pieces.some(p => p.opacity > 0)) {
      requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  draw();

  // Resize handling
  window.addEventListener('resize', () => {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// ---- Share / restart button ----
function initShareBtn() {
  const btn = document.getElementById('s5-share-btn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    // Copy a fun message to clipboard
    const text = 'I just escaped the GOVNET Backrooms and got an April Fools certificate! 🏆 Try it yourself: [your-link-here]\n\nPrankraft by IEEE Computer Society SB GECT & SCET';
    navigator.clipboard.writeText(text).then(() => {
      btn.textContent = '✅ Copied to Clipboard!';
      setTimeout(() => { btn.textContent = '🔗 Share Your Escape'; }, 2500);
    }).catch(() => {
      btn.textContent = '🔗 Share Your Escape';
    });
  });
}

// ---- STAGE 5 ENTRY ----
document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage !== 5) return;

  populateCertificate();
  spawnParticles();

  // Slight delay before the confetti pop for drama
  setTimeout(() => {
    launchConfetti();
    window.playAudio && window.playAudio('celebrate');
  }, 800);

  initShareBtn();
});
