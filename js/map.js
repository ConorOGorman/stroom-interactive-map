import { CARD_BY_ID } from './config.js';
import { getMatchedLocations, locations } from './locations.js';

let svg = null;
let markerLayer = null;
let selectedMarkerId = null;

export async function initMap(container, infoPanel, matchBadge) {
  svg = await loadSvg();
  svg.classList.add('region-map');
  container.appendChild(svg);
  ensureLayers();
  renderMarkers(infoPanel);
  updateMap([], infoPanel, matchBadge);
}

export function updateMap(cards, infoPanel, matchBadge) {
  if (!markerLayer) return;
  const ids = cards.map((card) => card.id);
  const matched = new Map(getMatchedLocations(ids).map((location) => [location.id, location]));
  const hasSelection = ids.length > 0;
  markerLayer.querySelectorAll('circle[data-location-id]').forEach((marker) => {
    const location = locations.find((item) => item.id === marker.dataset.locationId);
    const isMatched = matched.has(location.id);
    marker.classList.toggle('marker--matched', isMatched);
    marker.classList.toggle('marker--unmatched', hasSelection && !isMatched);
    marker.classList.toggle('marker--selected', selectedMarkerId === location.id);
    marker.setAttribute('aria-disabled', String(!isMatched));
  });
  matchBadge.hidden = !hasSelection;
  matchBadge.textContent = `${matched.size} location${matched.size === 1 ? '' : 's'} match`;
  if (selectedMarkerId && !matched.has(selectedMarkerId)) {
    closeInfoPanel(infoPanel);
  }
}

async function loadSvg() {
  try {
    const response = await fetch('assets/map.svg');
    if (!response.ok) throw new Error('Map SVG not found');
    const text = await response.text();
    const parsed = new DOMParser().parseFromString(text, 'image/svg+xml');
    const loadedSvg = parsed.documentElement;
    if (!loadedSvg.getAttribute('viewBox')) throw new Error('SVG needs a viewBox');
    return document.importNode(loadedSvg, true);
  } catch (error) {
    const fallback = document.getElementById('fallback-map-template');
    return fallback.content.querySelector('svg').cloneNode(true);
  }
}

function ensureLayers() {
  const namespace = 'http://www.w3.org/2000/svg';
  markerLayer = document.createElementNS(namespace, 'g');
  markerLayer.setAttribute('id', 'location-markers');
  const gazeLayer = document.createElementNS(namespace, 'g');
  gazeLayer.setAttribute('id', 'gaze-overlay');
  svg.append(markerLayer, gazeLayer);
}

function renderMarkers(infoPanel) {
  markerLayer.innerHTML = '';
  locations.forEach((location) => {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    marker.dataset.locationId = location.id;
    marker.classList.add('map-marker');
    marker.setAttribute('cx', `${location.svgX}%`);
    marker.setAttribute('cy', `${location.svgY}%`);
    marker.setAttribute('r', '8');
    marker.setAttribute('tabindex', '0');
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', location.name);
    marker.addEventListener('click', () => {
      if (!marker.classList.contains('marker--matched')) return;
      selectedMarkerId = location.id;
      openInfoPanel(location, infoPanel);
      markerLayer.querySelectorAll('.map-marker').forEach((item) => item.classList.toggle('marker--selected', item === marker));
    });
    marker.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') marker.dispatchEvent(new Event('click'));
    });
    markerLayer.appendChild(marker);
  });
}

function openInfoPanel(location, panel) {
  panel.hidden = false;
  panel.classList.add('is-open');
  panel.querySelector('[data-location-name]').textContent = location.name;
  panel.querySelector('[data-location-town]').textContent = `${location.town} · ${location.hours}`;
  panel.querySelector('[data-location-services]').innerHTML = location.services.map((service) => `<li>${service}</li>`).join('');
  panel.querySelector('[data-location-tags]').innerHTML = [
    ...location.relevant_job_types,
    ...location.relevant_personas.slice(0, 2),
  ].map((id) => `<span>${CARD_BY_ID[id]?.label || id}</span>`).join('');
}

export function closeInfoPanel(panel) {
  selectedMarkerId = null;
  panel.classList.remove('is-open');
  panel.hidden = true;
  markerLayer?.querySelectorAll('.map-marker').forEach((item) => item.classList.remove('marker--selected'));
}
