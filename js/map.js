import { CARD_BY_ID } from './config.js';
import { getMatchedLocations, locations } from './locations.js';

let leafletMap = null;
const leafletMarkers = new Map(); // locationId → L.Marker
let selectedMarkerId = null;
let currentCardIds = [];

const featuredLocationIds = [
  'job_carpenter_8',
  'job_electrician_2',
  'job_electrician_8',
  'job_it_3',
  'job_carpenter_6',
  'job_carpenter_2',
];

const PIN_HTML = `<svg class="pin-svg" width="30" height="42" viewBox="-15 -38 30 42" overflow="visible" xmlns="http://www.w3.org/2000/svg">
  <path class="pin-body" d="M0 0 C-6 -8 -11 -15 -11 -22 C-11 -29 -6 -34 0 -34 C6 -34 11 -29 11 -22 C11 -15 6 -8 0 0Z"/>
  <circle class="pin-centre" cx="0" cy="-22" r="4"/>
</svg>`;

export async function initMap(container, infoPanel, matchBadge) {
  leafletMap = L.map(container, {
    center: [52.09, 4.79],
    zoom: 11,
    zoomControl: false,
    attributionControl: false,
  });

  L.control.zoom({ position: 'bottomright' }).addTo(leafletMap);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(leafletMap);

  await loadGroeneHartOutline();
  renderMarkers(infoPanel);
  showFeaturedLocations();
}

export function updateMap(cards, infoPanel, matchBadge) {
  if (!leafletMap) return;
  const ids = cards.map((c) => c.id);
  currentCardIds = ids;
  const matched = new Map(getMatchedLocations(ids).map((loc) => [loc.id, loc]));
  const hasSelection = ids.length > 0;

  leafletMarkers.forEach((marker, locationId) => {
    const el = marker.getElement();
    if (!el) return;
    const isMatched = matched.has(locationId);
    el.classList.toggle('marker--matched', isMatched);
    el.classList.toggle('marker--unmatched', hasSelection && !isMatched);
    el.classList.toggle('marker--selected', selectedMarkerId === locationId);
    marker.setZIndexOffset(isMatched ? 500 : 0);
  });

  if (matchBadge) {
    matchBadge.hidden = !hasSelection;
    matchBadge.textContent = `${matched.size} location${matched.size === 1 ? '' : 's'} match`;
  }

  if (selectedMarkerId && !matched.has(selectedMarkerId)) {
    closeInfoPanel(infoPanel);
  }
}

export function showFeaturedLocations(ids = featuredLocationIds) {
  if (!leafletMap) return;
  const featured = new Set(ids);
  leafletMarkers.forEach((marker, locationId) => {
    const el = marker.getElement();
    if (!el) return;
    const isFeatured = featured.has(locationId);
    el.classList.toggle('marker--matched', isFeatured);
    el.classList.toggle('marker--unmatched', !isFeatured);
    el.classList.remove('marker--selected');
    marker.setZIndexOffset(isFeatured ? 500 : 0);
  });
}

async function loadGroeneHartOutline() {
  try {
    const response = await fetch('assets/groene-hart.geojson');
    const data = await response.json();
    // Outer halo layer
    L.geoJSON(data, {
      style: {
        color: '#077CB3',
        weight: 14,
        opacity: 0.08,
        fillColor: '#00976E',
        fillOpacity: 0.05,
      },
      interactive: false,
    }).addTo(leafletMap);
    // Inner crisp line
    L.geoJSON(data, {
      style: {
        color: '#00976E',
        weight: 3,
        opacity: 0.72,
        fill: false,
      },
      interactive: false,
    }).addTo(leafletMap);
  } catch (_) {
    // outline is decorative — ignore fetch failures
  }
}

function renderMarkers(infoPanel) {
  locations.forEach((location) => {
    const icon = L.divIcon({
      className: 'map-marker',
      html: PIN_HTML,
      iconSize: [30, 42],
      iconAnchor: [15, 38],
    });

    const marker = L.marker([location.lat, location.lng], { icon }).addTo(leafletMap);
    const el = marker.getElement();
    el.dataset.locationId = location.id;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', location.name);

    marker.on('click', () => {
      if (!el.classList.contains('marker--matched')) return;
      if (!infoPanel) return;
      selectedMarkerId = location.id;
      openInfoPanel(location, infoPanel);
      leafletMarkers.forEach((m, id) => {
        m.getElement()?.classList.toggle('marker--selected', id === location.id);
      });
    });

    leafletMarkers.set(location.id, marker);
  });
}

function openInfoPanel(location, panel) {
  panel.classList.add('is-open');
  panel.querySelector('[data-location-name]').textContent = location.name;
  panel.querySelector('[data-location-town]').textContent = location.town;
  const hoursBadge = panel.querySelector('[data-location-hours]');
  hoursBadge.textContent = location.hours;
  hoursBadge.dataset.hours = location.hours.toLowerCase().replace('-', '');
  panel.querySelector('[data-location-description]').textContent = location.description;
  panel.querySelector('[data-location-services]').innerHTML = location.services.map((s) => `<li>${s}</li>`).join('');

  const allRelevant = new Set([
    ...location.relevant_job_types,
    ...location.relevant_personas,
    ...location.relevant_conditions,
  ]);
  const matched = currentCardIds.filter((id) => allRelevant.has(id));
  panel.querySelector('[data-location-tags]').innerHTML = matched
    .map((id) => {
      const card = CARD_BY_ID[id];
      if (!card) return '';
      return `<span class="tag-chip tag-chip--${card.category}">${card.label}</span>`;
    })
    .join('');
}

export function closeInfoPanel(panel) {
  selectedMarkerId = null;
  if (!panel) return;
  panel.classList.remove('is-open');
  leafletMarkers.forEach((m) => m.getElement()?.classList.remove('marker--selected'));
}
