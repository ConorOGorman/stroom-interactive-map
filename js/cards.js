import { CARD_BY_ID, CARDS } from './config.js';

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

export function clearCards() {
  selected.clear();
  notify();
}

export function hydrateCards(cardIds) {
  selected.clear();
  cardIds.forEach((id) => {
    if (CARD_BY_ID[id] && id !== 'no_card') selected.add(id);
  });
  notify();
}

function notify() {
  const cards = getSelectedCards();
  subscribers.forEach((callback) => callback(cards));
  window.dispatchEvent(new CustomEvent('stroom:cards-changed', { detail: { cards } }));
}

export function renderCardChip(card) {
  const chip = document.createElement('span');
  chip.className = `card-chip card-chip--${card.category}`;
  chip.innerHTML = `<span class="chip-icon">${card.icon}</span><span>${card.label}</span>`;
  return chip;
}

export const selectableCards = CARDS.filter((card) => card.id !== 'no_card');
