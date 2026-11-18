# Luxtronik einrichten – Java-Schnittstelle (wp.jar) aktivieren und einbinden

Die App spricht die Luxtronik 2.0/2.1 genauso an wie das Original-Java-Applet `wp.jar`,
das die Steuerung über ihre eigene Webseite (`java.html`) ausliefert: per Binärprotokoll über
**TCP-Port 8888** (Fallback **8889**). Damit das funktioniert, muss an der Steuerung der
**Webserver** eingeschaltet und die Steuerung im Heimnetz erreichbar sein.

Diese Anleitung beschreibt

1. die Einstellungen am Bedienteil der Wärmepumpe,
2. die Prüfung, ob die Java-Schnittstelle erreichbar ist,
3. das Aktivieren der Java-Schnittstelle in der App,
4. das Einbinden der `wp.jar` in dieses Projekt (nur für Entwickler, wenn `web/lux_data.js` neu erzeugt werden soll).

> Getestete Anlage: Luxtronik 2, Typ LWC, Software **V1.86.0**, IP 192.168.178.120.

---

## 1. Einstellungen am Bedienteil der Luxtronik

Voraussetzung: Die Steuerung ist per **LAN-Kabel** mit dem Router/Switch verbunden
(Netzwerkbuchse an der Unterseite des Bedienteils). WLAN hat die Luxtronik 2 nicht.

Am Bedienteil (Drehknopf):

1. **Service** → **Systemsteuerung** → **Webserver** öffnen.
2. **Lokaler Webserver: Ein** – ohne diese Option ist weder die Weboberfläche noch die
   Java-Schnittstelle (Port 8888) aktiv.
3. **Passwort** prüfen bzw. vergeben: Standard ist **999999**. Es muss eine **6-stellige Ziffernfolge** sein
   (das Applet und die App prüfen genau 6 Stellen). Mit falschem Passwort kann nur gelesen, aber nichts geändert werden.
4. **DHCP**:
   - Im Heimnetz mit Router: **DHCP-Server: Aus**, **DHCP-Client: Ein** – die Steuerung holt sich eine Adresse vom Router.
   - Alternativ DHCP-Client aus und unter **Systemsteuerung → IP-Adresse** eine feste Adresse,
     Subnetzmaske, Gateway und DNS eintragen.
   - Ein Umschalten der DHCP-Option erfordert in der Regel einen **Neustart (Reset) der Steuerung**.
5. Optional **Fernsteuerung: Ein** – dann zeigt die Weboberfläche zusätzlich eine Emulation des Bedienteils.
   Für die App ist das nicht nötig.
6. **Fernwartung** (Herstellerportal) wird für die App **nicht** benötigt und kann aus bleiben.

**Empfehlung:** Im Router (z. B. FRITZ!Box) für die Wärmepumpe eine **feste IP-Adresse** reservieren
(„Diesem Netzwerkgerät immer die gleiche IPv4-Adresse zuweisen“). Die App verbindet sich über die
IP-Adresse – ändert sie sich, findet die App die Anlage nicht mehr.

> Hinweis: Menünamen können je nach Hersteller (alpha innotec, Novelan, Siemens, Bosch …) und Softwarestand
> leicht abweichen. Die Einstellungen liegen immer im Bereich **Service → Systemsteuerung**.

## 2. Prüfen, ob die Schnittstelle erreichbar ist

| Prüfung | Erwartung |
|---|---|
| Browser: `http://192.168.178.120/` | Startseite der Luxtronik (je nach Firmware Java-Seite `java.html` oder Weboberfläche) |
| Port **8888** offen | Java-Schnittstelle wie `wp.jar` (Luxtronik 2.0/2.1 mit Firmware V1.x/V2.x) |
| Port **8889** offen | gleiche Schnittstelle bei manchen neueren Firmwareständen |
| Port **8214** offen | WebSocket-Weboberfläche (`Lux_WS`) – Fallback der App |

Schnelltest unter Windows (PowerShell):

```powershell
Test-NetConnection 192.168.178.120 -Port 8888
Test-NetConnection 192.168.178.120 -Port 8214
```

Ausführlicher Test (**nur lesend**, ändert nichts an der Anlage):

```powershell
cd tools
.\lux_check.ps1 -IP 192.168.178.120 -Pass 999999
```

Das Skript fragt die WebSocket-Seiten (8214) und die Java-Befehle 3003/3004/3005 (8888/8889) ab
und schreibt das Ergebnis nach `tools/lux_check_result.txt` und `tools/lux_java.json`.

**Fehlerbilder**

| Symptom | Ursache / Abhilfe |
|---|---|
| Keine Verbindung zu 8888 **und** 8889, Weboberfläche geht | Firmware ohne Java-Schnittstelle (z. B. Luxtronik mit Software 3.x). Die App arbeitet dann automatisch über den WebSocket (8214). |
| Gar keine Verbindung | „Lokaler Webserver“ aus, falsche IP, Kabel/Switch, DHCP-Einstellung → Abschnitt 1 prüfen |
| Verbindung bricht nach einiger Zeit ab / Webserver hängt | Der Webserver der Luxtronik ist schwach: Abfrageintervall in der App nicht unter 10–15 s setzen, nicht parallel mehrere Programme (ioBroker, Home Assistant …) im Sekundentakt abfragen lassen. Notfalls Steuerung neu starten. |
| Werte lesbar, Ändern geht nicht | Passwort falsch bzw. nicht 6-stellig, oder in der App „Werte ändern erlauben“ ausgeschaltet |

## 3. Java-Schnittstelle in der App aktivieren

In der App: Tab **App** (Einstellungen)

| Feld | Wert |
|---|---|
| IP-Adresse der Wärmepumpe | z. B. `192.168.178.120` |
| WebSocket-Port | `8214` (nur für den Fallback) |
| Passwort (Webserver) | `999999` bzw. das am Bedienteil vergebene 6-stellige Passwort |
| Zugangscode Installateur | `9445` = Installateur-Ebene, leer = Benutzer-Ebene |
| **Java-Schnittstelle wie wp.jar (Port 8888) verwenden** | **ein** (Standard) |
| Werte ändern erlauben | ein, wenn Einstellungen geändert werden sollen |

**Speichern & verbinden** tippen. Unten auf der Einstellungsseite steht die **aktive Datenquelle**:

- „Java-Schnittstelle (Port 8888, wie wp.jar)“ → alles in Ordnung, die App nutzt das Applet-Protokoll.
- „WebSocket (Port 8214)“ → 8888/8889 nicht erreichbar, die App nutzt die Weboberfläche (eingeschränkter Funktionsumfang).

Der Installateur-Code wird – wie im Original-Applet – **nur in der App** geprüft; an die Steuerung wird
dabei nichts gesendet. Er blendet lediglich zusätzliche Einstellungen ein.

## 4. wp.jar ins Projekt einbinden (Entwickler)

Die **App selbst braucht die `wp.jar` zur Laufzeit nicht** – alle benötigten Texte und Tabellen sind in
`web/lux_data.js` enthalten. Die `wp.jar` wird nur gebraucht, um `web/lux_data.js` neu zu erzeugen
(z. B. nach einem Firmware-Update mit geändertem Applet).

> Die `wp.jar` ist urheberrechtlich geschütztes Eigentum des Herstellers (AIT, signiert `META-INF/AIT_WEBS.*`)
> und ist deshalb **nicht im Repository** enthalten (`.gitignore`). Jeder holt sie sich von der eigenen Steuerung.

### 4.1 wp.jar von der eigenen Steuerung holen

1. Im Browser `http://<IP-der-WP>/` öffnen. Bei Firmware mit Java-Oberfläche lädt die Startseite
   (`java.html`) das Applet `wp.jar` (im Seitenquelltext beim `<applet …>`-Tag als `archive` angegeben).
2. Die Datei direkt laden, z. B. `http://192.168.178.120/wp.jar`, und als **`tools/wp.jar`** speichern.

Moderne Browser führen Java-Applets nicht mehr aus. Wer das Original trotzdem starten möchte,
kann den `appletviewer` aus einem **JDK 8** verwenden: `appletviewer http://192.168.178.120/java.html`.

### 4.2 lux_data.js neu erzeugen

Benötigt: Java (JDK), Python 3, [CFR-Decompiler](https://www.benf.org/other/cfr/) (`cfr.jar`).

```bash
java -jar cfr.jar tools/wp.jar --outputdir src_wp     # Klassen dekompilieren
unzip tools/wp.jar -d jar_wp                          # Ressourcen (lang_de.properties …)
python3 tools/gen_luxdata.py src_wp jar_wp web/java_ui.js web/lux_data.js
./build.sh                                            # APK bauen
```

`src_wp/` und `jar_wp/` sind ebenfalls per `.gitignore` ausgeschlossen.

### 4.3 Was aus der wp.jar übernommen wurde

Details zur Analyse (Protokoll, Parameter, Zugriffsstufen, Abgleich mit Live-Daten) stehen in
[`ANALYSE_wp_jar.md`](../ANALYSE_wp_jar.md). Kurzfassung des Protokolls (Big-Endian int32 über TCP):

| Befehl | Anfrage | Antwort | Zweck |
|---|---|---|---|
| 3003 | `3003, 0` | `3003, len, int[len]` | alle Parameter lesen |
| 3004 | `3004, 0` | `3004, status, len, int[len]` | Ist-Werte (Temperaturen ÷ 10) |
| 3005 | `3005, 0` | `3005, len, byte[len]` | Sichtbarkeiten (was an der Anlage vorhanden ist) |
| 3002 | `3002, id, wert` | `3002, id` | einen Parameter schreiben |

**Vorsicht beim Schreiben:** Über 3002 wird ohne weitere Rückfrage direkt in die Steuerung geschrieben.
Die App zeigt deshalb vor jedem Senden eine Liste „Parameter alt → neu“ und schreibt nur geänderte Werte.
Eigene Experimente bitte zuerst mit der Test-Steuerung `mock/mock_8888.py`.
