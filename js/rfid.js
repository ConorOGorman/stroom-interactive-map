import { addCard, getSelectedCardIds, removeCard } from './cards.js';
import { CARD_BY_ID, CARD_BY_KEY, CARD_BY_CLASS_INDEX, DETECTION } from './config.js';

let port = null;
let wsSocket = null;
let relayPollTimer = null;
const debounce = new Map();

export function isRFIDSupported() {
  return 'serial' in navigator;
}

// Sets up keyboard mock mode (works without hardware) and returns immediately.
// Call connectReader() separately when the user clicks the connect button.
export function initRFID() {
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;
    const card = CARD_BY_KEY[e.key.toLowerCase()];
    if (card) {
      e.preventDefault();
      if (e.key === '7') {
        enterFullscreen();
        toggleCard(card.id);
        return;
      }
      if (e.key === '8') {
        exitFullscreen();
        processCardId(card.id);
        return;
      }
      processCardId(card.id);
    }
  });

  // Clear debounce for cards that get removed so they can be re-scanned immediately.
  window.addEventListener('stroom:cards-changed', (e) => {
    const activeIds = new Set(e.detail.cards.map((c) => c.id));
    for (const id of debounce.keys()) {
      if (!activeIds.has(id)) debounce.delete(id);
    }
  });
}

export async function connectReader(onStatus) {
  if (!isRFIDSupported()) {
    onStatus('unsupported');
    return;
  }
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    onStatus('connected');
    readLoop(onStatus);
  } catch {
    onStatus('error');
  }
}

async function readLoop(onStatus) {
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
  const reader = decoder.readable.getReader();
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('CARD:')) {
          const added = processCardId(trimmed.slice(5));
          if (added) onStatus('scanned');
        }
      }
    }
  } catch {
    onStatus('disconnected');
  } finally {
    reader.releaseLock();
    port = null;
  }
}

function processCardId(rawId) {
  // RFID cards store a numeric classIndex ("07"); keyboard mock uses full string IDs.
  let card = CARD_BY_ID[rawId];
  if (!card) {
    const idx = parseInt(rawId, 10);
    if (!isNaN(idx)) card = CARD_BY_CLASS_INDEX[idx];
  }
  if (!card || card.id === 'no_card') return false;
  const now = Date.now();
  if (debounce.has(card.id) && now - debounce.get(card.id) < DETECTION.debounceMs) return false;
  debounce.set(card.id, now);
  return addCard(card.id);
}

export function connectWifi(ip, onStatus) {
  if (wsSocket) {
    wsSocket.close();
    wsSocket = null;
  }
  const url = `ws://${ip}:81`;
  try {
    wsSocket = new WebSocket(url);
  } catch {
    onStatus('error');
    return;
  }

  const timeout = setTimeout(() => {
    if (wsSocket && wsSocket.readyState !== WebSocket.OPEN) {
      wsSocket.close();
      onStatus('error');
    }
  }, 6000);

  wsSocket.addEventListener('open', () => {
    clearTimeout(timeout);
    onStatus('connected');
  });

  wsSocket.addEventListener('message', (e) => {
    const msg = String(e.data).trim();
    if (msg.startsWith('CARD:')) {
      const added = processCardId(msg.slice(5));
      if (added) onStatus('scanned');
    }
  });

  wsSocket.addEventListener('close', () => {
    clearTimeout(timeout);
    wsSocket = null;
    onStatus('disconnected');
  });

  wsSocket.addEventListener('error', () => {
    clearTimeout(timeout);
    wsSocket = null;
    onStatus('error');
  });
}

export function connectCloudRelay(onStatus, session = 'default') {
  if (relayPollTimer) {
    clearTimeout(relayPollTimer);
    relayPollTimer = null;
  }

  let lastSeen = Date.now() - 5000;
  let stopped = false;

  onStatus('relay-connected');

  async function poll() {
    if (stopped) return;
    try {
      const response = await fetch(`/api/scans?session=${encodeURIComponent(session)}&since=${lastSeen}`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Relay unavailable');
      const data = await response.json();
      for (const event of data.events || []) {
        if (event.ts > lastSeen) lastSeen = event.ts;
        const added = processCardId(event.cardId);
        if (added) onStatus('scanned');
      }
      relayPollTimer = setTimeout(poll, 900);
    } catch {
      onStatus('error');
      relayPollTimer = setTimeout(poll, 2500);
    }
  }

  poll();

  return () => {
    stopped = true;
    if (relayPollTimer) clearTimeout(relayPollTimer);
    relayPollTimer = null;
  };
}

function enterFullscreen() {
  if (document.fullscreenElement) return;
  document.documentElement.requestFullscreen?.().catch(() => {});
}

function exitFullscreen() {
  if (!document.fullscreenElement) return;
  document.exitFullscreen?.().catch(() => {});
}

function toggleCard(cardId) {
  if (getSelectedCardIds().includes(cardId)) {
    removeCard(cardId);
    return;
  }
  processCardId(cardId);
}
