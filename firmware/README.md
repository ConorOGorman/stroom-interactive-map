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

## Setup

1. Open `firmware/reader.py`.
2. Change:

```python
WIFI_SSID     = 'CHANGE_ME_WIFI_NAME'
WIFI_PASSWORD = 'CHANGE_ME_WIFI_PASSWORD'
```

3. Connect the M5Stack by USB.
4. Upload the reader:

```sh
python3 firmware/upload.py firmware/reader.py stroom_reader.py
```

5. Run `stroom_reader.py` from the M5Stack app list.
6. Read the IP shown on the M5Stack screen.
7. In the kiosk, click **Connect via WiFi** and enter only the IP, for example:

```text
192.168.1.42
```

The browser adds `ws://` and `:81` automatically.

## Network Notes

- The kiosk browser and M5Stack must be on the same WiFi network.
- Guest/event WiFi often blocks local device traffic. Use a phone hotspot or private router if connection fails.
- `ws://` works from local development and HTTP pages. If the deployed HTTPS site blocks local WebSocket connections, run the kiosk locally with `vercel dev` or use USB serial.

## Card Writer

`multi_writer.py` writes compact numeric class indexes to tags. These match `classIndex` in `js/config.js`.

```sh
python3 firmware/upload.py firmware/multi_writer.py stroom_writer.py
```
