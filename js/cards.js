import { CARD_BY_ID } from './config.js';

const selected = new Set();
const subscribers = new Set();

export function getSelectedCards() {
  return [...selected].map((id) => CARD_BY_ID[id]).filter(Boolean);
}

export function getSelectedCardIds() {
  return [...selected];
}

export function subscribeToCards(callback) {
  subscribers.add(callback);
  callback(getSelectedCards());
  return () => subscribers.delete(callback);
}

export function addCard(cardId) {
  const card = CARD_BY_ID[cardId];
  if (!card || card.id === 'no_card' || selected.has(card.id)) return false;
  selected.add(card.id);
  notify();
  window.dispatchEvent(new CustomEvent('stroom:card-added', { detail: { card } }));
  return true;
}

export function removeCard(cardId) {
  if (!selected.delete(cardId)) return;
  notify();
}

function notify() {
  const cards = getSelectedCards();
  subscribers.forEach((callback) => callback(cards));
  window.dispatchEvent(new CustomEvent('stroom:cards-changed', { detail: { cards } }));
}
