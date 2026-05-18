# pyrefly: ignore
# STROOMpoint RFID Reader
# Reads cards, broadcasts CARD:<id> over USB serial + WiFi WebSocket + cloud relay

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
    requests = None

WIFI_SSID           = "Conor's iPhone"
WIFI_PASSWORD       = "rathmaiden"
WS_PORT             = 81
CLOUD_URL           = 'https://stroom-interactive-map.vercel.app/api/scans'
CLOUD_SECRET        = 'CHANGE_ME_RELAY_SECRET'
CLOUD_SESSION       = 'default'
BLOCK               = 4
DEBOUNCE            = 3000
WS_GUID             = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

i2c     = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)
rdr     = RFIDUnit(i2c, 0x28)
last_id = ''
last_ms = 0
clients = []
srv     = None
dev_ip  = None

def show(l1, l2=''):
    Lcd.clear(0x1A3A2A)
    Lcd.setTextColor(0xFFFFFF, 0x1A3A2A)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 10)
    Lcd.print('STROOMpoint')
    Lcd.setTextSize(1)
    Lcd.setTextColor(0xAAAAAA, 0x1A3A2A)
    Lcd.setCursor(10, 50)
    Lcd.print(l1)
    if l2:
        Lcd.setCursor(10, 70)
        Lcd.print(l2)

def idle():
    Lcd.clear(0x1A3A2A)
    Lcd.setTextColor(0xFFFFFF, 0x1A3A2A)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 10)
    Lcd.print('STROOMpoint')
    Lcd.setCursor(10, 40)
    Lcd.print('RFID Reader')
    if dev_ip:
        Lcd.setTextColor(0x00FF88, 0x1A3A2A)
        Lcd.setTextSize(1)
        Lcd.setCursor(10, 75)
        Lcd.print('WiFi: ' + dev_ip)
    Lcd.setTextColor(0xAAAAAA, 0x1A3A2A)
    Lcd.setTextSize(1)
    Lcd.setCursor(10, 95)
    Lcd.print('Tap a card...')

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
        accept = ubinascii.b2a_base64(
            hashlib.sha1((key + WS_GUID).encode()).digest()
        ).decode().strip()
        conn.send((
            'HTTP/1.1 101 Switching Protocols\r\n'
            'Upgrade: websocket\r\nConnection: Upgrade\r\n'
            'Access-Control-Allow-Origin: *\r\n'
            'Sec-WebSocket-Accept: ' + accept + '\r\n\r\n'
        ).encode())
        return True
    except:
        return False

def ws_send(conn, text):
    d = text.encode()
    n = len(d)
    conn.send((bytes([0x81, n]) if n < 126 else bytes([0x81, 126, n >> 8, n & 0xFF])) + d)

def broadcast(msg):
    dead = []
    for c in clients:
        try:
            ws_send(c, msg)
        except:
            dead.append(c)
    for c in dead:
        try: c.close()
        except: pass
        clients.remove(c)

def poll_srv():
    if not srv: return
    try:
        conn, _ = srv.accept()
        if ws_handshake(conn):
            conn.setblocking(False)
            clients.append(conn)
        else:
            conn.close()
    except OSError:
        pass

def post_cloud(card_id):
    if not requests or CLOUD_SECRET.startswith('CHANGE_ME'):
        return
    body = '{"cardId":"' + card_id + '","session":"' + CLOUD_SESSION + '"}'
    try:
        r = requests.post(CLOUD_URL, data=body,
            headers={'Content-Type': 'application/json', 'x-reader-secret': CLOUD_SECRET})
        try: r.close()
        except: pass
    except:
        pass

# Connect WiFi
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
if not wlan.isconnected():
    show('Connecting WiFi...', WIFI_SSID)
    wlan.connect(WIFI_SSID, WIFI_PASSWORD)
    for _ in range(40):
        if wlan.isconnected():
            break
        time.sleep_ms(500)

if wlan.isconnected():
    dev_ip = wlan.ifconfig()[0]
    s = socket.socket()
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind(('0.0.0.0', WS_PORT))
    s.listen(4)
    s.setblocking(False)
    srv = s
    show('WiFi OK', dev_ip + ':' + str(WS_PORT))
    time.sleep_ms(1200)
else:
    show('No WiFi', 'USB serial only')
    time.sleep_ms(1200)

idle()
print('READY')

while True:
    poll_srv()
    if rdr.is_new_card_present():
        if rdr.picc_read_card_serial():
            data = rdr.read(BLOCK)
            if data:
                cid = bytes(data).decode('utf-8', 'ignore').rstrip('\x00').strip()
                if cid:
                    now = time.ticks_ms()
                    if cid != last_id or time.ticks_diff(now, last_ms) > DEBOUNCE:
                        last_id = cid
                        last_ms = now
                        msg = 'CARD:' + cid
                        print(msg)
                        broadcast(msg)
                        post_cloud(cid)
                    Lcd.setTextColor(0x00FF88, 0x1A3A2A)
                    Lcd.setTextSize(1)
                    Lcd.setCursor(10, 115)
                    Lcd.print(cid[:24])
            time.sleep_ms(200)
            rdr = RFIDUnit(i2c, 0x28)
            time.sleep_ms(100)
            for _ in range(100):
                poll_srv()
                if not rdr.is_new_card_present():
                    break
                time.sleep_ms(100)
            time.sleep_ms(300)
            idle()
    time.sleep_ms(50)
