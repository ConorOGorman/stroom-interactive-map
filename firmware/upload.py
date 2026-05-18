# pyrefly: ignore
#!/usr/bin/env python3
"""Upload a MicroPython file to /flash/apps/ via raw REPL.
Usage: python3 firmware/upload.py [local_file] [remote_name]
"""
import sys, time, base64, serial

DEFAULT_PORT = '/dev/cu.usbmodem1101'
BAUD = 115200

def wait_for(ser, marker, timeout=3.0):
    buf = b''
    deadline = time.time() + timeout
    while time.time() < deadline:
        buf += ser.read(ser.in_waiting or 1)
        if marker in buf:
            return buf
    return buf

def upload(local_path, remote_name, port):
    with open(local_path, 'rb') as f:
        payload = f.read()

    b64 = base64.b64encode(payload).decode()
    remote_path = '/flash/apps/' + remote_name

    with serial.Serial(port, BAUD, timeout=1) as ser:
        # Hard interrupt
        for _ in range(3):
            ser.write(b'\r\x03')
            time.sleep(0.2)

        # Enter raw REPL
        ser.write(b'\x01')
        resp = wait_for(ser, b'raw REPL', timeout=3)
        if b'raw REPL' not in resp:
            print('Could not enter raw REPL. Response:', repr(resp))
            sys.exit(1)
        print('Raw REPL OK')
        ser.read_all()  # flush >

        # Build the upload program as one block
        lines = [
            'import ubinascii',
            f"_f=open({repr(remote_path)},'wb')",
        ]
        chunk = 64
        for i in range(0, len(b64), chunk):
            lines.append(f"_f.write(ubinascii.a2b_base64({repr(b64[i:i+chunk])}))")
        lines.append('_f.close()')
        lines.append("print('DONE')")

        script = '\n'.join(lines) + '\n'
        ser.write(script.encode())
        ser.write(b'\x04')  # execute

        out = wait_for(ser, b'DONE', timeout=15)
        print()
        if b'DONE' in out:
            print(f'Uploaded → {remote_path}')
        else:
            print('Upload may have failed. Output:', repr(out[-200:]))

        # Back to friendly REPL
        ser.write(b'\x02')
        time.sleep(0.3)


if __name__ == '__main__':
    src = sys.argv[1] if len(sys.argv) > 1 else 'firmware/reader.py'
    dst = sys.argv[2] if len(sys.argv) > 2 else 'stroom_reader.py'
    port = sys.argv[3] if len(sys.argv) > 3 else DEFAULT_PORT
    print(f'Uploading {src} → /flash/apps/{dst} via {port}')
    upload(src, dst, port)
