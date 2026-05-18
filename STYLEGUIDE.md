# STROOMpoint Design Tokens
Extracted from stroomgroenehart.nl — May 2026

---

## Colours

### Brand primaries
| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--stroom-blue` | `#077CB3` | `rgb(7, 124, 179)` | Primary brand, sections, footer, headers |
| `--stroom-green` | `#00976E` | `rgb(0, 151, 110)` | Secondary brand, Groene Hart accent |
| `--stroom-orange` | `#ED5C01` | `rgb(237, 92, 1)` | CTAs, links, buttons |
| `--stroom-blue-dark` | `#0C71C3` | `rgb(12, 113, 195)` | Hover states, darker blue variant |

### Neutrals
| Token | Hex | RGB | Usage |
|---|---|---|---|
| `--stroom-text` | `#3E3E3D` | `rgb(62, 62, 61)` | Body text |
| `--stroom-text-light` | `#505050` | `rgb(80, 80, 80)` | Nav, secondary text |
| `--stroom-white` | `#FFFFFF` | — | Backgrounds, reversed type |

---

## Gradients

```css
/* Hero / section divider — blue to green (left→right) */
linear-gradient(90deg, #077CB3 0%, #00976E 100%)

/* Reversed — green to blue */
linear-gradient(-90deg, #077CB3 0%, #00976E 100%)

/* Overlay on photography */
linear-gradient(160deg, rgba(0, 151, 110, 0.75) 0%, rgba(7, 124, 179, 0.45) 100%)

/* Fade to blue (bottom panel) */
linear-gradient(10deg, rgba(7, 124, 179, 0) 35%, #077CB3 100%)
```

---

## Typography

| Element | Font | Size | Weight |
|---|---|---|---|
| Body | `din-2014, sans-serif` | 14–15px | 400 |
| H1 | `din-2014, sans-serif` | 60px | 700 |
| H2 | `din-2014, sans-serif` | 30px | 700 |
| H3 | `din-2014, sans-serif` | 26px | 700 |
| Nav | `din-2014, sans-serif` | 20px | 400 |
| Button | `din-2014, sans-serif` | 20px | 700 |

Note: `din-2014` is a licensed Adobe font. Use `Inter` as the fallback in this project (already loaded).

---

## Map — Groene Hart outline

Derived from brand colours:

```javascript
// Leaflet GeoJSON style
{
  color: '#00976E',        // Stroom green — thematic match for "Groene Hart"
  weight: 2.5,
  opacity: 0.65,
  fillColor: '#00976E',
  fillOpacity: 0.07,
  lineCap: 'round',
  lineJoin: 'round',
}
```

For a two-tone glow effect (outer halo + crisp inner line), render the layer twice:
1. Outer: `weight: 8, opacity: 0.08, color: '#077CB3'`
2. Inner: `weight: 2, opacity: 0.7, color: '#00976E'`

---

## Map — Tile base

CartoDB Positron (`light_all`) — clean, low-contrast, lets brand colours dominate.
Consider CartoDB Voyager (`rastertiles/voyager`) for more geographic detail with roads/labels visible.
