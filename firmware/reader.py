# pyrefly: ignore
# STROOMpoint RFID Reader — M5Stack CoreS3 + RFID2 Unit
# Outputs CARD:<id> over USB serial AND WiFi WebSocket when a programmed tag is tapped

import M5  # pyrefly: ignore
from M5 import Lcd  # pyrefly: ignore
from machine import I2C, Pin  # pyrefly: ignore
from unit.rfid import RFIDUnit  # pyrefly: ignore
import time
import network  # pyrefly: ignore
import socket  # pyrefly: ignore
import hashlib
import ubinascii  # pyrefly: ignore
try:
    import urequests as requests  # pyrefly: ignore
except:
    try:
        import requests  # pyrefly: ignore
    except:
        requests = None

# ── WiFi config ───────────────────────────────────────────────────────────────
# Change these before uploading to the M5Stack. Use a private router or hotspot
# if venue WiFi blocks device-to-device traffic.
WIFI_SSID     = 'CHANGE_ME_WIFI_NAME'
WIFI_PASSWORD = 'CHANGE_ME_WIFI_PASSWORD'
WS_PORT       = 81
CLOUD_RELAY_URL = 'https://stroom-interactive-map.vercel.app/api/scans'
CLOUD_RELAY_SECRET = 'CHANGE_ME_RELAY_SECRET'
CLOUD_RELAY_SESSION = 'default'
# ─────────────────────────────────────────────────────────────────────────────

BLOCK = 4
DEBOUNCE_MS = 3000
WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

last_card_id = ''
last_ms = 0
ws_clients = []
server_sock = None
device_ip = None

# ── Display helpers ────────────────────────────────────────────────────────────

def show_idle():
    Lcd.clear(0x1A3A2A)
    Lcd.setTextColor(0xFFFFFF, 0x1A3A2A)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 10)
    Lcd.print('STROOMpoint')
    Lcd.setCursor(10, 40)
    Lcd.print('RFID Reader')
    if device_ip:
        Lcd.setTextColor(0x00FF88, 0x1A3A2A)
        Lcd.setTextSize(1)
        Lcd.setCursor(10, 75)
        Lcd.print('WiFi: ' + device_ip)
        Lcd.setCursor(10, 90)
        Lcd.print('WS: ' + device_ip + ':' + str(WS_PORT))
    Lcd.setTextColor(0xAAAAAA, 0x1A3A2A)
    Lcd.setTextSize(1)
    Lcd.setCursor(10, 110)
    Lcd.print('Tap a card...')

def show_message(line1, line2=''):
    Lcd.clear(0x1A3A2A)
    Lcd.setTextColor(0xFFFFFF, 0x1A3A2A)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 10)
    Lcd.print('STROOMpoint')
    Lcd.setTextSize(1)
    Lcd.setTextColor(0xAAAAAA, 0x1A3A2A)
    Lcd.setCursor(10, 50)
    Lcd.print(line1)
    if line2:
        Lcd.setCursor(10, 70)
        Lcd.print(line2)

# ── WiFi ───────────────────────────────────────────────────────────────────────

def connect_wifi():
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if wlan.isconnected():
        return wlan.ifconfig()[0]
    show_message('Connecting WiFi...', WIFI_SSID)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    for _ in range(40):
        if wlan.isconnected():
            return wlan.ifconfig()[0]
        time.sleep_ms(500)
    return None

# ── WebSocket server ───────────────────────────────────────────────────────────

def ws_handshake(conn):
    try:
        data = b''
        conn.settimeout(2.0)
        while b'\r\n\r\n' not in data:
            chunk = conn.recv(256)
            if not chunk:
                return False
            data += chunk
        key = None
        for line in data.decode('utf-8', 'ignore').split('\r\n'):
            if line.lower().startswith('sec-websocket-key:'):
                key = line.split(':', 1)[1].strip()
                break
        if not key:
            return False
        digest = hashlib.sha1((key + WS_GUID).encode()).digest()
        accept = ubinascii.b2a_base64(digest).decode().strip()
        conn.send((
            'HTTP/1.1 101 Switching Protocols\r\n'
            'Upgrade: websocket\r\n'
            'Connection: Upgrade\r\n'
            'Access-Control-Allow-Origin: *\r\n'
            'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
        ).encode())
        return True
    except:
        return False

def ws_send(conn, text):
    data = text.encode('utf-8')
    n = len(data)
    if n < 126:
        conn.send(bytes([0x81, n]) + data)
    else:
        conn.send(bytes([0x81, 126, n >> 8, n & 0xFF]) + data)

def broadcast(message):
    dead = []
    for conn in ws_clients:
        try:
            ws_send(conn, message)
        except:
            dead.append(conn)
    for conn in dead:
        try:
            conn.close()
        except:
            pass
        ws_clients.remove(conn)

def post_cloud_scan(card_id):
    if not requests or not CLOUD_RELAY_URL.startswith('https://') or CLOUD_RELAY_SECRET.startswith('CHANGE_ME'):
        return
    body = (
        '{"cardId":"' + json_escape(card_id) + '",'
        '"session":"' + json_escape(CLOUD_RELAY_SESSION) + '"}'
    )
    try:
        response = requests.post(
            CLOUD_RELAY_URL,
            data=body,
            headers={
                'Content-Type': 'application/json',
                'x-reader-secret': CLOUD_RELAY_SECRET,
            },
        )
        try:
            response.close()
        except:
            pass
    except:
        pass

def json_escape(value):
    return str(value).replace('\\', '\\\\').replace('"', '\\"')

def poll_server():
    if not server_sock:
        return
    try:
        conn, _ = server_sock.accept()
        if ws_handshake(conn):
            conn.setblocking(False)
            ws_clients.append(conn)
        else:
            conn.close()
    except OSError:
        pass

def setup_server(ip):
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    # Bind all interfaces so hotspot/router networking can reach the reader.
    s.bind(('0.0.0.0', WS_PORT))
    s.listen(4)
    s.setblocking(False)
    return s

# ── Main ───────────────────────────────────────────────────────────────────────

M5.begin()

device_ip = connect_wifi()
if device_ip:
    server_sock = setup_server(device_ip)
    show_message('WiFi connected', device_ip + ':' + str(WS_PORT))
    time.sleep_ms(1500)
else:
    show_message('No WiFi', 'USB serial only')
    time.sleep_ms(1500)

i2c = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)
rdr = RFIDUnit(i2c, 0x28)

show_idle()
print('READY')

while True:
    poll_server()

    if rdr.is_new_card_present():
        if rdr.picc_read_card_serial():
            data = rdr.read(BLOCK)
            if data:
                card_id = bytes(data).decode('utf-8', 'ignore').rstrip('\x00').strip()
                if card_id:
                    now = time.ticks_ms()
                    if card_id != last_card_id or time.ticks_diff(now, last_ms) > DEBOUNCE_MS:
                        last_card_id = card_id
                        last_ms = now
                        msg = 'CARD:' + card_id
                        print(msg)
                        broadcast(msg)
                        post_cloud_scan(card_id)
                    Lcd.setTextColor(0x00FF88, 0x1A3A2A)
                    Lcd.setTextSize(1)
                    Lcd.setCursor(10, 115)
                    Lcd.print(card_id[:24])

            time.sleep_ms(200)
            rdr = RFIDUnit(i2c, 0x28)
            time.sleep_ms(100)
            for _ in range(100):
                poll_server()
                if not rdr.is_new_card_present():
                    break
                time.sleep_ms(100)
            time.sleep_ms(300)
            show_idle()

    time.sleep_ms(50)
