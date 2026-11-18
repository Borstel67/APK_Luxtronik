# Analyse wp.jar (Java-Applet von java.html)

Dekompiliert mit CFR 0.152. Signiert von AIT (`META-INF/AIT_WEBS.*`).

## Verbindung
- Klasse `communication.Connect`: TCP-Socket auf **Port 8888** (nicht 8889) zum Host der Seite.
- Binärprotokoll, Big-Endian int32:
  | Befehl | Bedeutung |
  |---|---|
  | 3001 | Attribute |
  | 3002 | Parameter schreiben (`3002, id, wert` → Antwort `3002, id`) |
  | 3003 | alle Parameter lesen |
  | 3004 | Berechnungen / Ist-Werte lesen (`3004, 0` → `3004, status, len, werte…`) |
  | 3005 | Sichtbarkeiten |
  | 3006 | Authentifizierung (im Applet nicht genutzt) |

## Passwörter
- **Webserver-Passwort** (Login-Dialog): wird **im Applet** geprüft. Die 6 Ziffern stehen in den
  Parametern 755–760 (`authenticate()`), deshalb muss das Passwort genau 6 Stellen haben (Standard 999999).
- **Zugangscode** (`Navigation.Datenzugang.setZugang()`): wird ebenfalls **nur im Applet** geprüft:
  - `9445` → Installateur (Zugriff 2)
  - weitere Codes für Kundendienst/Administrator sind fest im Applet hinterlegt (nicht für Endkunden)
  - Es wird **nichts an die Steuerung gesendet**, es werden nur zusätzliche Menüpunkte eingeblendet.
- Parameter **107** „Einst_Zugangscode“ ist ein Wert, den das Kurzprogramm setzt (0/1/3), **kein** Login.
  Folge für die App: Sie darf nie „irgendein“ Feld mit 9445 beschreiben → in v1.2 abgesichert.

## Umrechnung Ist-Werte (3004, alle Temperaturen ÷ 10)
| Index | Name (Firmware-Text) |
|---|---|
| 10 | Vorlauf |
| 189 | Vorlauf Soll |
| 11 | Rücklauf |
| 12 | Rückl.-Soll |
| 13 | Rückl.-Extern |
| 14 | Heissgas |
| 15 | Aussentemperatur |
| 16 | Mitteltemperatur |
| 17 | Warmwasser-Ist |
| 18 | Warmwasser-Soll |
| 19 | Wärmequelle-Ein |
| 20 | Wärmequelle-Aus |
| 21 / 22 | Mischkreis1-Vorlauf / -Soll |
| 24 / 25 | Mischkreis2-Vorlauf / -Soll |

Die Texte stimmen mit den Namensmustern der App-Übersicht überein (inkl. „Aussentemperatur“ mit „ss“).

## Abgleich mit Live-Daten (04.11.2026, tools/lux_check_result.txt)
- Firmware **V1.86.0**, Typ **LWC**. WebSocket (8214) und Java-Port (8888) liefern dieselben Werte
  (Vorlauf 26,7 · Rücklauf 26,7/26,8 · Rückl.-Soll 30,1 · Außen 7,7 · WW 48,2/46,0 · WQ 7,9/-1,1 °C).
  Kleine Abweichungen ±0,1 K kommen von den wenige Sekunden auseinanderliegenden Abfragen.
- Rohwerte 81–87 = ASCII „V1.86.0“, Index 100–104 = Fehlercode 702 → passt zum Fehlerspeicher.
- Seite „Zugang“: Feld **Passwort** (min 0, max 9999, Zahl) + **Fehlerreset** (Ja/Nein).
  → App 1.3 schreibt den Code nur in „Passwort“, nie in „Fehlerreset“ oder andere Felder.
- Nach `LOGIN;999999` meldet die Steuerung bereits „Zugang: Installateur“.
- Content-XML hat kein Gruppen-Item: `<Content><name>…</name><item>…</item>…</Content>`; IDs haben die Form `0x0x…`.
- `mock/replay_lux.py` spielt die aufgezeichneten Original-Antworten ab (Test mit echten Daten).

## Ergänzung fehlender Werte (App 1.4)
- Die App liest zusätzlich die Java-Schnittstelle (TCP 8888, Fallback 8889) – **nur lesend** (3004 Werte, 3005 Sichtbarkeiten).
- Werteliste 1:1 aus `service/Informationen.java` + `lang_de.properties` (siehe `tools/wpjar_info_table.json`),
  Formatierung wie `InfoElement` (Faktor/Einheit, Ein/Aus, hh:mm:ss, IP, Ø-Laufzeit).
- Angezeigt wird nur, was die Anlage laut 3005 sichtbar schaltet **und** auf der WebSocket-Seite fehlt
  (Abgleich über den Namen). Markierung „J“ in der Übersicht, eigener Block „Ergänzt aus wp.jar“ auf den Informationsseiten.
- Ohne 3005-Daten erscheinen nur immer sichtbare Werte (IP-Adresse, Netzmaske, Broadcast, Gateway, Comfort-/Lüftungsplatine),
  damit nicht angeschlossene Fühler (z. B. Mischkreise mit 75,0 °C) nicht als Messwert auftauchen.
- Schalter in den Einstellungen: „Zusatzwerte aus wp.jar (Port 8888)“.

## Version 2.0 – App auf Basis von wp.jar
Portiert aus den dekompilierten Klassen (Schreiblogik 1:1):
- `heizung.Heizung`: Betriebsart HK (Param 3, Anzeige-Reihenfolge Automatik/Party/Ferien/Zweit-WE/Aus,
  Begleitparameter 695/696/779, Flags 739/742/743/784 → 0, Param 108 = 0 ohne Comfort-Platine),
  MK2/MK3 (696/779), Temperatur ± (Param 1 = Schieber × 5).
- `heizung.Heizkurven` / `HeizkurvenFest` / `Heizgrenze`: 11–13, 14–16, 141–143, 774–776 / 17, 18, 145, 778 / 700;
  Kennlinie: Soll = Fp + (Ep − 20)·(Fp − AT) / (20 − (AT − Fp)/2).
- `warmwasser.Warmwasser`: Betriebsart 4 (+740), Soll → 2 und 105 (Start = Ist-Soll calc 18, 30 … P973),
  TDI-Tage 20–27, Zirkulation 697/698 (nur Installateur, Sichtbarkeit 7/8).
- `schaltuhren.SU`: Typ = P(off) % 3 (+3 bei Tag/Nacht-Satz), Zeiten ab off+1 in Sekunden, Blöcke 1/2/7 Tage × Kanäle × (Ein, Aus).
- `hilfprogramm.Set`/`Einstellung` + `einstellung.Temperaturen2`/`SystemEinstellung`/`WMZ_Effizienzpumpe`:
  Sichtbarkeit, Zugriffsstufe, Zusatzplatinen (calc116 + 2·calc172), Formate, übersprungene Optionswerte,
  Konfliktregeln (ZWE Art/Funktion, aktive Kühlung, WMZ, Effizienzpumpe, Abtauzyklus) und Nacharbeiten
  (P2 ≤ P973; P132/133/966 ≥ P993; P93 folgt Medium Wärmequelle 975).
- Fehler-/Abschalttexte aus `hilfprogramm.TabelleText`; Zeitstempel = Unix-Zeit (geprüft: 1793803054 = 04.11.26 15:37:34 MEZ).
- Bewusst **nicht** übernommen: Ferien-Dialog, Fehlerreset/Neustart (761), Kurzprogramme, Entlüften, Diagnose,
  Sprache, Seriennummer, Werks-/Kundendienst-Codes.

## Abgleich App 2.1 mit echten Daten (3003/3004/3005 vom 04.11.2026, `mock/compare_real.js`)
App (Java-Modus) gegen die Original-WebSocket-Seiten derselben Steuerung:
| Seite | übereinstimmend | Abweichungen |
|---|---|---|
| Einstellungen › Temperaturen | 18 | – („T-Diff. Koll. max“ nur in der Weboberfläche, nicht in wp.jar) |
| System Einstellung | 43 | „Zugang“ P107 = 0: Applet-Text „Inst“, Weboberfläche „KD“ (nur lesbar); „Smart Grid“, „Regelung MK1–3 schnell/mittel/langsam“ nur in der Weboberfläche |
| Info Temperaturen / Eingänge / Ausgänge / Ablaufzeiten / Betriebsstunden | 12 / 6 / 15 / 10 / 8 | Heißgas ±0,2 K (Messzeitpunkt); Ausgang „FUP 1“ nur Weboberfläche |
| Anlagenstatus | 3 | Betriebszustand Keine Anforderung = „----“ in der Weboberfläche |
- Heizkurve geprüft: Endpunkt 33,0 / Parallelverschiebung 23,0 °C, außen 7,5 °C → Formel 30,26 °C, Steuerung Rückl.-Soll 30,2 °C.
- Sichtbarkeiten real: Heizkreis, Warmwasser, Heizgrenze, therm. Desinfektion, Zirkulation sichtbar; Mischkreise, Schwimmbad, Kühlung, Lüftung nicht.
  Korrektur: Schaltuhr Schwimmbad hängt an Sichtbarkeit 2 (nicht 119).
- Hinweis WW-Soll: P2 = 46,0 °C, P105 = 50,0 °C. Das Applet schreibt beim Senden **beide** mit demselben Wert – die App macht es genauso und zeigt P105 im Bestätigungsdialog an.
