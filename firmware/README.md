# STROOMpoint RFID Firmware

## WiFi Reader

`reader.py` is the active reader app. It reads RFID block `4` and sends scans in the browser format:

```text
CARD:07
```

It outputs the same message over USB serial and over a WebSocket server:

```text
ws://<m5stack-ip>:81
```

For the deployed website, it can also post scans to the cloud relay:

```text
https://<your-vercel-site>/api/scans
```

## Setup

1. Open `firmware/reader.py`.
2. Change:

```python
WIFI_SSID     = 'CHANGE_ME_WIFI_NAME'
WIFI_PASSWORD = 'CHANGE_ME_WIFI_PASSWORD'
CLOUD_RELAY_URL = 'https://stroom-interactive-map.vercel.app/api/scans'
CLOUD_RELAY_SECRET = 'CHANGE_ME_RELAY_SECRET'
CLOUD_RELAY_SESSION = 'default'
```

3. In Vercel, add an Upstash Redis integration and set these environment variables:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
RELAY_SECRET
```

The Vercel Upstash Marketplace integration may create `KV_REST_API_URL` and `KV_REST_API_TOKEN` instead. The API supports both.

`RELAY_SECRET` must match `CLOUD_RELAY_SECRET` in the firmware.

4. Connect the M5Stack by USB.
5. Upload the reader:

```sh
python3 firmware/upload.py firmware/reader.py stroom_reader.py
```

If macOS assigns a different serial port, list ports and pass the port as the third argument:

```sh
python3 -m serial.tools.list_ports
python3 firmware/upload.py firmware/reader.py stroom_reader.py /dev/cu.G9
```

6. Run `stroom_reader.py` from the M5Stack app list.
7. On the deployed website, click **Connect Web**. A phone, tablet, or laptop can now receive scans from the relay.
8. For local WebSocket testing, read the IP shown on the M5Stack screen and click **Connect via WiFi**. Enter only the IP, for example:

```text
192.168.1.42
```

The browser adds `ws://` and `:81` automatically.

## Network Notes

- The kiosk browser and M5Stack must be on the same WiFi network.
- Guest/event WiFi often blocks local device traffic. Use a phone hotspot or private router if connection fails.
- `ws://` works from local development and HTTP pages. The deployed HTTPS site should use **Connect Web** instead, because browsers block plain local WebSockets from HTTPS pages.

## Card Writer

`multi_writer.py` writes compact numeric class indexes to tags. These match `classIndex` in `js/config.js`.

```sh
python3 firmware/upload.py firmware/multi_writer.py stroom_writer.py
```
