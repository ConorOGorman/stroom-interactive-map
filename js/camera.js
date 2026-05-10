import { CARD_BY_CLASS_INDEX, CARD_BY_KEY, DETECTION, MODEL_URL } from './config.js';
import { addCard } from './cards.js';

let model = null;
let videoEl = null;
let lastAccepted = new Map();
let mockMode = false;

export async function initCamera(videoElement, statusEl, badgeEl) {
  videoEl = videoElement;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    videoEl.srcObject = stream;
    await videoEl.play();

    // FUTURE: WebGazer eye tracking integration
    // WebGazer uses the same camera stream.
    // When enabled, call webgazer.setVideoElement(videoEl)
    // and webgazer.begin() here.
    // Eye gaze coordinates feed into a heatmap overlay on the SVG.
  } catch (error) {
    statusEl.textContent = 'Camera unavailable. Mock mode is active.';
  }

  if (MODEL_URL) {
    await loadModel(statusEl);
    startDetectionLoop(statusEl);
  } else {
    enableMockMode(statusEl, badgeEl);
  }
}

async function loadModel(statusEl) {
  statusEl.textContent = 'Loading card model...';
  const modelURL = `${MODEL_URL}model.json`;
  const metadataURL = `${MODEL_URL}metadata.json`;
  model = await tmImage.load(modelURL, metadataURL);
  statusEl.textContent = 'Listening for cards...';
}

function startDetectionLoop(statusEl) {
  const interval = 1000 / DETECTION.fps;
  setInterval(async () => {
    if (!model || !videoEl || videoEl.readyState < 2) return;
    const predictions = await model.predict(videoEl);
    const best = predictions.reduce((winner, current) => current.probability > winner.probability ? current : winner);
    if (best.probability < DETECTION.confidenceThreshold) return;
    const card = resolvePredictedCard(best.className);
    if (card) acceptCard(card, statusEl);
  }, interval);
}

function resolvePredictedCard(className) {
  const numericPrefix = Number(String(className).split(/[:\s_-]/)[0]);
  if (Number.isFinite(numericPrefix) && CARD_BY_CLASS_INDEX[numericPrefix]) return CARD_BY_CLASS_INDEX[numericPrefix];
  return Object.values(CARD_BY_CLASS_INDEX).find((card) => card.id === className || card.label === className);
}

function enableMockMode(statusEl, badgeEl) {
  mockMode = true;
  badgeEl.hidden = false;
  statusEl.textContent = 'Show Cards on Camera';
  window.addEventListener('keydown', (event) => {
    const target = event.target;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const card = CARD_BY_KEY[event.key.toLowerCase()];
    if (card) {
      event.preventDefault();
      acceptCard(card, statusEl);
    }
  });
}

function acceptCard(card, statusEl) {
  if (card.id === 'no_card') return;
  const last = lastAccepted.get(card.id) || 0;
  if (Date.now() - last < DETECTION.debounceMs) return;
  lastAccepted.set(card.id, Date.now());
  if (addCard(card.id)) {
    statusEl.textContent = `${card.label} detected`;
    statusEl.parentElement.classList.add('is-detected');
    setTimeout(() => {
      statusEl.textContent = mockMode ? 'Show Cards on Camera' : 'Listening for cards...';
      statusEl.parentElement.classList.remove('is-detected');
    }, 1300);
  }
}
