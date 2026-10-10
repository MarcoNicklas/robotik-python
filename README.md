# Python & Robotik – Lernplattform

Vertiefungskurs Robotik (Rob10/11), Lernbereich 3: Einen Roboter mit einer Hochsprache programmieren.
Python mit dem fischertechnik TXT 4.0 – Python läuft im Browser (Pyodide), ein Simulator bildet den TXT nach.

Online: https://marconicklas.github.io/robotik-python/

## Aufbau jeder Lektion (Lektion n = Skript-Kapitel n)
1. **Leseauftrag** – genauer Skriptabschnitt mit Seitenangabe und Lesefokus
2. **Verständnisprüfung** – 7 Fragen, die das Skript erfordern; 3 Versuche je Frage, Hinweise mit Skriptverweis, Lösung erst nach dem 3. Versuch; bestanden ab 70 %, sonst neue Runde
3. **Vertiefung** – Simulationen (Vermutung → ausprobieren → erklären) und Python-Aufgaben im TXT-Simulator (Musterlösung erst nach 3 erfolglosen Prüfungen)
4. **Abschluss** – Rückmeldung mit Wiederholungsempfehlungen, Selbsteinschätzung, „Lektion abschließen“

## Gemeinsame Inhaltsgrundlage
Alle Inhalte stehen in `content/` (eine JSON-Datei pro Lektion). Daraus wird alles erzeugt:

```
python3 tools/build.py              # Webseite + mebis-Pakete (dist/mebis: SCORM + Moodle-XML-Fragen + Leistungsnachweise)
node tools/build_worksheets.js      # Arbeitsblätter (material/arbeitsblaetter) + Lösungen (dist/loesungen)
python3 tools/test_py.py            # prüft alle Python-Aufgaben (Musterlösung besteht, Startprogramm nicht)
node tools/build_guide.js           # Anleitung mebis (dist/mebis)
```

`dist/` (mebis-Pakete, Lehrkraftlösungen) wird nicht veröffentlicht.
Die Arbeitsblätter zu den 16 Doppelstunden (`material/Arbeitsblaetter_Python_Robotik.pdf`) und die TXT-Vorlagen (`txt/`) bleiben unverändert.
