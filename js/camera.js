import { CARD_BY_CLASS_INDEX, CARD_BY_ID, CARD_BY_KEY, DETECTION, MODEL_URL } from './config.js';
import { addCard } from './cards.js';

let model = null;
let videoEl = null;
let lastAccepted = new Map();
let mockMode = false;
let qrDetector = null;
let qrCanvas = null;
let qrContext = null;

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
  startQrDetectionLoop(statusEl);
}

async function loadModel(statusEl) {
  statusEl.textContent = 'Loading card model...';
  const baseUrl = MODEL_URL.endsWith('/') ? MODEL_URL : `${MODEL_URL}/`;
  const modelURL = `${baseUrl}model.json`;
  const metadataURL = `${baseUrl}metadata.json`;
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

function startQrDetectionLoop(statusEl) {
  if (!videoEl) return;
  try {
    if ('BarcodeDetector' in window) {
      qrDetector = new BarcodeDetector({ formats: ['qr_code'] });
    }
  } catch (error) {
    qrDetector = null;
  }

  qrCanvas = document.createElement('canvas');
  qrContext = qrCanvas.getContext('2d', { willReadFrequently: true });
  if (mockMode) statusEl.textContent = 'Show card QR to camera';

  const interval = 1000 / DETECTION.fps;
  setInterval(async () => {
    if (!videoEl || videoEl.readyState < 2) return;
    const card = await detectQrCard();
    if (card) acceptCard(card, statusEl);
  }, interval);
}

async function detectQrCard() {
  if (qrDetector) {
    try {
      const codes = await qrDetector.detect(videoEl);
      const detected = codes.map((code) => parseQrCard(code.rawValue)).find(Boolean);
      if (detected) return detected;
    } catch (error) {
      qrDetector = null;
    }
  }

  if (!window.jsQR || !qrCanvas || !qrContext || !videoEl.videoWidth || !videoEl.videoHeight) return null;
  qrCanvas.width = videoEl.videoWidth;
  qrCanvas.height = videoEl.videoHeight;
  qrContext.drawImage(videoEl, 0, 0, qrCanvas.width, qrCanvas.height);
  const imageData = qrContext.getImageData(0, 0, qrCanvas.width, qrCanvas.height);
  const code = window.jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });
  return code ? parseQrCard(code.data) : null;
}

function parseQrCard(value) {
  const raw = String(value || '').trim();
  const id = raw.startsWith('stroom-card:') ? raw.replace('stroom-card:', '') : raw;
  return CARD_BY_ID[id] || null;
}

function resolvePredictedCard(className) {
  const normalized = String(className).trim().toLowerCase();
  const numericMatch = normalized.match(/\b(?:class\s*)?(\d{1,2})\b/);
  if (numericMatch && CARD_BY_CLASS_INDEX[Number(numericMatch[1])]) {
    return CARD_BY_CLASS_INDEX[Number(numericMatch[1])];
  }
  return Object.values(CARD_BY_CLASS_INDEX).find((card) => {
    const id = card.id.toLowerCase();
    const label = card.label.toLowerCase();
    return normalized === id || normalized === label || normalized.includes(id);
  });
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
  window.dispatchEvent(new CustomEvent('cardDetected', { detail: { card } }));
  if (addCard(card.id)) {
    statusEl.textContent = `${card.label} detected`;
    statusEl.parentElement.classList.add('is-detected');
    setTimeout(() => {
      statusEl.textContent = mockMode ? 'Show card QR to camera' : 'Listening for cards...';
      statusEl.parentElement.classList.remove('is-detected');
    }, 1300);
  }
}
