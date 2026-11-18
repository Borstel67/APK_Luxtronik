# Wärmepumpe – Android-App für Luxtronik 2.x

Android-App (ab Android 8) zum Anzeigen und Einstellen einer Wärmepumpe mit **Luxtronik-2-Steuerung**
(alpha innotec, Novelan, Siemens u. a.) im Heimnetz.

Die App arbeitet wie das Original-Java-Applet **`wp.jar`**, das die Steuerung über ihre Webseite ausliefert:
über die **Java-Schnittstelle (TCP 8888, Fallback 8889)**. Ist diese nicht erreichbar, verbindet sie sich
automatisch über die Luxtronik-Weboberfläche per **WebSocket (Port 8214)**.

**Aktuelle Version: 2.9** → [`apk/Waermepumpe-2.9.apk`](apk/Waermepumpe-2.9.apk)

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [Luxtronik einrichten](docs/LUXTRONIK_EINRICHTUNG.md) | Webserver/Java-Schnittstelle an der Steuerung aktivieren, Verbindung prüfen, Java-Modus in der App einschalten, `wp.jar` ins Projekt einbinden |
| [Bedienungsanleitung](docs/BEDIENUNG.md) | Installation, Tabs, Heizung, Warmwasser, Schaltuhren, Werte ändern, Zugriffsstufen |
| [Entwicklung](docs/ENTWICKLUNG.md) | Architektur, Build ohne Gradle, Tests, Parameter, Versionen |
| [Analyse wp.jar](ANALYSE_wp_jar.md) | Protokoll und Logik des Original-Applets, Abgleich mit Live-Daten |
| [Projektkontext](PROJEKT_KONTEXT.md) | Anlage, wichtige Parameter, offene Punkte |

## Schnellstart

1. **Steuerung vorbereiten:** Am Bedienteil *Service → Systemsteuerung → Webserver* → **Lokaler Webserver: Ein**,
   Passwort (Standard `999999`), DHCP-Client ein. Steuerung per LAN ans Heimnetz.
   → [Details](docs/LUXTRONIK_EINRICHTUNG.md#1-einstellungen-am-bedienteil-der-luxtronik)
2. **APK installieren:** `apk/Waermepumpe-2.9.apk` aufs Handy und installieren.
3. **App einrichten:** Tab *App* → IP-Adresse, Passwort, optional Installateur-Code `9445`,
   „Java-Schnittstelle wie wp.jar (Port 8888) verwenden“ **ein** → *Speichern & verbinden*.

## Funktionen

| Bereich | Inhalt | Parameter (wie Applet) |
|---|---|---|
| Übersicht | Außentemp., Betriebszustand, Temperaturen mit Verlauf, letzte Fehler/Abschaltungen | 3004 |
| Betriebsart Heizung | Automatik / Party / Zweit.-Wärmeerz. / Aus (Ferien nur Bedienteil) | 3 + 695/696/779, Flags 739/742/743/784, 108 |
| Temperatur ± | −5,0 … +5,0 K | 1 |
| Heizkurve HK/MK1–3 | Endpunkt, Parallelverschiebung, Nachtabsenkung bzw. Festwert, Kennlinie berechnet | 11–13 / 17, 14–16 / 18, 141–143 / 145, 774–776 / 778 |
| Heizgrenze | 5 … 30 °C | 700 |
| Warmwasser | Betriebsart, Soll 30 °C … max (P973) | 4 (+740), 2 + 105 |
| Therm. Desinfektion / Zirkulation | Tage Mo–So, Dauerbetrieb; Takt Ein/Aus (Installateur) | 20–27, 697/698 |
| Schaltzeiten | Heizkreis, Warmwasser, Zirkulation, MK1–3, Schwimmbad; Woche / 5+2 / Tage | 222, 405, 506, 283, 344, 788, 607 |
| Informationen | alle Werte aus `service/Informationen` inkl. Fehlerspeicher/Abschaltungen im Klartext | 3004, 3005 |
| Einstellungen | Temperaturen, System Einstellung, WMZ/Effizienzpumpe – mit Zugriffsstufen und Konfliktprüfung | lt. `einstellung/*` |
| Bedienung | Tabwechsel per Wischgeste, Hell/Dunkel/System-Design | – |

**Schreiben:** Jede Änderung zeigt vorher eine Liste „Parameter alt → neu“; erst „Senden“ schreibt per 3002.
Unveränderte Werte werden übersprungen, jede Schreibquittung wird geprüft.

## Projektstruktur

```
src/de/wisser/waermepumpe/   MainActivity (WebView + Bridge), LuxJava (Binärprotokoll)
web/                         Quellen der Oberfläche (index.src.html, java_ui.js, lux_data.js)
assets/index.html            gebaute Oberfläche (von build.sh erzeugt)
tools/                       Build-Helfer, Generator lux_data.js, Prüfskript lux_check.ps1
mock/                        Test-Steuerungen und Tests
docs/                        Dokumentation
apk/                         fertige APK
```

## Build

```bash
./build.sh    # Linux/WSL, ohne Gradle → build/Waermepumpe.apk
```

Voraussetzungen und Tests: siehe [Entwicklung](docs/ENTWICKLUNG.md).

## Nicht im Repository

- **Signaturschlüssel** `keys/` – privat.
- **`tools/wp.jar`** – das Original-Applet ist Eigentum des Herstellers und wird nicht weiterverteilt.
  Es wird nur zum Neuerzeugen von `web/lux_data.js` gebraucht und kann von der eigenen Steuerung geladen werden
  ([Anleitung](docs/LUXTRONIK_EINRICHTUNG.md#5-wpjar-ins-projekt-einbinden-entwickler)).

## Hinweis

Privates Projekt ohne Verbindung zum Hersteller. „Luxtronik“ und „alpha innotec“ sind Marken ihrer jeweiligen Inhaber.
Änderungen an der Wärmepumpe erfolgen auf eigene Verantwortung.

© 2026 R. Wisser
