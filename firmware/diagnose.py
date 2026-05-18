# pyrefly: ignore
# STROOMpoint RFID Diagnostic
# Writes a test value to a card then reads it back to verify

import M5  # pyrefly: ignore
from M5 import Lcd  # pyrefly: ignore
from machine import I2C, Pin  # pyrefly: ignore
from unit.rfid import RFIDUnit  # pyrefly: ignore
import time

BLOCK = 4
TEST_NUM = b'07'

i2c = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)
rdr = RFIDUnit(i2c, 0x28)

def diag_show(l1='', l2='', l3='', l4=''):
    Lcd.clear(0x111111)
    Lcd.setTextSize(2)
    for i, (txt, col) in enumerate([(l1, 0xFFFFFF), (l2, 0xFFFF00), (l3, 0x00FF88), (l4, 0xAAAAAA)]):
        if txt:
            Lcd.setTextColor(col, 0x111111)
            Lcd.setCursor(10, 10 + i * 50)
            Lcd.print(str(txt)[:24])

diag_show('Tap card to', 'write+verify')

while True:
    if rdr.is_new_card_present():
        if rdr.picc_read_card_serial():
            diag_show('Writing...')
            try:
                payload = TEST_NUM.ljust(16, b'\x00')
                rdr.write(BLOCK, payload)
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

            diag_show('Re-tap card...', 'waiting...')
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
