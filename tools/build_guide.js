/* Anleitung für mebis-Import, Einstellungen und Fortschrittskontrolle + Änderungsübersicht (Word) */
"use strict";
const fs = require("fs"), path = require("path");
const { Document, Packer, Paragraph, TextRun, HeadingLevel, LevelFormat, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType } = require("docx");
const out = process.argv[2] || path.join(__dirname, "../dist/mebis/Anleitung_mebis_Vertiefungskurs.docx");
const F = "Arial";
const t = (s, o) => new TextRun(Object.assign({ text: s, font: F }, o || {}));
const p = (s, o) => new Paragraph({ children: typeof s === "string" ? [t(s)] : s, spacing: { after: 100 }, ...(o || {}) });
const h1 = s => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [t(s, { bold: true, size: 30, color: "1F6F78" })], spacing: { before: 240, after: 120 } });
const h2 = s => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [t(s, { bold: true, size: 24, color: "1F6F78" })], spacing: { before: 200, after: 80 } });
const li = (s, n) => new Paragraph({ numbering: { reference: n ? (n === 2 ? "num2" : "num") : "bul", level: 0 }, children: typeof s === "string" ? [t(s)] : s, spacing: { after: 60 } });
const b = s => t(s, { bold: true });
const W = 9638, thin = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
function table(cols, rows) {
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: cols, rows: rows.map((r, i) => new TableRow({ children: r.map((c, j) => new TableCell({ width: { size: cols[j], type: WidthType.DXA }, borders: { top: thin, bottom: thin, left: thin, right: thin },
    shading: i === 0 ? { fill: "E3F0F1", type: ShadingType.CLEAR, color: "auto" } : undefined, margins: { top: 60, bottom: 60, left: 90, right: 90 }, children: [new Paragraph({ children: [t(c, { bold: i === 0, size: 19 })] })] })) })) });
}
const C = [];
C.push(new Paragraph({ children: [t("Vertiefungskurs Robotik – Python & fischertechnik TXT 4.0", { bold: true, size: 36 })], spacing: { after: 60 } }));
C.push(p([t("Anleitung für mebis · Fortschrittskontrolle · Übersicht der Änderungen", { color: "5B6672" })]));

C.push(h1("1  Was wurde geliefert?"));
[
 [b("Lernwebseite (GitHub Pages): "), t("14 überarbeitete Lektionen (je ein Skript-Kapitel) – marconicklas.github.io/robotik-python")],
 [b("mebis-Kurs als Sicherung: "), t("Vertiefungskurs_Robotik_Python_TXT4.mbz (fertiger Kurs, ohne Nutzerdaten)")],
 [b("Einzelteile: "), t("14 SCORM-Lernpakete (Vertiefung mit Simulationen und Python-Aufgaben) und 14 Moodle-XML-Fragensammlungen (Verständnisprüfung)")],
 [b("Arbeitsblätter: "), t("14 druckfertige Arbeitsblätter zu den Lektionen (Word + PDF, auf der Webseite verlinkt) und 14 Lehrkraftlösungen (nur im Lieferordner). Die bisherigen Arbeitsblätter zu den 16 Doppelstunden bleiben unverändert verlinkt.")],
 [b("Gemeinsame Inhaltsgrundlage: "), t("content/lessons/L01.json … L14.json – daraus entstehen Webseite, mebis-Pakete und Arbeitsblätter")]
].forEach(x => C.push(li(x)));

C.push(h1("2  Warum diese technische Lösung?"));
C.push(p("Wie im Basiskurs: Kombination aus nativen mebis-Aktivitäten und SCORM (mebis = Moodle 5.1)."));
C.push(table([2300, 2700, 4638], [
 ["Schritt", "mebis-Aktivität", "Begründung"],
 ["① Leseauftrag", "Textseite", "Abschluss bei Ansicht; schaltet den Test frei."],
 ["② Verständnisprüfung", "Test (Multiple Choice, Zuordnung, Anordnung, Numerisch, Kurzantwort, Lückentext-Auswahl; Fehlersuche im Code als Mehrfachauswahl)", "Jede Antwort, jeder Versuch, Dauer und Fragenstatistik sind für Lehrkräfte sichtbar. „Interaktiv mit mehreren Versuchen“: Hinweis mit Skriptverweis nach Fehlversuch, Lösung nach dem 3. Versuch."],
 ["③ Vertiefung", "Lernpaket (SCORM 1.2)", "Nur SCORM kann Python im Browser (Pyodide) mit dem TXT-Simulator und die eigenen Simulationen tragen. Es meldet Ergebnis, Status, Zeit und jede Prüfung (Interaktionen) an mebis und speichert den Zwischenstand. H5P kann weder Python ausführen noch die Simulationen abbilden."],
 ["④ Abschluss", "Abschlussverfolgung + Voraussetzungen", "Test erst nach dem Leseauftrag, Vertiefung ab 70 % im Test, nächste Lektion nach abgeschlossener Vertiefung."]
]));
C.push(p([b("Hinweis Python im Lernpaket: "), t("Beim ersten Öffnen einer Python-Aufgabe lädt der Browser Python (Pyodide, ca. 10 MB) von cdn.jsdelivr.net. Die Schulgeräte brauchen dafür Internetzugang zu dieser Adresse. Die Simulationen und Fragen funktionieren auch ohne.")]));
C.push(p([b("Pflege: "), t("Nach Änderungen an content/: python3 tools/build.py (Webseite + Pakete), node tools/build_worksheets.js (Arbeitsblätter), python3 tools/test_py.py (prüft alle Python-Musterlösungen).")]));

C.push(h1("3  Import in mebis (empfohlen: Kurssicherung)"));
["In mebis anmelden → Kursübersicht → Pfeil neben „Neuer Kurs“ → „Kursbackup wiederherstellen“.",
 "Datei Basiskurs_Robotik_SPIKE_Fahrgestell1.mbz hochladen (6 MB; Grenze 512 MB) → „Kursbackup wiederherstellen“.",
 "Warten, bis unter „Aktuell laufende Wiederherstellungsprozesse“ der Status „Abgeschlossen“ steht.",
 "Kurs öffnen → Teilnehmer/innen: Klasse einschreiben.",
 "Kurzprüfung: Lektion 1 – Leseauftrag öffnen, Test starten (über „Rolle wechseln → Schüler/in“ siehst du die Sperren)."].forEach(x => C.push(li(x, true)));
C.push(p([b("Alternative in einen bestehenden Kurs: "), t("Kurs öffnen → Mehr → Kurse wiederverwenden → Sicherung wiederherstellen → .mbz hochladen → in bestehenden Kurs zusammenführen.")]));
C.push(h2("Manueller Aufbau (nur falls die Wiederherstellung nicht möglich ist)"));
["Pro Lektion einen Abschnitt anlegen.",
 "Textseite „Lxx Leseauftrag“ mit dem Text aus der Webseite; Abschluss: „Teilnehmer/in muss Aktivität aufrufen“.",
 "Test „Lxx Verständnisprüfung“: Fragenbank → Import → Format Moodle-XML → Lxx_Verstaendnispruefung.xml; alle Fragen hinzufügen. Frageverhalten „Interaktiv mit mehreren Versuchen“, Versuche unbegrenzt, Bewertung „Bester Versuch“, Bestehensgrenze 70 %, Abschluss „Bestehensnote erreichen“. Voraussetzung: Leseauftrag abgeschlossen.",
 "Lernpaket „Lxx Vertiefung“: Lxx_Vertiefung_SCORM.zip hochladen; Bewertung „Höchste Bewertung“, Versuche unbegrenzt, „Neuen Versuch erzwingen: Nein“, Anzeige im aktuellen Fenster, Struktur ausblenden; Abschluss „Status: abgeschlossen“. Voraussetzung: Bewertung im Test ≥ 70 %.",
 "Leseauftrag der nächsten Lektion: Voraussetzung „Vertiefung der vorigen Lektion abgeschlossen“."].forEach(x => C.push(li(x, 2)));

C.push(h2("Leistungsnachweise in mebis"));
C.push(p([t("Im Abschnitt „Leistungsnachweise“ stehen drei mebis-Aufgaben: LN 1 Vom Schaltplan zum Code (30 P., öffnet nach Vertiefung L05), LN 2 Präzise fahren (30 P., nach L11), LN 3 Mein Roboter lernt (20 P., mündlich, nach L14). Jede enthält alle Varianten mit Checkliste, Handlungsprodukt, Abgabeliste, Reflexionsfragen und Punkteverteilung (Text aus dist/mebis/leistungsnachweise). Abgabe: Texteingabe plus bis zu 20 Dateien (z. B. main.py, Video, Fotos). Bewertung mit Bewertungsrichtlinie (Kriterien und Höchstpunkte wie auf der Webseite). Kein Abgabetermin gesetzt – bei Bedarf in den Einstellungen eintragen.")]));
C.push(p([b("Hinweis: "), t("Die Leistungsnachweise wurden direkt im mebis-Kurs angelegt; die Kurssicherung (.mbz) enthält sie nicht.")]));

C.push(h1("4  Lernfortschritt in mebis nachvollziehen"));
C.push(table([3300, 6338], [
 ["Frage", "Wo in mebis?"],
 ["Wer hat begonnen?", "Kurs → Berichte → Aktivitätsabschluss (Leseauftrag erledigt); Testversuche und Lernpaket-Versuche."],
 ["Welche Lektionen begonnen/abgeschlossen?", "Berichte → Aktivitätsabschluss: Häkchen je Leseauftrag, Test und Vertiefung pro Person."],
 ["Welche Ergebnisse?", "Bewertungen (Bewerterübersicht): Test in % und Vertiefung in % je Lektion."],
 ["Welche Versuche?", "Test → Ergebnisse → Bewertung/Antworten (jeder Versuch mit Dauer); Lernpaket → Berichte → Basisbericht (Versuche, Start, letzter Zugriff, Punkte)."],
 ["Wo gibt es Schwierigkeiten?", "Test → Ergebnisse → Statistik (Leichtigkeitsindex je Frage) und Antworten (Einstellung „Alle Versuche“). Lernpaket → Berichte → Interaktionsbericht und Interaktionsbericht (jede Antwort; unter „Einstellungen“ zusätzlich „Zusammenfassung der Frage“ und „Ergebnis“ anhaken)."],
 ["Einzelne Antworten und Zeiten", "Test: vollständige Versuchsansicht mit Zeitpunkt und Dauer. Lernpaket: Klick auf die Punktzahl im Basisbericht → Tracking-Details mit allen Interaktionen inkl. Uhrzeit und Bearbeitungsdauer (Latenz)."]
]));
C.push(p([b("Bewertungslogik Vertiefung: "), t("Aufgabe gelöst ohne Lösungshilfe = 1 Punkt; im 2. Versuch = ½ Punkt; mit angezeigter Lösung = 0 Punkte, gilt aber als bearbeitet. Die Lektion ist abgeschlossen, wenn alle Pflichtaufgaben bearbeitet sind.")]));

C.push(h2("Leistungsnachweise in mebis"));
C.push(p([t("Im Abschnitt „Leistungsnachweise“ stehen drei mebis-Aufgaben: LN 1 Einparkhilfe (30 P., öffnet nach Vertiefung L08), LN 3 Fehlerdetektive (20 P., nach L11), LN 2 Missionsbereit (30 P., nach L13). Jede enthält alle Varianten mit Checkliste, Handlungsprodukt, Abgabeliste, Reflexionsfragen und Punkteverteilung (Text aus dist/mebis/leistungsnachweise). Abgabe: Texteingabe plus bis zu 20 Dateien (je 100 MB), erst als Entwurf, dann „Abgeben“. Bewertet wird mit einer Bewertungsrichtlinie (Kriterien und Höchstpunkte wie auf der Webseite, mit vorbereiteten Kommentaren). Kein Abgabetermin gesetzt – bei Bedarf unter Einstellungen → Verfügbarkeit eintragen. Die Variante lost die Lehrkraft zu (auf der Webseite geschieht das automatisch).")]));
C.push(p([b("Hinweis: "), t("Die Leistungsnachweise wurden direkt im mebis-Kurs angelegt; die Kurssicherung (.mbz) enthält sie nicht. Bei einem Neuimport die drei Aufgaben wie oben beschrieben ergänzen oder den fertigen Kurs über „Kurs wiederverwenden“ kopieren.")]));

C.push(h1("5  Was sich geändert hat"));
["Jede Lektion folgt jetzt dem festen Ablauf: Leseauftrag (Skript-Kapitel mit Seiten, Abschnitten und Lesefokus) → Verständnisprüfung (7 Fragen, die das Skript erfordern, je Lektion mindestens 5 Aufgabenformen: Auswahl, Mehrfachauswahl, Richtig/Falsch, Zuordnung, Reihenfolge, Rechnen, Kurzantwort, Lückentext, Fehlersuche im Python-Code) → Vertiefung → Abschluss mit Wiederholungsempfehlungen.",
 "Die Erklärtexte der alten Seiten stehen im Skript; die Lektionen verweisen genau dorthin (Lektion n = Skript-Kapitel n).",
 "16 neue Simulationen nach „Vermutung → ausprobieren → erklären“: Namensgenerator, NTC-Kennlinie, if/elif-Reihenfolge, Zustandsautomat Schranke, Zeitscheiben/Thread, Dualzahlen, Code-39-Schwelle, Morse-Zeitstrahl, Kalibrierfahrt, Bremsrampe, Ultraschall-Echo, fahre_zu (atan2), Portal mit Sicherheitshöhe, Zweipunkt-/P-Regler, kNN, künstliches Neuron.",
 "Alle 53 Python-Aufgaben bleiben erhalten (Simulator TXT 4.0). Neu: Musterlösung erst nach 3 erfolglosen Prüfungen, Tipps mit Skriptverweis nach Fehlversuchen. Profi-Aufgaben und Beispiele sind freiwillig.",
 "Arbeitsblätter je Lektion (nicht in der Webseite auszufüllen; keine Voraussetzung für den Abschluss) plus Lehrkraftlösungen.",
 "Leistungsnachweise: Voraussetzungen an die neue Lektionsstruktur angepasst; Lehrer-Übersicht (lehrer.html) und Fortschrittscode aktualisiert."].forEach(x => C.push(li(x)));

C.push(h1("6  Durchgeführte Tests"));
["Alle 53 Python-Musterlösungen bestehen ihre Prüfung, alle Startprogramme nicht (tools/test_py.py, gleicher Simulator wie im Browser).",
 "Alle 14 Lektionen automatisiert im Browser durchgespielt (Chromium): Fehlversuch mit Hinweis und Skriptverweis, alle Fragetypen, alle 16 Simulationen bis zum Ziel inkl. Erklärfrage, Python-Aufgaben (Lösung erst nach 3 Fehlversuchen), Abschluss, Neuladen. Keine JavaScript-Fehler. Python lief dabei über einen lokalen Ersatz für Pyodide (die Testumgebung hat keinen Zugriff auf das Pyodide-Netz); echtes Pyodide wurde in Chrome auf der veröffentlichten Seite geprüft.",
 "Fachliche Prüfung aller Fragen gegen das Skript (Zahlen nachgerechnet, Code geprüft); 8 Formulierungen nachgeschärft.",
 "Lokale Moodle-5.1-Installation: Kurs aufgebaut, Schülerdurchlauf Lektion 1 (Leseauftrag → Test 85,7 % → Lernpaket → Unterbrechung → Wiederaufnahme mit Stand → Abschluss „completed“), Interaktionen und Zwischenstand in der Datenbank geprüft; Kurssicherung wiederhergestellt (43 Aktivitäten, 41 Voraussetzungen, 98 Fragen)."].forEach(x => C.push(li(x)));

C.push(h1("7  Einschränkungen"));
["Python braucht Internet (cdn.jsdelivr.net, einmalig ca. 10 MB pro Gerät/Browser). Ist die Adresse im Schulnetz gesperrt, laufen nur Fragen und Simulationen.",
 "Die Webseite speichert den Fortschritt nur im Browser; personenbezogene Fortschrittskontrolle gibt es über mebis.",
 "Ob jemand das Skript gelesen hat, lässt sich nicht nachweisen; die Fragen sind aber ohne Skript kaum sicher zu beantworten.",
 "Reihenfolge-Fragen bewertet mebis nur ganz richtig/falsch; Zuordnungen und Mehrfachauswahl anteilig, die Webseite nur ganz richtig/falsch.",
 "Das Lernpaket speichert den Zwischenstand in max. 4 KB (SCORM 1.2). Reicht der Platz nicht, wird zuerst gespeicherter Python-Code verworfen – gelöste Aufgaben bleiben gelöst.",
 "Der Simulator bildet den TXT 4.0 vereinfacht nach; Befehlsnamen entsprechen ROBO Pro Coding, am echten Gerät mit der Python-Ansicht abgleichen (siehe Skript S. 4)."].forEach(x => C.push(li(x)));

const doc = new Document({ styles: { default: { document: { run: { font: F, size: 21 } } } },
  numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] },
    { reference: "num2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] },
    { reference: "num", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 300 } } } }] }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } }, children: C }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync(out, buf); console.log("geschrieben:", out); });
