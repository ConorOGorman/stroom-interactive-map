# pyrefly: ignore
# STROOMpoint RFID Writer
# Sequential mode: hold each card to the reader in order, 01-20

import M5  # pyrefly: ignore
from M5 import Lcd  # pyrefly: ignore
from machine import I2C, Pin  # pyrefly: ignore
from unit.rfid import RFIDUnit  # pyrefly: ignore
import time

BLOCK = 4

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

i2c = I2C(0, scl=Pin(1), sda=Pin(2), freq=100000)
time.sleep_ms(200)
rdr = RFIDUnit(i2c, 0x28)

def draw_prompt(idx):
    num, label = CARDS[idx]
    nxt = CARDS[idx + 1] if idx + 1 < len(CARDS) else None
    Lcd.clear(0x111E1A)
    Lcd.setTextColor(0x88AA88, 0x111E1A)
    Lcd.setTextSize(1)
    Lcd.setCursor(10, 8)
    Lcd.print('Card ' + str(idx + 1) + ' of ' + str(len(CARDS)))
    Lcd.setTextColor(0xFFFFFF, 0x111E1A)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 30)
    Lcd.print('Place card')
    Lcd.setTextColor(0x00FF88, 0x111E1A)
    Lcd.setCursor(10, 68)
    Lcd.print(('%02d' % num) + '  ' + label[:16])
    if nxt:
        Lcd.setTextSize(1)
        Lcd.setTextColor(0x88AA88, 0x111E1A)
        Lcd.setCursor(10, 115)
        Lcd.print('Next: ' + ('%02d' % nxt[0]) + '  ' + nxt[1])

def show_remove(num, label, err):
    bg = 0x003300 if not err else 0x1A1A00
    Lcd.clear(bg)
    Lcd.setTextColor(0x00FF88 if not err else 0xFFFF00, bg)
    Lcd.setTextSize(2)
    Lcd.setCursor(10, 20)
    Lcd.print('Remove card')
    Lcd.setTextColor(0xFFFFFF, bg)
    Lcd.setCursor(10, 65)
    Lcd.print(('%02d' % num) + '  ' + label[:16])
    if err:
        Lcd.setTextSize(1)
        Lcd.setTextColor(0xFF8800, bg)
        Lcd.setCursor(10, 110)
        Lcd.print(err[:30])

def reset_reader():
    global rdr
    rdr = RFIDUnit(i2c, 0x28)
    time.sleep_ms(150)

idx = 0
draw_prompt(idx)
print('WRITER READY')

while idx < len(CARDS):
    M5.update()
    try:
        present = rdr.is_new_card_present()
    except Exception as e:
        print('PRESENT ERR:', e)
        reset_reader()
        time.sleep_ms(200)
        continue

    if not present:
        time.sleep_ms(50)
        continue

    # Card detected — try to read serial
    serial_ok = False
    for attempt in range(5):
        try:
            if rdr.picc_read_card_serial():
                serial_ok = True
                break
        except Exception as e:
            print('SERIAL ERR attempt', attempt, ':', e)
        time.sleep_ms(60)

    if not serial_ok:
        print('SERIAL FAILED - hold still')
        Lcd.setTextColor(0xFF8800, 0x111E1A)
        Lcd.setTextSize(1)
        Lcd.setCursor(10, 140)
        Lcd.print('Hold still...')
        time.sleep_ms(400)
        draw_prompt(idx)
        time.sleep_ms(200)
        continue

    # Write the card
    num, label = CARDS[idx]
    print('WRITING card', idx + 1, num, label)
    err = None
    try:
        b = ('%02d' % num).encode()
        payload = b + b'\x00' * (16 - len(b))
        rdr.write(BLOCK, payload)
        print('WRITE OK')
    except Exception as e:
        err = str(e)
        print('WRITE ERR:', e)

    show_remove(num, label, err)

    # Wait for card removal — minimum 1.5s so user can read screen
    time.sleep_ms(1500)
    for _ in range(60):
        try:
            if not rdr.is_new_card_present():
                break
        except:
            break
        time.sleep_ms(100)

    reset_reader()
    idx += 1
    if idx < len(CARDS):
        draw_prompt(idx)

Lcd.clear(0x003300)
Lcd.setTextColor(0x00FF88, 0x003300)
Lcd.setTextSize(2)
Lcd.setCursor(10, 80)
Lcd.print('All 20 cards')
Lcd.setCursor(10, 110)
Lcd.print('written!')
print('ALL DONE')
while True:
    time.sleep_ms(500)
