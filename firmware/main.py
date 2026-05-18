# pyrefly: ignore
# STROOMpoint — M5Stack CoreS3 unified launcher
# Tap a mode on screen to run it. Power-cycle to return to this menu.

import M5  # pyrefly: ignore
from M5 import Lcd, Touch  # pyrefly: ignore
from machine import I2C, Pin  # pyrefly: ignore
from unit.rfid import RFIDUnit  # pyrefly: ignore
import time
import network  # pyrefly: ignore
import socket  # pyrefly: ignore
import hashlib
import ubinascii  # pyrefly: ignore

# ── WiFi config (used in Reader mode) ────────────────────────────────────────
WIFI_SSID     = 'YourNetwork'
WIFI_PASSWORD = 'YourPassword'
WS_PORT       = 81
# ─────────────────────────────────────────────────────────────────────────────

M5.begin()

# ── Menu ───────────────────────────────────────────────────────────────────────

MODES = [
    ('Read Cards',   0x1565A8, 0xFFFFFF),
    ('Write Cards',  0x1A6B1A, 0xFFFFFF),
    ('Diagnose',     0x7A4A00, 0xFFFFFF),
]

def draw_menu(highlight=-1):
    Lcd.clear(0x111E1A)
    Lcd.setTextColor(0xFFFFFF, 0x111E1A)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 8)
    Lcd.print('STROOMpoint')
    Lcd.setTextSize(1)
    Lcd.setTextColor(0x88AA88, 0x111E1A)
    Lcd.setCursor(10, 34)
    Lcd.print('Select a mode:')
    btn_y = [62, 122, 182]
    for i, (label, bg, fg) in enumerate(MODES):
        color = 0xFFFFFF if highlight == i else bg
        text  = 0x111111 if highlight == i else fg
        Lcd.fillRect(10, btn_y[i], 300, 48, color)
        Lcd.setTextColor(text, color)
        Lcd.setTextSize(2)
        Lcd.setCursor(20, btn_y[i] + 14)
        Lcd.print(label)

draw_menu()

choice = None
while choice is None:
    M5.update()
    if Touch.getCount() > 0:
        t = Touch.getDetail(0)
        y = t.y
        if 62 <= y < 110:
            choice = 0
        elif 122 <= y < 170:
            choice = 1
        elif 182 <= y < 230:
            choice = 2
        if choice is not None:
            draw_menu(choice)
            time.sleep_ms(350)
    time.sleep_ms(30)

i2c = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)
rdr = RFIDUnit(i2c, 0x28)
BLOCK = 4

# ══════════════════════════════════════════════════════════════════════════════
# MODE 0 — READER (USB serial + WiFi WebSocket)
# ══════════════════════════════════════════════════════════════════════════════
if choice == 0:
    WS_GUID  = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    DEBOUNCE = 3000
    last_id  = ''
    last_ms  = 0
    clients  = []
    srv      = None
    dev_ip   = None

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

    def reader_idle():
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

    def reader_msg(l1, l2=''):
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

    # Connect WiFi
    wlan = network.WLAN(network.STA_IF)
    wlan.active(True)
    if not wlan.isconnected():
        reader_msg('Connecting WiFi...', WIFI_SSID)
        wlan.connect(WIFI_SSID, WIFI_PASSWORD)
        for _ in range(40):
            if wlan.isconnected():
                break
            time.sleep_ms(500)
    if wlan.isconnected():
        dev_ip = wlan.ifconfig()[0]
        s = socket.socket()
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        s.bind((dev_ip, WS_PORT))
        s.listen(4)
        s.setblocking(False)
        srv = s
        reader_msg('WiFi OK', dev_ip + ':' + str(WS_PORT))
        time.sleep_ms(1200)
    else:
        reader_msg('No WiFi', 'USB serial only')
        time.sleep_ms(1200)

    reader_idle()
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
                reader_idle()
        time.sleep_ms(50)

# ══════════════════════════════════════════════════════════════════════════════
# MODE 1 — WRITER (programs class index onto cards)
# ══════════════════════════════════════════════════════════════════════════════
elif choice == 1:
    CARDS = [
        (1,  'Job Seeker'),
        (2,  'Student'),
        (3,  'Working Professional'),
        (4,  'Returning to Work'),
        (5,  'Employer'),
        (6,  'Plumber'),
        (7,  'Electrician'),
        (8,  'Carpenter / Construction'),
        (9,  'Catering / Hospitality'),
        (10, 'Healthcare / Caregiver'),
        (11, 'IT / Technology'),
        (12, 'Administration'),
        (13, 'Driver / Logistics'),
        (14, 'Flexible Hours'),
        (15, 'Part-time'),
        (16, 'Full-time'),
        (17, 'Work Near Home'),
        (18, 'No Experience'),
        (19, 'Looking for Training'),
        (20, 'Changing Career'),
    ]

    # ── Mode select ───────────────────────────────────────────────────────────
    def draw_writer_menu():
        Lcd.clear(0x111E1A)
        Lcd.setTextColor(0xFFFFFF, 0x111E1A)
        Lcd.setTextSize(2)
        Lcd.setCursor(10, 10)
        Lcd.print('Write Cards')
        Lcd.setTextSize(1)
        Lcd.setTextColor(0x88AA88, 0x111E1A)
        Lcd.setCursor(10, 40)
        Lcd.print('Choose a mode:')
        Lcd.fillRect(10, 65,  300, 60, 0x1565A8)
        Lcd.setTextColor(0xFFFFFF, 0x1565A8)
        Lcd.setTextSize(2)
        Lcd.setCursor(20, 78)
        Lcd.print('Sequential')
        Lcd.setTextSize(1)
        Lcd.setTextColor(0xAADDFF, 0x1565A8)
        Lcd.setCursor(20, 100)
        Lcd.print('Write all 20 in order, 1 -> 20')
        Lcd.fillRect(10, 140, 300, 60, 0x1A6B1A)
        Lcd.setTextColor(0xFFFFFF, 0x1A6B1A)
        Lcd.setTextSize(2)
        Lcd.setCursor(20, 153)
        Lcd.print('Pick One')
        Lcd.setTextSize(1)
        Lcd.setTextColor(0xAAFFAA, 0x1A6B1A)
        Lcd.setCursor(20, 175)
        Lcd.print('Choose any card from the list')

    draw_writer_menu()
    writer_mode = None
    while writer_mode is None:
        M5.update()
        if Touch.getCount() > 0:
            ty = Touch.getDetail(0).y
            time.sleep_ms(120)
            if 65 <= ty < 125:
                writer_mode = 'seq'
            elif 140 <= ty < 200:
                writer_mode = 'pick'
        time.sleep_ms(30)

    # ── Shared write helper ────────────────────────────────────────────────────
    def write_card(num, label):
        payload = str(num).zfill(2).encode().ljust(16, b'\x00')
        try:
            rdr.write(BLOCK, payload)
            Lcd.clear(0x003300)
            Lcd.setTextColor(0x00FF88, 0x003300)
            Lcd.setTextSize(2)
            Lcd.setCursor(10, 30)
            Lcd.print('Written!')
            Lcd.setTextSize(1)
            Lcd.setTextColor(0xFFFFFF, 0x003300)
            Lcd.setCursor(10, 70)
            Lcd.print(str(num).zfill(2) + ' — ' + label)
            Lcd.setCursor(10, 100)
            Lcd.print('Remove card...')
            return True
        except Exception as e:
            Lcd.clear(0x330000)
            Lcd.setTextColor(0xFF4444, 0x330000)
            Lcd.setTextSize(2)
            Lcd.setCursor(10, 30)
            Lcd.print('Write failed')
            Lcd.setTextSize(1)
            Lcd.setTextColor(0xAAAAAA, 0x330000)
            Lcd.setCursor(10, 70)
            Lcd.print(str(e)[:28])
            return False

    def wait_remove():
        for _ in range(60):
            if not rdr.is_new_card_present():
                break
            time.sleep_ms(100)
        time.sleep_ms(500)

    # ── Sequential mode ────────────────────────────────────────────────────────
    if writer_mode == 'seq':
        def draw_seq(idx):
            num, label = CARDS[idx]
            nxt = CARDS[idx + 1] if idx + 1 < len(CARDS) else None
            Lcd.clear(0x111E1A)
            Lcd.setTextColor(0x88AA88, 0x111E1A)
            Lcd.setTextSize(1)
            Lcd.setCursor(10, 8)
            Lcd.print('Card ' + str(idx + 1) + ' of ' + str(len(CARDS)))
            Lcd.setTextColor(0x00FF88, 0x111E1A)
            Lcd.setTextSize(2)
            Lcd.setCursor(10, 30)
            Lcd.print('Tap tag to write:')
            Lcd.setTextColor(0xFFFFFF, 0x111E1A)
            Lcd.setCursor(10, 65)
            Lcd.print(str(num).zfill(2) + '  ' + label[:16])
            if nxt:
                Lcd.setTextSize(1)
                Lcd.setTextColor(0x88AA88, 0x111E1A)
                Lcd.setCursor(10, 110)
                Lcd.print('Next up:  ' + str(nxt[0]).zfill(2) + '  ' + nxt[1])
            Lcd.setTextSize(1)
            Lcd.setTextColor(0x555555, 0x111E1A)
            Lcd.setCursor(10, 210)
            Lcd.print('Tap screen to skip this card')

        seq_idx = 0
        draw_seq(seq_idx)

        while seq_idx < len(CARDS):
            M5.update()

            # Screen tap = skip
            if Touch.getCount() > 0:
                time.sleep_ms(150)
                seq_idx += 1
                if seq_idx < len(CARDS):
                    draw_seq(seq_idx)
                continue

            if rdr.is_new_card_present():
                if rdr.picc_read_card_serial():
                    num, label = CARDS[seq_idx]
                    ok = write_card(num, label)
                    wait_remove()
                    if ok:
                        seq_idx += 1
                    if seq_idx < len(CARDS):
                        draw_seq(seq_idx)

            time.sleep_ms(40)

        Lcd.clear(0x003300)
        Lcd.setTextColor(0x00FF88, 0x003300)
        Lcd.setTextSize(2)
        Lcd.setCursor(10, 80)
        Lcd.print('All 20 cards')
        Lcd.setCursor(10, 110)
        Lcd.print('written!')
        while True:
            time.sleep_ms(500)

    # ── Pick-one mode ──────────────────────────────────────────────────────────
    else:
        PAGE = 4
        page_idx = 0

        def draw_writer(sel, offset):
            Lcd.clear(0x111E1A)
            Lcd.setTextColor(0x00FF88, 0x111E1A)
            Lcd.setTextSize(1)
            Lcd.setCursor(10, 6)
            Lcd.print('Write Cards — tap to select, tap again to write')
            Lcd.setTextColor(0x88AA88, 0x111E1A)
            Lcd.setCursor(270, 6)
            pg = str(offset // PAGE + 1) + '/' + str((len(CARDS) + PAGE - 1) // PAGE)
            Lcd.print(pg)
            for i in range(PAGE):
                idx = offset + i
                if idx >= len(CARDS): break
                num, label = CARDS[idx]
                y = 28 + i * 50
                bg = 0x1565A8 if sel == idx else 0x222E2A
                Lcd.fillRect(8, y, 304, 44, bg)
                Lcd.setTextColor(0xFFFFFF, bg)
                Lcd.setTextSize(1)
                Lcd.setCursor(14, y + 6)
                Lcd.print(str(num).zfill(2) + '  ' + label)

        def writer_prompt(label):
            Lcd.clear(0x111E1A)
            Lcd.setTextColor(0x00FF88, 0x111E1A)
            Lcd.setTextSize(2)
            Lcd.setCursor(10, 20)
            Lcd.print('Tap card to write:')
            Lcd.setTextColor(0xFFFFFF, 0x111E1A)
            Lcd.setCursor(10, 60)
            Lcd.print(label)
            Lcd.setTextSize(1)
            Lcd.setTextColor(0x888888, 0x111E1A)
            Lcd.setCursor(10, 200)
            Lcd.print('Tap anywhere to cancel')

        selected = -1
        draw_writer(selected, page_idx * PAGE)

        while True:
            M5.update()

            if Touch.getCount() > 0:
                t = Touch.getDetail(0)
                tx, ty = t.x, t.y
                time.sleep_ms(120)

                if selected == -1:
                    if ty > 210:
                        if tx < 160 and page_idx > 0:
                            page_idx -= 1
                            draw_writer(-1, page_idx * PAGE)
                        elif tx >= 160 and (page_idx + 1) * PAGE < len(CARDS):
                            page_idx += 1
                            draw_writer(-1, page_idx * PAGE)
                        continue
                    for i in range(PAGE):
                        row_y = 28 + i * 50
                        idx = page_idx * PAGE + i
                        if row_y <= ty < row_y + 44 and idx < len(CARDS):
                            selected = idx
                            num, label = CARDS[selected]
                            writer_prompt(label)
                            break
                else:
                    selected = -1
                    draw_writer(-1, page_idx * PAGE)

            if selected >= 0 and rdr.is_new_card_present():
                if rdr.picc_read_card_serial():
                    num, label = CARDS[selected]
                    write_card(num, label)
                    wait_remove()
                    selected = -1
                    draw_writer(-1, page_idx * PAGE)

            time.sleep_ms(40)

# ══════════════════════════════════════════════════════════════════════════════
# MODE 2 — DIAGNOSE
# ══════════════════════════════════════════════════════════════════════════════
elif choice == 2:
    def diag_show(l1='', l2='', l3='', l4=''):
        Lcd.clear(0x111111)
        Lcd.setTextSize(2)
        for i, (txt, col) in enumerate([(l1, 0xFFFFFF), (l2, 0xFFFF00), (l3, 0x00FF88), (l4, 0xAAAAAA)]):
            if txt:
                Lcd.setTextColor(col, 0x111111)
                Lcd.setCursor(10, 10 + i * 50)
                Lcd.print(str(txt)[:24])

    TEST_ID = b'job_electrician\x00'
    diag_show('Tap card to', 'write+verify')

    while True:
        if rdr.is_new_card_present():
            if rdr.picc_read_card_serial():
                diag_show('Writing...')
                try:
                    rdr.write(BLOCK, bytes(TEST_ID))
                    diag_show('Write OK!', 'Remove + re-tap')
                except Exception as e:
                    diag_show('WRITE ERR:', str(e)[:22])
                    time.sleep_ms(4000)
                    diag_show('Tap card to', 'write+verify')
                    continue

                for _ in range(50):
                    if not rdr.is_new_card_present():
                        break
                    time.sleep_ms(100)
                time.sleep_ms(300)

                diag_show('Remove + re-tap', 'waiting...')
                found = False
                for _ in range(150):
                    if rdr.is_new_card_present():
                        if rdr.picc_read_card_serial():
                            found = True
                            break
                    time.sleep_ms(200)

                if found:
                    data = rdr.read(BLOCK)
                    if data:
                        txt = bytes(data).decode('utf-8', 'ignore').rstrip('\x00').strip()
                        hexstr = bytes(data[:6]).hex()
                        diag_show('READ OK:', txt[:20], hexstr, 'SUCCESS!' if txt else '(empty)')
                    else:
                        diag_show('READ: None')
                else:
                    diag_show('Timed out', 'waiting for card')

                time.sleep_ms(6000)
                diag_show('Tap card to', 'write+verify')
        time.sleep_ms(200)
