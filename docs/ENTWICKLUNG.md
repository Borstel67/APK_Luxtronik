# Entwicklung – Aufbau, Build und Tests

## Architektur

```
┌────────────── Android (MainActivity) ──────────────┐
│ WebView lädt assets/index.html                     │
│   Basis-URL = http://<IP-der-WP>/  (Origin für WS) │
│                                                    │
│ JS-Bridge „Android“                                │
│   get/set  – Einstellungen (SharedPreferences)     │
│   javaRead(host, id)      → LuxJava.readAll()      │──► TCP 8888/8889  3003/3004/3005
│   javaWrite(host,port,…)  → LuxJava.write()        │──► TCP 8888/8889  3002
│   reload, isNight, setBarColor                     │
└────────────────────────────────────────────────────┘
        Fallback im Browser-Teil: WebSocket ws://<IP>:8214 („Lux_WS“: LOGIN/GET/SET/SAVE)
```

| Pfad | Inhalt |
|---|---|
| `src/de/wisser/waermepumpe/MainActivity.java` | WebView, Bridge, Zurück-Taste, Theme-Wechsel |
| `src/de/wisser/waermepumpe/LuxJava.java` | Binärprotokoll wie `communication.Connect` aus wp.jar (reines `java.net`, am PC testbar) |
| `web/index.src.html` | Grundgerüst, Design, Tabs, Wischgeste, WebSocket-Fallback, App-Einstellungen |
| `web/java_ui.js` | Oberfläche und Logik auf wp.jar-Basis (Quellklassen jeweils im Kommentar) |
| `web/lux_data.js` | **generiert** aus wp.jar: Texte (de), Info-Tabelle, Fehler-/Abschalttexte, WP-Typen |
| `assets/index.html` | gebaute Seite, alles inline – **nicht von Hand ändern** |
| `tools/build_web.py` | baut `assets/index.html` aus `web/` |
| `tools/gen_luxdata.py` | erzeugt `web/lux_data.js` aus dekompilierter wp.jar |
| `tools/lux_check.ps1` | Prüfskript (nur lesen) gegen die echte Anlage |
| `tools/lux_java.json`, `tools/lux_check_result.txt` | aufgezeichnete Echtdaten (für Tests) |
| `mock/` | Test-Steuerungen und Tests |
| `build.sh`, `tools_zip.py`, `sign.mjs` | Build ohne Gradle |
| `apk/` | fertige APK |

## Build (Linux/WSL, ohne Gradle)

Benötigt: JDK, Node.js, Python 3 und in `~/tools`:

- `aapt2` aus npm `aaptjs3`
- `android.jar` (API 28)
- dex2jar-Tools (enthält `dx`)
- npm `apk_sign_ts`

Signaturschlüssel: `keys/key.pem` + `keys/cert.pem` (nicht im Repository). **Für Updates immer denselben
Schlüssel verwenden**, sonst lässt sich die App nicht über die alte Version installieren.
Wer das Projekt nachbaut, erzeugt sich einen eigenen Schlüssel, z. B.:

```bash
mkdir -p keys
openssl req -x509 -newkey rsa:2048 -nodes -keyout keys/key.pem -out keys/cert.pem -days 10000 -subj "/CN=Waermepumpe"
```

Dann:

```bash
./build.sh          # → build/Waermepumpe.apk
```

Ablauf: `tools/build_web.py` → `aapt2 compile/link` → `javac` → `dx` → `tools_zip.py` (zipalign) → `sign.mjs`.

**Nur Weboberfläche geändert?** Dann reicht: `assets/index.html` in der letzten APK ersetzen, Version im
Binär-Manifest anheben, `tools_zip.py` + `sign.mjs`.

Version anheben: `android:versionCode` / `android:versionName` in `AndroidManifest.xml`.

## Tests

```bash
python3 mock/mock_8888.py &                 # Test-Steuerung: TCP 8888 + HTTP-Bridge 8098
cd assets && python3 -m http.server 8099 &  # gebaute Seite ausliefern
node mock/test_v2.js                        # Bedienung + Schreibsequenzen
node mock/test_swipe.js                     # Wischgeste
node mock/compare_real.js                   # Abgleich mit aufgezeichneten Echtdaten
javac -d out src/de/wisser/waermepumpe/LuxJava.java mock/LuxJavaTest.java && java -cp out LuxJavaTest
```

| Datei | Zweck |
|---|---|
| `mock/mock_8888.py` | Test-Steuerung Java-Protokoll, nutzt `tools/lux_java.json` falls vorhanden |
| `mock/mock_lux.py`, `mock/replay_lux.py` | Test-Steuerung WebSocket bzw. Abspielen echter Antworten |
| `mock/test_v2.js`, `test_v2_real.js` | End-to-End-Test der Oberfläche (Java-Modus) |
| `mock/test_fallback.js` | Umschalten auf WebSocket |
| `mock/test_prio*.js`, `test_chips.js`, `test_theme.js`, `test_design.js`, `test_swipe.js` | Einzelfunktionen |
| `mock/LuxJavaTest.java` | Protokolltest `LuxJava` am PC |

## Wichtige Parameter (Java-Protokoll)

| Funktion | Parameter |
|---|---|
| Betriebsart Heizung | 3 (+695/696/779, Flags 739/742/743/784, 108) |
| Betriebsart Warmwasser | 4 (+740) |
| Temperatur ± | 1 (Schritt 5 = 0,5 K) |
| WW-Soll | 2 und 105 (Ist-Soll calc 18, max P973) |
| Heizkurve HK | 11 Endpunkt, 12 Parallelverschiebung, 13 Nachtabsenkung; Festwert 17 |
| Heizgrenze | 700 |
| Prioritäten Heizung/WW/Schwimmbad | 116/117/118 |
| Schaltuhren | Heizkreis 222, WW 405, Zirkulation 506 (Typ = P % 3, Zeiten ab +1 in Sekunden) |

Mehr in [`ANALYSE_wp_jar.md`](../ANALYSE_wp_jar.md) und [`PROJEKT_KONTEXT.md`](../PROJEKT_KONTEXT.md).

## Versionen

| Version | Änderung |
|---|---|
| 1.1–1.4 | WebSocket-Oberfläche, Absicherung Zugangscode, Zusatzwerte aus Port 8888 (nur lesen) |
| 2.0 | App auf Basis von wp.jar: Java-Protokoll lesen/schreiben, Logik 1:1 portiert |
| 2.1 | Abgleich mit echten Daten, Korrekturen Sichtbarkeiten |
| 2.2–2.4 | Design wie ESP32_AquaControl, Hell/Dunkel/System |
| 2.5–2.8 | u. a. Prioritäten Heizung/Warmwasser/Schwimmbad, Detailkorrekturen |
| 2.9 | Tabwechsel per Wischgeste |
