# Projektkontext: Wärmepumpen-App „Wärmepumpe“ (Luxtronik 2)

*Für ein Claude-Projekt: diese Datei als Projektwissen hochladen (zusammen mit README.md und ANALYSE_wp_jar.md).*

## Anlage
- Luxtronik-2-Steuerung, IP **192.168.178.120**, Typ **LWC**, Software **V1.86.0**
- Schnittstellen: Java-Protokoll **TCP 8888** (wie `java.html`/`wp.jar`), WebSocket **8214** (`Lux_WS`, Weboberfläche)
- Webserver-Passwort 999999 (Standard), Installateur-Code **9445** (wird wie im Applet nur lokal geprüft)

## App (Stand 08.11.2026, Version 2.6)
- Paket `de.wisser.waermepumpe`, minSdk 26, WebView-App, Quellen in `D:\git\Borstel67\APK_Luxtronik`
- Primär Java-Protokoll: lesen 3003 (Parameter), 3004 (Ist-Werte), 3005 (Sichtbarkeiten); schreiben 3002 mit Bestätigungsdialog
- Fallback: WebSocket-Oberfläche (LOGIN/GET/SET/SAVE)
- Tabs: Übersicht · Heizung · Warmwasser · Service (Informationen, Schaltuhren, Einstellungen) · App
- Design wie ESP32_AquaControl (`data/WifiManager.css`): Hell/Dunkel/System umschaltbar (Hell = AquaControl „STA Light Theme“), dunkles Navy-Theme, Header-Karte mit Verlaufs-Logo, Kacheln mit Sparkline, Buttons Blau→Cyan, Seitennavigation „Zurück / Startseite“, Fußzeile „© 2026 R.Wisser“
- Logik 1:1 aus dekompiliertem `wp.jar` (CFR): Heizung, Heizkurven, Heizgrenze, Warmwasser, Schaltuhren (SU), Temperaturen2, SystemEinstellung, WMZ/Effizienzpumpe inkl. Zugriffsstufen und Konfliktregeln

## Wichtige Parameter
| Funktion | Parameter |
|---|---|
| Betriebsart Heizung | 3 (+695/696/779, Flags 739/742/743/784, 108) |
| Betriebsart Warmwasser | 4 (+740) |
| Temperatur ± | 1 (Schritt 5 = 0,5 K) |
| WW-Soll | 2 und 105 (aktueller Ist-Soll calc 18, max P973) |
| Heizkurve HK | 11 Endpunkt, 12 Parallelverschiebung, 13 Nachtabsenkung; Festwert 17; Regelart 103 |
| Heizgrenze | 700 |
| Prioritäten (Heizung/WW/SWB) | 116/117/118, Startwerte nach P28 (`einstellung.Prioritaeten`) |
| Schaltuhren | Heizkreis 222, WW 405, Zirkulation 506 (Typ = P%3, Zeiten ab +1 in Sekunden) |

Echte Werte (04.11.2026): P28 = 2, P116 = 2, P117 = 1 (WW vor Heizung), P11 = 330, P12 = 230, P13 = 0, P700 = 140, P2 = 460, P105 = 500, P973 = 650, P82 = 0 (WW-Fühler).
Sichtbar: Heizkreis, Warmwasser, Heizgrenze, therm. Desinfektion, Zirkulation. Nicht vorhanden: Mischkreise, Kühlung, Lüftung, Schwimmbad.

## Build & Test
- `./build.sh` (Linux/WSL, ohne Gradle): `tools/build_web.py` → aapt2 → javac → dx → zipalign → Signatur (`keys/`, nicht im Git)
- `web/lux_data.js` aus wp.jar: `tools/gen_luxdata.py`
- Prüfskript `tools/lux_check.ps1` (nur lesen) → `lux_check_result.txt`, `lux_java.json`
- Tests: `mock/mock_8888.py` + `mock/test_v2.js`, Abgleich mit echten Daten `mock/compare_real.js`, Protokolltest `mock/LuxJavaTest.java`

## Offen / bewusst nicht umgesetzt
- Ferien (nur Bedienteil), Fehlerreset/Neustart (P761), Kurzprogramme, Entlüften, Diagnose, Sprache
- Nur Weboberfläche, nicht in wp.jar: „T-Diff. Koll. max“, „Smart Grid“, Regelgeschwindigkeit MK, Ausgang „FUP 1“
- Fehlerspeicher zeigte wiederholt „Niederdrucksperrung (702)“ (01.–03.11.2026) – ggf. Heizungsbauer
