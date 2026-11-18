# Bedienungsanleitung – App „Wärmepumpe“ (Version 2.9)

Android-App zum Anzeigen und Einstellen einer Wärmepumpe mit **Luxtronik-2-Steuerung** im Heimnetz.
Die App arbeitet wie das Original-Java-Applet (`wp.jar`) der Steuerung, ist aber für das Smartphone gemacht.

## Installation

1. `apk/Waermepumpe-2.9.apk` aufs Handy kopieren (oder aus dem GitHub-Release laden).
2. Antippen und installieren – beim ersten Mal „Installation aus unbekannten Quellen“ für den Dateimanager/Browser erlauben.
3. Voraussetzung: Android **8.0** oder neuer, Handy im **selben WLAN/Heimnetz** wie die Wärmepumpe
   (von unterwegs z. B. per VPN/Tailscale).
4. Die Steuerung muss vorbereitet sein → [Luxtronik einrichten](LUXTRONIK_EINRICHTUNG.md).

Updates einfach über die alte Version installieren – die Einstellungen bleiben erhalten
(alle Versionen sind mit demselben Schlüssel signiert).

## Erster Start

Tab **App** öffnen, IP-Adresse der Wärmepumpe, Passwort (Standard `999999`) und ggf. den
Installateur-Code eintragen, dann **Speichern & verbinden**. Details siehe
[Abschnitt 4 der Einrichtung](LUXTRONIK_EINRICHTUNG.md#4-java-schnittstelle-in-der-app-aktivieren).

## Aufbau

Unten gibt es fünf Tabs. Zwischen den Tabs kann man auch **horizontal wischen** – die Seite folgt dem Finger,
gewechselt wird ab etwa einem Fünftel der Bildschirmbreite oder bei einem schnellen Wisch.
Am äußersten Bildschirmrand (16 px) bleibt die Android-Zurück-Geste aktiv; in Dialogen und Eingabefeldern ist Wischen aus.

| Tab | Inhalt |
|---|---|
| **Übersicht** | Außentemperatur, Betriebszustand, Vorlauf/Rücklauf, Warmwasser, Wärmequelle als Kacheln mit Verlauf (Sparkline), letzte Fehler und Abschaltungen im Klartext |
| **Heizung** | Betriebsart, Temperatur ±, Heizkurve, Heizgrenze, Schaltzeiten Heizkreis |
| **Warmwasser** | Betriebsart, Warmwasser-Soll, thermische Desinfektion, Zirkulation, Schaltzeiten |
| **Service** | Informationen (Temperaturen, Eingänge, Ausgänge, Ablaufzeiten, Betriebsstunden, Fehlerspeicher, Abschaltungen, Anlagenstatus), Schaltuhren, Einstellungen |
| **App** | Verbindung, Passwort, Zugangscode, Aktualisierungsintervall, Darstellung |

Angezeigt wird nur, was an der eigenen Anlage vorhanden ist (die Steuerung meldet das über die
„Sichtbarkeiten“). Nicht vorhandene Mischkreise, Kühlung, Lüftung oder Schwimmbad erscheinen nicht.

Innerhalb der Seiten gibt es unten die Navigation **Zurück / Startseite**; die Android-Zurück-Taste geht ebenfalls eine Ebene zurück.

## Heizung

| Einstellung | Bereich | Hinweis |
|---|---|---|
| Betriebsart | Automatik · Party · Zweiter Wärmeerzeuger · Aus | „Ferien“ ist nur am Bedienteil einstellbar |
| Temperatur ± | −5,0 … +5,0 K in 0,5-K-Schritten | verschiebt die Heizkurve parallel |
| Heizkurve | Endpunkt, Parallelverschiebung, Nachtabsenkung (bzw. Festwert bei Festwertregelung) | Die Kennlinie wird als Grafik berechnet und angezeigt |
| Heizgrenze | 5 … 30 °C | oberhalb dieser Außentemperatur wird nicht geheizt |
| Prioritäten | Heizung / Warmwasser / Schwimmbad | Reihenfolge der Anforderungen (Installateur) |

## Warmwasser

| Einstellung | Bereich | Hinweis |
|---|---|---|
| Betriebsart | Automatik · Party · Zweiter Wärmeerzeuger · Aus | |
| Warmwasser-Soll | 30 °C … Maximum der Anlage | schreibt – wie das Applet – beide Sollwert-Parameter |
| Thermische Desinfektion | Tage Mo–So oder Dauerbetrieb | |
| Zirkulation | Takt Ein/Aus | nur Installateur |

## Schaltuhren

Für Heizkreis, Warmwasser und Zirkulation (sowie Mischkreise/Schwimmbad, falls vorhanden).
Wählbar sind die Varianten **Woche** (alle Tage gleich), **5+2** (Mo–Fr / Sa–So) und **Tage** (jeder Tag einzeln)
mit jeweils mehreren Ein/Aus-Zeitfenstern – genau wie im Original-Applet.

## Werte ändern

1. Wert antippen → Dialog zum Einstellen.
2. **Übernehmen** sammelt die Änderung; unten erscheint eine Sendeleiste.
3. **Senden** zeigt zuerst eine Liste **„Parameter alt → neu“**. Erst nach Bestätigung wird geschrieben.
4. Unveränderte Werte werden übersprungen, jede Schreibquittung der Steuerung wird geprüft;
   bei einem Fehler bricht die App ab und meldet ihn.

Ändern ist nur möglich, wenn in den App-Einstellungen **„Werte ändern erlauben“** eingeschaltet ist.
Werte, die eine höhere Zugriffsstufe brauchen (Kundendienst/Werk), bleiben grau und sind nur lesbar.

## Zugriffsstufen

| Stufe | Code in der App | Wirkung |
|---|---|---|
| Benutzer | leer | Betriebsarten, Temperaturen, Schaltzeiten |
| Installateur | `9445` | zusätzlich Einstellungen, Prioritäten, Zirkulation, Systemeinstellungen |

Der Code wird wie im Applet nur in der App geprüft und nicht an die Steuerung gesendet.
Konfliktregeln des Applets (z. B. zweiter Wärmeerzeuger, Wärmemengenzähler, Effizienzpumpe) sind übernommen –
unzulässige Kombinationen werden verhindert.

## App-Einstellungen

| Einstellung | Standard |
|---|---|
| IP-Adresse der Wärmepumpe | 192.168.178.120 |
| WebSocket-Port | 8214 |
| Passwort (Webserver) | 999999 |
| Zugangscode Installateur | 9445 |
| Aktualisierung | 15 s (minimal 5 s – zu kurze Intervalle können den Webserver der Luxtronik überlasten) |
| Java-Schnittstelle wie wp.jar (Port 8888) | ein |
| Werte ändern erlauben | ein |
| Darstellung | System (hell/dunkel automatisch), Hell, Dunkel |

## Datenquellen

- **Java-Schnittstelle (Port 8888/8889)** – primär, voller Funktionsumfang wie `wp.jar`.
- **WebSocket (Port 8214)** – automatischer Fallback über die Luxtronik-Weboberfläche, wenn 8888/8889 nicht erreichbar sind.
  Werte der Java-Schnittstelle, die auf der Weboberfläche fehlen, werden mit **„J“** markiert bzw. im Block
  „Ergänzt aus wp.jar“ angezeigt.

## Bewusst nicht enthalten

Ferienprogramm, Fehlerreset/Neustart, Kurzprogramme, Entlüften, Diagnose, Sprachauswahl sowie
Kundendienst-/Werkseinstellungen – diese gehören ans Bedienteil bzw. zum Heizungsbauer.

## Haftung

Privates Projekt ohne Verbindung zum Hersteller der Steuerung. Änderungen an der Wärmepumpe erfolgen auf eigene
Verantwortung. Im Zweifel Einstellungen mit dem Heizungsbauer abstimmen.
