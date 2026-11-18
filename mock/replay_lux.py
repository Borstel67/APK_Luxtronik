"""Replays recorded Luxtronik XML (real_capture.txt from tools/lux_check.ps1) on ws://127.0.0.1:8214."""
import asyncio, re, sys, websockets
lines = open(sys.argv[1] if len(sys.argv) > 1 else "real_capture.txt", encoding="utf-8-sig").read().splitlines()
NAV, PAGES = None, {}
for i, l in enumerate(lines):
    if l.startswith("--- NAVIGATION"): NAV = lines[i + 1]
    m = re.match(r"--- GET (\S+) ", l)
    if m: PAGES[m.group(1)] = lines[i + 1]
async def h(ws):
    async for msg in ws:
        print("<<", msg, flush=True)
        if msg.startswith("LOGIN;"): await ws.send(NAV)
        elif msg.startswith("GET;"): await ws.send(PAGES.get(msg[4:], "<Content></Content>"))
async def main():
    async with websockets.serve(h, "127.0.0.1", 8214, subprotocols=["Lux_WS"]): await asyncio.Future()
asyncio.run(main())
