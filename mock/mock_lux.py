"""Minimal Luxtronik 2.x WebSocket mock (port 8214, subprotocol Lux_WS) for UI testing."""
import asyncio, random, websockets

STATE = {"heiz": 0, "ww": 0, "offset": 0, "level": "Benutzer", "pending_code": None}
MODES = ["Automatik", "Zw. WEZ", "Party", "Ferien", "Aus"]

def nav():
    extra = "<item id='0x23'><name>Systemeinstellung</name></item>" if STATE["level"] == "Installateur" else ""
    return f"""<Navigation id='0x1'>
<item id='0x10'><name>Informationen</name>
  <item id='0x11'><name>Temperaturen</name></item>
  <item id='0x12'><name>Eingänge</name></item>
  <item id='0x13'><name>Anlagenstatus</name></item>
  <item id='0x14'><name>Fehlerspeicher</name></item>
</item>
<item id='0x20'><name>Einstellungen</name>
  <item id='0x21'><name>Betriebsart</name></item>
  <item id='0x22'><name>Temperaturen</name></item>
  {extra}
</item>
<item id='0x30'><name>Zugang: {STATE["level"]}</name></item>
</Navigation>"""

def temps():
    o = 4.2 + random.random()
    return f"""<Content id='0x11'><item id='0x100'><name>Temperaturen</name>
<item id='0x101'><name>Vorlauf</name><value>{33 + random.random():.1f}°C</value></item>
<item id='0x102'><name>Rücklauf</name><value>28.4°C</value></item>
<item id='0x103'><name>Rückl.-Soll</name><value>29.0°C</value></item>
<item id='0x104'><name>Heißgas</name><value>61.2°C</value></item>
<item id='0x105'><name>Außentemperatur</name><value>{o:.1f}°C</value></item>
<item id='0x106'><name>Mitteltemperatur</name><value>5.3°C</value></item>
<item id='0x107'><name>Warmwasser-Ist</name><value>47.8°C</value></item>
<item id='0x108'><name>Warmwasser-Soll</name><value>48.0°C</value></item>
<item id='0x109'><name>Wärmequelle-Ein</name><value>3.9°C</value></item>
<item id='0x10a'><name>Wärmequelle-Aus</name><value>0.8°C</value></item>
</item></Content>"""

STATUS = """<Content id='0x13'><item id='0x300'><name>Anlagenstatus</name>
<item id='0x301'><name>Wärmepumpen Typ</name><value>LWD 50A</value></item>
<item id='0x302'><name>Softwarestand</name><value>V3.89.0</value></item>
<item id='0x303'><name>Betriebszustand</name><value>Heizen</value></item>
<item id='0x304'><name>Leistung Ist</name><value>3.21 kW</value></item>
</item></Content>"""

INPUTS = """<Content id='0x12'><item id='0x200'><name>Eingänge</name>
<item id='0x201'><name>ASD</name><value>Ein</value></item>
<item id='0x202'><name>EVU</name><value>Ein</value></item>
<item id='0x203'><name>Durchfluss</name><value>1250 l/h</value></item>
</item></Content>"""

def mode():
    opts = "".join(f"<option value='{i}'>{m}</option>" for i, m in enumerate(MODES))
    return f"""<Content id='0x21'><item id='0x400'><name>Betriebsart</name>
<item id='0x401'><name>Heizung</name>{opts}<raw>{STATE['heiz']}</raw><value>{MODES[STATE['heiz']]}</value></item>
<item id='0x402'><name>Warmwasser</name>{opts}<raw>{STATE['ww']}</raw><value>{MODES[STATE['ww']]}</value></item>
</item></Content>"""

def settemps():
    return f"""<Content id='0x22'><item id='0x500'><name>Temperaturen</name>
<item id='0x501'><name>Temperatur +-</name><min>-50</min><max>50</max><step>5</step><unit>°C</unit><div>10</div><raw>{STATE['offset']}</raw><value>{STATE['offset']/10:.1f}°C</value></item>
<item id='0x502'><name>Rücklaufbegr.</name><readOnly>true</readOnly><value>50.0°C</value></item>
</item></Content>"""

ACCESS = lambda: "<?xml version=\"1.0\"?><Content id='0x30'><name>Zugang</name><item id='0x601'><name>Passwort</name><min>0</min><max>9999</max><step>1</step><unit></unit><div>1.00</div><raw>0</raw><value>3</value></item><item id='0x602'><name>Fehlerreset</name><option value='0'>Nein</option><option value='1'>Ja</option><raw>0</raw><value>Nein</value></item></Content>"
SYS = lambda: "<Content id='0x23'><item id='0x700'><name>Systemeinstellung</name><item id='0x701'><name>Hysterese HR</name><min>5</min><max>150</max><step>5</step><div>10</div><raw>20</raw><unit>K</unit><value>2.0 K</value></item></item></Content>"
ERRS = lambda: "<Content id='0x14'><name>Fehlerspeicher</name><item id='0x801'><name>03.11.26 10:13:47</name><value>Niederdrucksperrung (702)</value></item></Content>"
PAGES = {"0x14": ERRS, "0x30": ACCESS, "0x23": SYS, "0x11": temps, "0x12": lambda: INPUTS, "0x13": lambda: STATUS, "0x21": mode, "0x22": settemps}
KEYS = {"0x401": "heiz", "0x402": "ww", "0x501": "offset"}

async def handler(ws):
    last = None
    async for msg in ws:
        print("<<", msg, flush=True)
        if msg.startswith("LOGIN;"):
            STATE["level"] = "Benutzer"
            await ws.send(nav() if msg == "LOGIN;999999" else "<Navigation id='0x0'></Navigation>")
        elif msg.startswith("GET;"):
            last = msg[4:]
            await ws.send(PAGES.get(last, lambda: "<Content></Content>")())
        elif msg == "REFRESH" and last:
            await ws.send(PAGES[last]())
        elif msg.startswith("SET;set_"):
            _, key, val = msg.split(";")
            if key == "set_0x601": STATE["pending_code"] = val
            k = KEYS.get(key[4:])
            if k: STATE[k] = int(val)
        elif msg.startswith("SAVE") and STATE["pending_code"]:
            if STATE["pending_code"] == "9445": STATE["level"] = "Installateur"
            STATE["pending_code"] = None
            await ws.send(nav())
        elif msg.startswith("SAVE"):
            await ws.send(PAGES.get(last, lambda: "<Content></Content>")())

async def main():
    async with websockets.serve(handler, "127.0.0.1", 8214, subprotocols=["Lux_WS"]):
        await asyncio.Future()

asyncio.run(main())
