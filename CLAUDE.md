# CLAUDE.md

Guidance for coding agents working in this repository.

## Project Summary

This is a browser-based STROOMpoint pop-up stall kiosk. Visitors scan physical RFID cards, or use keyboard shortcuts during development, and a Leaflet map highlights matching Groene Hart job/training opportunities. Visitors can express interest and receive a custom email through the Vercel serverless API.

Active product flow:

```text
RFID / keyboard card input
→ selected-card state
→ location matching
→ Leaflet markers and location panel
→ interest form
→ /api/send-map
→ Resend email
```

The old camera, QR overlay, Teachable Machine, and custom SVG-map implementation has been removed. Do not reintroduce that path unless the user explicitly asks for it.

## Run Commands

Full local app, including `/api/send-map`:

```sh
vercel dev --listen 3000
```

Static-only inspection:

```sh
python3 -m http.server 8080
```

Build validation:

```sh
vercel build --yes
vercel build --yes --prod
```

Deploy production:

```sh
vercel deploy --prod --yes
```

## Vercel Project

The project is linked under `.vercel/project.json`:

```text
projectName: stroom-interactive-map
production URL: https://stroom-interactive-map.vercel.app
```

Vercel CLI commands may require network approval in sandboxed environments.

## Environment Variables

Required for email sending:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="STROOMpoint <onboarding@resend.dev>"
EMAIL_REPLY_TO=you@example.com
LEAD_NOTIFY_EMAIL=you@example.com
```

`LEAD_NOTIFY_EMAIL` is optional and receives a blind copy. `.env` is ignored by git. If a real Resend key has been shared in chat or committed accidentally, rotate it in Resend before public use.

Required for web/tablet RFID relay:

```env
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RELAY_SECRET=
```

The Vercel Marketplace Upstash integration may provide `KV_REST_API_URL` and `KV_REST_API_TOKEN` instead; `api/scans.js` supports both naming schemes. The M5Stack firmware `CLOUD_RELAY_SECRET` must match `RELAY_SECRET`. Do not commit real WiFi passwords, Redis tokens, or relay secrets.

## Important Files

| File | Purpose |
|---|---|
| `index.html` | Main kiosk map, RFID controls, location panel, interest modal |
| `cards.html` | Printable 20-card RFID deck |
| `mobile.html` | Mobile follow-up page from selected card/location URL params |
| `css/styles.css` | Shared kiosk, print, mobile, modal, and map styling |
| `api/send-map.js` | Vercel serverless function that sends custom email via Resend |
| `api/scans.js` | Vercel serverless RFID scan relay backed by Upstash Redis |
| `assets/groene-hart.geojson` | Groene Hart outline rendered on the Leaflet map |
| `js/config.js` | Card definitions, class indexes, keyboard shortcuts |
| `js/cards.js` | Selected-card singleton state and subscriptions |
| `js/rfid.js` | Keyboard mock mode, Web Serial RFID, cloud relay polling, WiFi/WebSocket RFID input, fullscreen shortcuts |
| `js/locations.js` | Mock opportunity data, town coordinates, matching rules |
| `js/map.js` | Leaflet initialization, tile layer, GeoJSON outline, markers, location panel |
| `firmware/multi_writer.py` | Current RFID card writer using numeric class indexes |
| `firmware/reader.py` | M5Stack RFID reader outputting `CARD:<value>` over USB serial |
| `firmware/upload.py` | Upload helper for M5Stack app files |
| `firmware/stroom_diag.py` | RFID diagnostic script |

## Current Card/Input Model

Cards are defined in `js/config.js`. Each selectable card has:

- `classIndex`: numeric ID used by RFID tags, e.g. Electrician is `7`
- `id`: full app identifier, e.g. `job_electrician`
- `label`
- `category`: `persona`, `job`, `condition`, or `situation`
- `icon`
- optional `key` for keyboard mock mode

RFID tags should store compact numeric class indexes, usually zero-padded strings such as `07`, not long string IDs. `js/rfid.js` maps numeric values back through `CARD_BY_CLASS_INDEX`.

Keyboard shortcuts:

- `7`: toggles Electrician and requests browser fullscreen
- `8`: exits fullscreen and adds Carpenter/Construction
- Other card keys are defined in `CARD_BY_KEY`

## Matching Rules

`getMatchedLocations(cardIds)` in `js/locations.js` controls marker visibility.

Current rules:

- Job cards can drive map results.
- Hours/condition cards can drive map results by themselves.
- Persona cards refine selected jobs/conditions but do not drive results alone.
- Situation cards, such as `Looking for Training`, do not drive results alone.
- Multiple selected hour cards match any selected hour type, not all at once.
- Situation cards add score/context only when a job or condition already produces matches.

Useful expected counts for quick sanity checks:

```text
getMatchedLocations(['situation_training']).length === 0
getMatchedLocations(['condition_parttime']).length === 19
getMatchedLocations(['job_electrician']).length === 9
```

## Map Behavior

`js/map.js` uses Leaflet with Carto Voyager tiles:

```text
https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png
```

It renders `assets/groene-hart.geojson` twice: a soft outer halo and a sharper inner boundary line. Pins are custom `L.divIcon` SVG markers. The map requires internet access for Leaflet CDN and Carto tiles unless those assets are vendored later.

Only matched markers are clickable. Clicking a marker opens the left location panel and fills:

- name
- town
- hours badge
- description
- services
- matched card tags

## Email Flow

Both `mobile.html` and the kiosk interest modal post JSON to:

```text
/api/send-map
```

`api/send-map.js` validates name/email, limits card/location payload sizes, builds HTML and plain-text email, and calls Resend with `fetch`. It must never expose the Resend API key client-side.

## Web RFID Relay

The hosted HTTPS site cannot reliably connect to `ws://<m5-ip>:81` because browsers block mixed-content local WebSockets from HTTPS pages, and phone hotspots can block device-to-device TCP. The production path is:

```text
M5Stack reader
→ POST /api/scans with x-reader-secret
→ Upstash Redis short-lived scan list
→ website Connect Web button polls /api/scans
→ js/rfid.js processes card IDs
```

`api/scans.js` keeps only recent events and expires the Redis key after one hour.

## Firmware Notes

The active RFID writer is `firmware/multi_writer.py`, which writes numeric `classIndex` values to RFID tags. The old full-string writer was removed because many card IDs are longer than one RFID block and would be truncated.

The browser supports two hardware input paths:

- USB Web Serial: `connectReader()`
- Web relay for hosted phone/tablet use: `connectCloudRelay(onStatus)` polling `/api/scans`
- WiFi/WebSocket local testing: `connectWifi(ip, onStatus)` using `ws://<ip>:81`

## Cleanup State

Removed as intentionally obsolete:

- `js/camera.js`
- `js/qr.js`
- `model/README.md`
- old SVG map asset and unused brand/image assets
- QR generation on printable cards
- camera/control-panel/QR overlay CSS
- old full-string RFID writer

Do not assume those removed files exist.

## Verification

Before finishing substantive edits, run:

```sh
node --check js/cards.js
node --check js/config.js
node --check js/rfid.js
node --check js/locations.js
node --check js/map.js
node --check api/send-map.js
python3 -m json.tool assets/groene-hart.geojson >/dev/null
```

For deploy confidence, run:

```sh
vercel build --yes --prod
```

Known harmless warning: Node may warn that ES module files have no package type because this project intentionally has no `package.json`.
