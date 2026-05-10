import { getSelectedCards } from './cards.js';

let qrInstance = null;

export function openQrOverlay(overlay) {
  const cards = getSelectedCards();
  const cardIds = cards.map((card) => card.id).join(',');
  const target = new URL('mobile.html', window.location.href);
  target.searchParams.set('cards', cardIds);
  const qrEl = overlay.querySelector('#qr-code');
  const summaryEl = overlay.querySelector('[data-qr-selection]');
  qrEl.innerHTML = '';
  qrInstance = new QRCode(qrEl, {
    text: target.href,
    width: 300,
    height: 300,
    colorDark: '#1A1A1A',
    colorLight: '#FFFFFF',
    correctLevel: QRCode.CorrectLevel.M,
  });
  summaryEl.textContent = cards.map((card) => card.label).join(', ');
  overlay.hidden = false;
}

export function closeQrOverlay(overlay) {
  overlay.hidden = true;
  qrInstance = null;
}
