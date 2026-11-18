"""Mock Luxtronik 2 binary server (wp.jar protocol) on TCP 8888 + HTTP bridge for browser tests.

calc: real 3004 values from tools/lux_check_result.txt (or lux_java.json) if present.
params/visi: real 3003/3005 if lux_java.json contains them, otherwise plausible test values.
Writes (3002) are applied to the in-memory params and logged.
"""
import json, os, re, socketserver, struct, sys, threading
from http.server import BaseHTTPRequestHandler, HTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
PARAMS = [0] * 1200
VISI = [1] * 400
CALC = [0] * 200
LOG = []

def load():
    global CALC, PARAMS, VISI
    jf = os.path.join(HERE, 'lux_java.json')
    if os.path.exists(jf):
        d = json.load(open(jf, encoding='utf-8-sig'))
        CALC = d.get('calc') or CALC
        if d.get('params'): PARAMS = d['params']
        if d.get('visi'): VISI = d['visi']
        if d.get('params'): return
    cap = os.path.join(HERE, 'real_capture.txt')
    if os.path.exists(cap):
        m = re.search(r'--- Alle Rohwerte 3004 ---\n(.*)', open(cap, encoding='utf-8-sig').read())
        if m: CALC = [int(x.split('=')[1]) for x in m.group(1).split('; ')]
    # plausible parameters (values seen on the real WebSocket pages where known)
    P = {1: 0, 2: 460, 3: 0, 4: 0, 11: 350, 12: 220, 13: 0, 17: 400, 105: 460, 700: 160,
         20: 0, 21: 0, 22: 0, 23: 0, 24: 0, 25: 0, 26: 1, 27: 0, 697: 5, 698: 15,
         87: 400, 88: 20, 89: 30, 90: -90, 95: 0, 44: 10, 47: 650, 74: 30, 96: 400, 91: 350, 92: -200,
         93: -90, 94: 1300, 98: 25, 111: 30, 149: 550, 691: 300, 862: 0, 863: 400, 893: 40, 973: 650,
         979: 150, 993: 180, 122: 50, 123: 30, 124: 700, 125: 20, 126: 30, 138: 200, 692: 300,
         32: 0, 33: 0, 35: 1, 42: 0, 36: 1, 37: 1, 38: 0, 39: 0, 86: 0, 82: 0, 85: 0, 40: 1, 100: 0,
         148: 1, 48: 5, 34: 0, 43: 0, 45: 15, 76: 0, 101: 0, 49: 1, 107: 0, 46: 1, 102: 1, 103: 0,
         120: 0, 104: 1, 114: 0, 152: 100, 150: 100, 699: 1, 762: 0, 860: 0, 864: 60, 885: 2, 891: 0,
         892: 20, 970: 0, 975: 0, 977: 0, 992: 30, 994: 1, 1020: 8, 869: 1, 870: 1, 29: 0,
         222: 0, 405: 0, 506: 1}
    for k, v in P.items(): PARAMS[k] = v
    # Schaltuhr Heizkreis (Woche): 06:00-22:00 ; WW (Woche) 1) 05:30-07:00 ; Zirk (5+2)
    PARAMS[223], PARAMS[224] = 6 * 3600, 22 * 3600
    PARAMS[406], PARAMS[407] = 5 * 3600 + 1800, 7 * 3600
    for v in (5, 6, 209, 4, 119, 102, 118, 121): VISI[v] = 0   # MK1-3, Lüftung, SWB, Kühlung, Parallel

load()
LOCK = threading.Lock()

def be(*ints): return b''.join(struct.pack('>i', i) for i in ints)

class TCP(socketserver.BaseRequestHandler):
    def handle(self):
        f = self.request
        def rd(n):
            b = b''
            while len(b) < n:
                c = f.recv(n - len(b))
                if not c: raise EOFError
                b += c
            return b
        try:
            while True:
                cmd = struct.unpack('>i', rd(4))[0]
                with LOCK:
                    if cmd == 3002:
                        pid, val = struct.unpack('>ii', rd(8))
                        LOG.append((pid, val)); print('3002', pid, val, flush=True)
                        PARAMS[pid] = val
                        f.sendall(be(3002, pid))
                    elif cmd == 3003:
                        rd(4); f.sendall(be(3003, len(PARAMS), *PARAMS))
                    elif cmd == 3004:
                        rd(4); f.sendall(be(3004, 0, len(CALC), *CALC))
                    elif cmd == 3005:
                        rd(4); f.sendall(be(3005, len(VISI)) + bytes(v & 255 for v in VISI))
                    else:
                        return
        except (EOFError, ConnectionResetError):
            pass

class HTTP(BaseHTTPRequestHandler):
    def _send(self, obj):
        b = json.dumps(obj).encode()
        self.send_response(200); self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self):
        self.send_response(204); self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', '*'); self.send_header('Access-Control-Allow-Methods', 'GET,POST'); self.end_headers()
    def do_GET(self):
        if self.path.startswith('/read'):
            with LOCK: self._send({'port': 8888, 'params': PARAMS, 'calc': CALC, 'visi': VISI})
        elif self.path.startswith('/log'):
            self._send(LOG)
    def do_POST(self):
        pairs = json.loads(self.rfile.read(int(self.headers['Content-Length'])))
        with LOCK:
            for i in range(0, len(pairs) - 1, 2):
                LOG.append((pairs[i], pairs[i + 1])); PARAMS[pairs[i]] = pairs[i + 1]
                print('3002(http)', pairs[i], pairs[i + 1], flush=True)
        self._send({'ok': len(pairs) // 2})
    def log_message(self, *a): pass

if __name__ == '__main__':
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    t = socketserver.ThreadingTCPServer(('127.0.0.1', 8888), TCP)
    threading.Thread(target=t.serve_forever, daemon=True).start()
    HTTPServer(('127.0.0.1', 8098), HTTP).serve_forever()
