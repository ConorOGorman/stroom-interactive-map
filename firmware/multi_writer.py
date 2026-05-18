# pyrefly: ignore
# STROOMpoint Card Programmer — M5Stack CoreS3 + RFID2 Unit
# Run from UIFlow2 APP-LIST: stroom_writer

import M5  # pyrefly: ignore
from M5 import Lcd  # pyrefly: ignore
from machine import I2C, Pin  # pyrefly: ignore
from unit.rfid import RFIDUnit  # pyrefly: ignore
import time

M5.begin()

# (label, classIndex) — classIndex matches CARDS in js/config.js
CARDS = [
    ('Electrician',    7),
    ('Flexible Hours', 14),
]

BLOCK = 4

i2c = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)


def show(top, middle, bottom='', mid_color=0xFFFF00):
    Lcd.clear(0x111111)
    Lcd.setTextColor(0xAAAAAA, 0x111111)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 10)
    Lcd.print(top)
    Lcd.setTextColor(mid_color, 0x111111)
    Lcd.setTextSize(3)
    Lcd.setCursor(10, 60)
    Lcd.print(middle[:13])
    if bottom:
        Lcd.setTextColor(0x888888, 0x111111)
        Lcd.setTextSize(2)
        Lcd.setCursor(10, 160)
        Lcd.print(bottom)


for idx, (label, class_index) in enumerate(CARDS):
    progress = '{}/{}'.format(idx + 1, len(CARDS))
    show(progress, label, 'Tap card...')

    # Store as zero-padded 2-digit index e.g. "07", padded to 16 bytes
    raw = '{:02d}'.format(class_index).encode('utf-8')
    encoded = bytes(raw + b'\x00' * (16 - len(raw)))

    rdr = RFIDUnit(i2c, 0x28)

    # Wait for card tap
    while True:
        if rdr.is_new_card_present():
            if rdr.picc_read_card_serial():
                try:
                    rdr.write(BLOCK, encoded)
                    show(progress, 'Written!', label, mid_color=0x00FF44)
                    time.sleep_ms(2000)
                    break
                except Exception as e:
                    show(progress, 'Failed', str(e)[:18], mid_color=0xFF4444)
                    time.sleep_ms(1000)
                    rdr = RFIDUnit(i2c, 0x28)
        time.sleep_ms(150)

    # Show remove prompt and wait until picc_read_card_serial returns False
    show(progress, 'REMOVE CARD', label)
    rdr = RFIDUnit(i2c, 0x28)
    time.sleep_ms(500)
    for _ in range(150):  # up to 15s
        if not rdr.picc_read_card_serial():
            break
        time.sleep_ms(100)
    time.sleep_ms(500)

show('Done!', '{} cards'.format(len(CARDS)), 'All programmed!', mid_color=0x00FF44)
