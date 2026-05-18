# STROOMpoint RFID Firmware

Three standalone scripts for the M5Stack CoreS3. UIFlow2 is the default boot screen — select a script from App Run.

| Script | Device path | Purpose |
|---|---|---|
| `reader.py` | `/flash/apps/stroom_reader.py` | Reads cards, outputs `CARD:<id>` over USB serial + WiFi WebSocket + cloud relay |
| `write.py` | `/flash/apps/stroom_write.py` | Sequential writer — tap RFID cards 1–20 in order |
| `diagnose.py` | `/flash/apps/stroom_diag.py` | Write `07` to a card then re-tap to verify the read-back |
| `upload.py` | — | Upload helper (run on host, not device) |

## Setup

### 1. WiFi and cloud relay (reader only)

Open `firmware/reader.py` and set:

```python
WIFI_SSID     = 'your-wifi-name'
WIFI_PASSWORD = 'your-wifi-password'
CLOUD_SECRET  = 'your-relay-secret'   # must match RELAY_SECRET env var on Vercel
```

### 2. Upload to device

Connect M5Stack via USB, then:

```sh
python3 firmware/upload.py firmware/reader.py   stroom_reader.py
python3 firmware/upload.py firmware/write.py    stroom_write.py
python3 firmware/upload.py firmware/diagnose.py stroom_diag.py
```

If macOS assigns a different port:

```sh
python3 -m serial.tools.list_ports
python3 firmware/upload.py firmware/reader.py stroom_reader.py /dev/cu.G9
```

### 3. Vercel environment variables (cloud relay)

```text
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RELAY_SECRET=...
```

The Upstash Marketplace integration may use `KV_REST_API_URL` / `KV_REST_API_TOKEN` instead — both naming schemes are supported.

## Network notes

- The cloud relay (`Connect Web` button) works from any network — no local access required.
- The WiFi WebSocket (`ws://<ip>:81`) requires the browser and M5Stack to be on the same network.
- The HTTPS production site must use `Connect Web` — browsers block plain `ws://` from HTTPS pages.
