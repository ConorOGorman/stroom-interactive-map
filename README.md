# STROOMpoint Interactive Map

Browser-based kiosk prototype for a STROOMpoint pop-up stall. Visitors scan RFID-enabled cards or use keyboard shortcuts, and the map highlights matching Groene Hart job and training opportunities.

## Run Locally

Use Vercel dev when testing the email API:

```sh
vercel dev --listen 3000
```

Then open:

```text
http://localhost:3000
```

For static-only work, a basic server is enough:

```sh
python3 -m http.server 8080
```

## Pages

| File | Purpose |
|---|---|
| `index.html` | Main kiosk map with RFID/WebSocket input, Leaflet map, location panel, and interest form |
| `cards.html` | Printable 20-card deck matching the card IDs/class indexes |
| `mobile.html` | Mobile follow-up page that can send a selected map by email |

## Architecture

```text
js/config.js      Card definitions and keyboard shortcuts
js/cards.js       Selected-card state and subscriptions
js/rfid.js        Keyboard mock mode, Web Serial RFID, and WiFi/WebSocket RFID input
js/locations.js   Mock opportunity data and matching rules
js/map.js         Leaflet map, Groene Hart outline, marker rendering, location panel
api/send-map.js   Vercel serverless email endpoint using Resend
```

## Data Flow

1. A card is scanned or a keyboard shortcut is pressed.
2. `js/rfid.js` resolves the card ID or numeric class index.
3. `addCard()` in `js/cards.js` updates selected-card state.
4. `index.html` receives the update through `subscribeToCards()`.
5. `js/map.js` calls `getMatchedLocations()` from `js/locations.js`.
6. Matching Leaflet markers become visible.
7. The interest form posts to `/api/send-map`, which sends email through Resend.

## Email Setup

Required environment variables:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
EMAIL_FROM="STROOMpoint <onboarding@resend.dev>"
EMAIL_REPLY_TO=you@example.com
LEAD_NOTIFY_EMAIL=you@example.com
```

`LEAD_NOTIFY_EMAIL` is optional.

## RFID Cards

The browser accepts both full card IDs and numeric `classIndex` values. The current firmware writes compact numeric values such as `07` to RFID tags, which are mapped back to cards through `CARD_BY_CLASS_INDEX` in `js/config.js`.
