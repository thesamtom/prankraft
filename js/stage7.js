'use strict';

let renderer, scene, camera, sphere, ambientLight;
let rafId;
let targetRotX = 0, targetRotY = 0;
let currentRotX = 0, currentRotY = 0;
let isActive = false;
let s7AudioCtx = null;
let s7CrackleTimer = null;

function initStage7() {
  if (document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(()=>{});
  } else if (document.documentElement.webkitRequestFullscreen) {
    document.documentElement.webkitRequestFullscreen();
  }

  document.addEventListener('fullscreenchange', () => {
    // Silence. No warning for Stage 7.
  });

  // Step 1 — Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  const wrap = document.getElementById('s7-renderer-wrap');
  if (wrap) wrap.appendChild(renderer.domElement);

  // Step 2 — Create scene
  scene = new THREE.Scene();

  // Step 3 — Create camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, 0);

  // Step 4 — Add ambient light
  ambientLight = new THREE.AmbientLight(0xfff8e7, 1.0);
  scene.add(ambientLight);

  // Step 5 — Create sphere
  const geometry = new THREE.SphereGeometry(500, 60, 40);

  // Step 6 — Load texture
  const loader = new THREE.TextureLoader();

  // Start render loop immediately
  isActive = true;
  animate();

  // Setup Web Audio API
  try {
    s7AudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const masterGain = s7AudioCtx.createGain();
    window.s7MasterGain = masterGain; // Expose for intensity control
    masterGain.gain.setValueAtTime(0, s7AudioCtx.currentTime);
    masterGain.gain.linearRampToValueAtTime(1, s7AudioCtx.currentTime + 3);
    masterGain.connect(s7AudioCtx.destination);

    // Hum
    const hum = s7AudioCtx.createOscillator();
    hum.type = 'sine';
    hum.frequency.setValueAtTime(60, s7AudioCtx.currentTime);
    const humGain = s7AudioCtx.createGain();
    humGain.gain.setValueAtTime(0.07, s7AudioCtx.currentTime);
    hum.connect(humGain);
    humGain.connect(masterGain);
    hum.start();

    // Harmonic
    const harmonic = s7AudioCtx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(120, s7AudioCtx.currentTime);
    const harmonicGain = s7AudioCtx.createGain();
    harmonicGain.gain.setValueAtTime(0.025, s7AudioCtx.currentTime);
    harmonic.connect(harmonicGain);
    harmonicGain.connect(masterGain);
    harmonic.start();

    // Noise
    const bufferSize = s7AudioCtx.sampleRate * 2;
    const noiseBuffer = s7AudioCtx.createBuffer(1, bufferSize, s7AudioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noiseSource = s7AudioCtx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    noiseSource.loop = true;
    const noiseFilter = s7AudioCtx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.5;
    const noiseGain = s7AudioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.008, s7AudioCtx.currentTime);
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noiseSource.start();

    // Spikes
    function triggerCrackle() {
      if (!s7AudioCtx) return;
      const crackle = s7AudioCtx.createOscillator();
      crackle.type = 'sawtooth';
      crackle.frequency.setValueAtTime(80 + Math.random() * 40, s7AudioCtx.currentTime);
      const crackleGain = s7AudioCtx.createGain();
      crackleGain.gain.setValueAtTime(0.06, s7AudioCtx.currentTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.001, s7AudioCtx.currentTime + 0.18);
      crackle.connect(crackleGain);
      crackleGain.connect(masterGain);
      crackle.start();
      crackle.stop(s7AudioCtx.currentTime + 0.18);
      s7CrackleTimer = setTimeout(triggerCrackle, 4000 + Math.random() * 8000);
    }
    triggerCrackle();

  } catch(e) {}

  loader.load(
    'assets/backrooms-360.jpg',
    (texture) => {
      const material = new THREE.MeshLambertMaterial({
        map: texture,
        side: THREE.BackSide
      });
      sphere = new THREE.Mesh(geometry, material);
      scene.add(sphere);

      setTimeout(() => {
        const s7 = document.getElementById('stage7');
        if (s7) s7.classList.add('visible');
      }, 100);
    },
    undefined,
    (err) => {
      console.error('Texture load failed (CORS error?). Rendering fallback.', err);
      // Fallback: A dark sick yellow sphere if texture gets blocked
      const fallbackMat = new THREE.MeshLambertMaterial({
        color: 0x5a5431,
        side: THREE.BackSide
      });
      sphere = new THREE.Mesh(geometry, fallbackMat);
      scene.add(sphere);
    }
  );

  // Step 7 — Add event listeners
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('resize', onResize);
}

function onMouseMove(e) {
  if (!isActive) return;
  const nx = (e.clientX / window.innerWidth - 0.5) * 2;
  const ny = (e.clientY / window.innerHeight - 0.5) * 2;
  targetRotY = nx * Math.PI * 0.85;
  targetRotX = -ny * Math.PI * 0.28;
  targetRotX = Math.max(-0.35, Math.min(0.35, targetRotX));
}

function onTouchMove(e) {
  if (!isActive || !e.touches[0]) return;
  const nx = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
  const ny = (e.touches[0].clientY / window.innerHeight - 0.5) * 2;
  targetRotY = nx * Math.PI * 0.85;
  targetRotX = -ny * Math.PI * 0.28;
  targetRotX = Math.max(-0.35, Math.min(0.35, targetRotX));
}

function onResize() {
  if (!isActive || !camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function getFlicker() {
  let intensity = 0.92;
  intensity += Math.sin(Date.now() * 0.0025) * 0.045;
  if (Math.random() < 0.02) {
    intensity += (Math.random() * 0.14 - 0.07);
  }
  return Math.max(0.72, Math.min(1.08, intensity));
}

function animate() {
  rafId = requestAnimationFrame(animate);
  if (!isActive) return;

  // Smooth camera lerp
  currentRotY += (targetRotY - currentRotY) * 0.035;
  currentRotX += (targetRotX - currentRotX) * 0.035;

  camera.rotation.order = 'YXZ';
  camera.rotation.y = currentRotY;
  camera.rotation.x = currentRotX;

  // Fluorescent flicker
  const baseIntensity = getFlicker();
  const boost = (window.s7Intensity && window.s7Intensity.flicker) ? 0.4 : 0;
  ambientLight.intensity = baseIntensity + (Math.random() * boost);

  renderer.render(scene, camera);
}

function cleanupStage7() {
  isActive = false;
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('touchmove', onTouchMove);
  window.removeEventListener('resize', onResize);
  
  if (renderer) {
    renderer.dispose();
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
  }
  
  if (sphere) {
    sphere.geometry.dispose();
    if (sphere.material.map) sphere.material.map.dispose();
    sphere.material.dispose();
  }

  if (s7CrackleTimer) {
    clearTimeout(s7CrackleTimer);
    s7CrackleTimer = null;
  }
  if (s7AudioCtx) {
    s7AudioCtx.close();
    s7AudioCtx = null;
  }
}

document.addEventListener('govnet:stageEnter', ({ detail }) => {
  if (detail.stage === 7) initStage7();
  else cleanupStage7();
});

function setStage7AudioIntensity(volume, flicker) {
  if (!s7AudioCtx || !isActive) return;
  // This is a simplified proxy — we'll use a global volume if we had one, 
  // but for now let's just expose the logic.
  window.s7Intensity = { volume, flicker };
}

window.setStage7AudioIntensity = setStage7AudioIntensity;
window.cleanupStage7 = cleanupStage7;
