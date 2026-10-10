#!/usr/bin/env python3
"""build.py – erzeugt aus der gemeinsamen Inhaltsgrundlage (content/) alle Ausgaben.

    content/course.json            Kursdaten, Weiterleitungen, Leistungsnachweis-Zuordnung
    content/lessons/Lxx.json       eine Datei pro Lektion: Leseauftrag, Verständnisprüfung, Vertiefung, Abschluss
    content/ln.json                Leistungsnachweise

Ausgaben:
    Lxx_*.html, index.html          Lernwebseite (GitHub Pages)
    lehrer.html, assets/ln-data.js  Lektionsliste und Leistungsnachweise für Lehrkraft-Übersicht und LN-Seite
    dist/mebis/...                  SCORM-Lernpakete (Vertiefung), Moodle-XML-Fragen (Verständnisprüfung)

Aufruf:  python3 tools/build.py            (alles)
         python3 tools/build.py --web      (nur Webseite)
Arbeitsblätter: node tools/build_worksheets.js · Test der Python-Aufgaben: python3 tools/test_py.py
"""
import glob, html, json, os, re, shutil, sys, zipfile
from xml.sax.saxutils import escape as xesc

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = json.load(open(os.path.join(ROOT, "content/course.json"), encoding="utf8"))
LESSONS = [json.load(open(f, encoding="utf8")) for f in sorted(glob.glob(os.path.join(ROOT, "content/lessons/L*.json")))]
VERSION = "2026-10"


def e(s):
    return html.escape(str(s), quote=True)


def required_ids(L):
    return [it["id"] for it in L["check"]] + [it["id"] for it in L["deep"] if not it.get("opt")] + ["fin"]


def head(title, extra=""):
    return ('<!doctype html>\n<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            f'<title>{e(title)}</title><link rel="stylesheet" href="assets/style.css">{extra}</head>\n')


# ---------------------------------------------------------------------------------------------
# Lektionsseiten
# ---------------------------------------------------------------------------------------------
def lesson_page(L, prev, nxt, mode="web"):
    R = L["read"]
    lesson = dict(L)
    lesson["pass"] = C["pass"]
    lesson["skript"] = C["skript"]
    lesson["prefix"] = C["prefix"]
    lesson["noteTitle"] = "🔧 Hinweis zum echten TXT 4.0"
    if nxt:
        lesson["next"] = {"file": nxt["file"], "title": nxt["title"]}
    data = json.dumps(lesson, ensure_ascii=False).replace("</", "<\\/")
    goals = "".join(f"<li>{g}</li>" for g in L["goals"])
    material = f'<a href="{C["skript"]}#page={R["page"]}" target="_blank" rel="noopener">📘 Skript, Kapitel {e(R["kap"])} (S. {e(R["pages"])})</a>'
    if L.get("fischer"):
        material += f'<br>🔧 {e(L["fischer"])}'
    if mode == "web":
        material += f'<br><a href="material/arbeitsblaetter/AB_{L["id"]}.pdf" target="_blank" rel="noopener">📝 Arbeitsblatt zum Ausdrucken</a><br><a href="txt/index.html">💾 Python-Vorlagen für den TXT</a>'
    nav = '<a href="index.html">Übersicht</a>' if mode == "web" else ""
    homelink = '<a class="home" href="index.html">🤖 Python &amp; Robotik</a>' if mode == "web" else '<span class="home">🤖 Python &amp; Robotik</span>'
    pager = ""
    if mode == "web":
        pager = '<div class="pager">' + (f'<a href="{prev["file"]}">← {e(prev["title"])}</a>' if prev else '<a href="index.html">← Übersicht</a>') + \
                (f'<a href="{nxt["file"]}">{e(nxt["title"])} →</a>' if nxt else '<a href="index.html">Übersicht →</a>') + '</div>'
    scripts = ""
    if mode == "web":
        scripts += f'<script src="assets/progress.js" data-course="{C["course_code"]}" data-prefix="{C["prefix"]}" data-title="{e(C["title"])}"></script>'
        scripts += '<script>window.LESSON_MODE="web";window.LESSON_PART="all";</script>'
    else:
        scripts += '<script>window.LESSON_MODE="scorm";window.LESSON_PART="deep";</script>'
    scripts += f'<script>window.LESSON={data};</script><script src="assets/widgets.js"></script><script src="assets/sim.js"></script><script src="assets/pylab.js"></script><script src="assets/lesson.js"></script>'
    return (head(f'{L["id"]} {L["title"]}') +
            f'<body><header class="top"><div class="in">{homelink}<span id="pystatus"><span class="dot"></span><span class="stxt">Python wird beim Öffnen einer Aufgabe geladen</span></span><nav class="nav">{nav}</nav></div></header>\n<main>'
            f'<section class="hero"><span class="tag">Lektion {L["num"]}</span><span class="tag">{e(L["lb"])}</span><span class="tag">{e(L["ds"])}</span>' + (f'<span class="tag">{e(L["fischer_tag"])}</span>' if L.get("fischer_tag") else "") +
            f'<h1>{e(L["title"])}</h1><p>{e(L["sub"])}</p>'
            f'<div class="goals"><div><b>Du lernst</b><ul>{goals}</ul></div><div><b>Lehrplan</b>{L["lehrplan"]}</div><div><b>Material</b>{material}</div></div></section>\n'
            f'<div id="lesson"><noscript><div class="box warn">Diese Lernseite braucht JavaScript.</div></noscript></div>\n{pager}'
            '<p class="foot">Python läuft direkt im Browser (Pyodide, einmalig ca. 10 MB, Internet nötig). Der Simulator bildet den fischertechnik TXT 4.0 mit den Befehlen aus ROBO Pro Coding vereinfacht nach – am echten TXT können Namen und Werte leicht abweichen.</p>'
            f'</main>\n{scripts}</body></html>\n')


def build_web():
    for i, L in enumerate(LESSONS):
        prev = LESSONS[i - 1] if i else None
        nxt = LESSONS[i + 1] if i + 1 < len(LESSONS) else None
        open(os.path.join(ROOT, L["file"]), "w", encoding="utf8").write(lesson_page(L, prev, nxt, "web"))
    build_index()
    patch_teacher_and_ln()


def build_index():
    idx_path = os.path.join(ROOT, "index.html")
    lnblock = open(os.path.join(ROOT, "content/index_ln.html"), encoding="utf8").read()
    reihe = open(os.path.join(ROOT, "content/index_reihe.html"), encoding="utf8").read()
    ln = json.load(open(os.path.join(ROOT, "content/ln.json"), encoding="utf8"))
    cards = "".join(
        f'<a class="card" href="leistungsnachweis.html#{x["n"]}"><span class="n">Leistungsnachweis {x["n"]} · {e(x["kind"])} · {e(x["window"])}</span>'
        f'<span class="tt">{e(x["title"])}</span><span class="d">{e(x["intro"])}</span><span class="chips"><span class="chip">{e(x["lb"])}</span><span class="chip">{x["minutes"]} min</span></span></a>' for x in ln)
    lnblock = re.sub(r'<div class="cards">.*?</div><!--/LN-->', '<div class="cards">' + cards + '</div><!--/LN-->', lnblock, flags=re.S)
    cards = ""
    for L in LESSONS:
        n = len(required_ids(L))
        cards += (f'<a class="card" href="{L["file"]}" data-lesson="{L["file"]}" data-count="{n}" data-ids="{",".join(required_ids(L))}"><span class="n">Lektion {L["num"]} · {e(L["ds"])}</span>'
                  f'<span class="tt">{e(L["title"])}</span><span class="d">{e(L["sub"])}</span>'
                  f'<span class="chips"><span class="chip">{e(L.get("fischer_tag", L["lb"]))}</span><span class="chip">📘 S. {e(L["read"]["pages"])}</span><span class="chip prog"></span></span></a>')
    rows = "".join(f'<tr><td><b>{L["num"]}</b></td><td><a href="{L["file"]}">{e(L["title"])}</a></td><td>Kap. {e(L["read"]["kap"])}, S. {e(L["read"]["pages"])}</td>'
                   f'<td>{len(L["check"])} Fragen · {len([d for d in L["deep"] if not d.get("opt")])} Aufgaben ({sum(1 for d in L["deep"] if d["type"] == "sim")} Simulationen, {sum(1 for d in L["deep"] if d["type"] == "py" and not d.get("opt"))} Python)</td>'
                   f'<td><a href="material/arbeitsblaetter/AB_{L["id"]}.pdf">AB {L["id"]}</a></td></tr>' for L in LESSONS)
    page = (head("Python & Robotik – Lernplattform") +
            '<body><header class="top"><div class="in"><a class="home" href="index.html">🤖 Python &amp; Robotik</a><span id="pystatus"><span class="dot"></span><span class="stxt">Python wird beim Öffnen einer Lektion geladen</span></span><nav class="nav"></nav></div></header>\n<main>'
            '<section class="hero"><span class="tag">Vertiefungskurs Robotik · Rob10/11</span><span class="tag">Lernbereich 3</span><span class="tag">fischertechnik TXT 4.0</span>'
            '<h1>Einen Roboter mit einer Hochsprache programmieren</h1>'
            f'<p>Python lernen mit dem fischertechnik TXT 4.0: {len(LESSONS)} Lektionen, jede passend zu einem Kapitel im Skript. Die Python-Aufgaben laufen direkt im Browser – ein <b>Simulator</b> zeigt LEDs, Display, Motoren, die Schranke, den Buggy und einen 3D-Portalroboter. Danach überträgst du den Code auf den echten TXT.</p>'
            '<div class="goals"><div><b>So arbeitest du in jeder Lektion</b><ol style="margin:0;padding-left:20px"><li><b>Lesen:</b> den angegebenen Abschnitt im Skript</li><li><b>Verstehen:</b> Fragen mit dem Skript beantworten (mind. 70 %)</li><li><b>Vertiefen:</b> Simulationen (Vermutung → ausprobieren → erklären) und Python-Aufgaben</li><li><b>Abschluss:</b> Rückmeldung lesen und Lektion abschließen</li></ol></div>'
            '<div><b>Kompetenzen LB 3</b><ul><li>aus Schaltungen den Code ableiten</li><li>eine Hochsprache anwenden</li><li>(3D-)Koordinaten implementieren</li><li>KI-Anwendungen integrieren</li></ul></div>'
            f'<div><b>Material</b><a href="{C["skript"]}">📘 Skript (PDF)</a><br><a href="material/Arbeitsblaetter_Python_Robotik.pdf">📝 Arbeitsblätter zu den Doppelstunden (PDF)</a><br><a href="txt/index.html">💾 Python-Vorlagen für den TXT</a><br>'
            '<span style="font-size:13px;color:var(--muted)">Internet nötig: Python lädt beim ersten Öffnen einer Aufgabe ca. 10 MB.</span></div></div></section>'
            f'<h2>Lektionen</h2><div class="cards">{cards}</div>{lnblock}'
            '<h2>Lektionen, Skript und Arbeitsblätter</h2><div class="scroll"><table class="t"><thead><tr><th>Nr.</th><th>Lektion</th><th>Skript</th><th>Inhalt</th><th>Arbeitsblatt zur Lektion</th></tr></thead>'
            f'<tbody>{rows}</tbody></table></div>{reihe}'
            '<p class="foot">Python im Browser: Pyodide (CPython für WebAssembly) wird von cdn.jsdelivr.net geladen. Die Simulation bildet die Befehle nach, die ROBO Pro Coding für den TXT 4.0 erzeugt (vereinfachte Nachbildung). · '
            '<a href="lehrer.html">Für Lehrkräfte: Fortschritts-Übersicht</a></p></main>'
            f'<script src="assets/progress.js" data-course="{C["course_code"]}" data-prefix="{C["prefix"]}" data-title="{e(C["title"])}"></script><script src="assets/pylab.js"></script></body></html>\n')
    open(idx_path, "w", encoding="utf8").write(page)


def patch_teacher_and_ln():
    ln = json.load(open(os.path.join(ROOT, "content/ln.json"), encoding="utf8"))
    byk = {L["id"]: L for L in LESSONS}
    for x in ln:
        x["reqs"] = [{"k": k, "file": byk[k]["file"], "title": byk[k]["title"], "ex": required_ids(byk[k])[:-1]} for k in x["req"]]
    lessons = [{"k": L["id"], "t": L["title"], "ex": required_ids(L)} for L in LESSONS]
    # assets/ln-data.js
    p = os.path.join(ROOT, "assets/ln-data.js")
    s = open(p, encoding="utf8").read()
    d = json.loads(s[s.index("{"):s.rindex("}") + 1])
    d["ln"]["PY"] = ln
    open(p, "w", encoding="utf8").write("window.LN_DATA = " + json.dumps(d, ensure_ascii=False) + ";\n")
    # lehrer.html: Lektionsliste (CAT.PY) und Leistungsnachweise (LND.ln.PY)
    p = os.path.join(ROOT, "lehrer.html")
    s = open(p, encoding="utf8").read()
    m = re.search(r"var CAT = (\{.*?\});\n", s)
    cat = json.loads(m.group(1)); cat["PY"]["lessons"] = lessons
    s = s[:m.start(1)] + json.dumps(cat, ensure_ascii=False) + s[m.end(1):]
    m = re.search(r"var LND = (\{.*?\});\n", s)
    lnd = json.loads(m.group(1)); lnd["ln"]["PY"] = ln
    s = s[:m.start(1)] + json.dumps(lnd, ensure_ascii=False) + s[m.end(1):]
    s = s.replace('function exLabel(l,x){ var same=l.ex.filter(function(y){return y[0]===x[0];}); return (x[0]==="q"?"Quiz-Frage ":"Aufg. ")+(same.indexOf(x)+1); }',
                  'function exLabel(l,x){ if(x==="fin") return "Lektion abgeschlossen"; var same=l.ex.filter(function(y){return y[0]===x[0];}); return (x[0]==="q"?"Quiz-Frage ":x[0]==="c"?"Verständnis-Frage ":x[0]==="v"?"Vertiefung ":"Aufg. ")+(same.indexOf(x)+1); }')
    open(p, "w", encoding="utf8").write(s)


# ---------------------------------------------------------------------------------------------
# mebis: SCORM-Lernpakete (Vertiefung) und Moodle-XML-Fragen (Verständnisprüfung)
# ---------------------------------------------------------------------------------------------
def scorm_manifest(L, files):
    fl = "\n".join(f'      <file href="{xesc(f)}"/>' for f in files)
    title = xesc(f'{L["id"]} Vertiefung – {L["title"]}')
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="robotik-python-{L["id"]}-vertiefung" version="{VERSION}"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.imsglobal.org/xsd/imsmd_rootv1p2p1 imsmd_rootv1p2p1.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="ORG-{L["id"]}">
    <organization identifier="ORG-{L["id"]}">
      <title>{title}</title>
      <item identifier="ITEM-{L["id"]}" identifierref="RES-{L["id"]}" isvisible="true">
        <title>{title}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="RES-{L["id"]}" type="webcontent" adlcp:scormtype="sco" href="index.html">
{fl}
    </resource>
  </resources>
</manifest>
'''


def build_scorm():
    out = os.path.join(ROOT, "dist/mebis/scorm")
    os.makedirs(out, exist_ok=True)
    assets = ["assets/style.css", "assets/widgets.js", "assets/sim.js", "assets/pylab.js", "assets/lesson.js", C["skript"]]
    for L in LESSONS:
        page = lesson_page(L, None, None, "scorm")
        files = ["index.html"] + assets
        zp = os.path.join(out, f'{L["id"]}_Vertiefung_SCORM.zip')
        with zipfile.ZipFile(zp, "w", zipfile.ZIP_DEFLATED) as z:
            z.writestr("imsmanifest.xml", scorm_manifest(L, files))
            z.writestr("index.html", page)
            for a in assets:
                z.write(os.path.join(ROOT, a), a)
    return out


def cdata(s):
    return "<![CDATA[" + str(s).replace("]]>", "]]]]><![CDATA[>") + "]]>"


def mtext(s, fmt="html"):
    return f'<text>{cdata(s)}</text>'


def qhints(it, n=2):
    hs = list(it.get("hint") or [])
    ref = it.get("ref")
    while len(hs) < n:
        hs.append("Lies die Stelle im Skript noch einmal genau." if not hs else hs[-1])
    out = ""
    for h in hs[:n]:
        txt = h + (f'<br>📘 Skript {ref}' if ref else "")
        out += f'<hint format="html">{mtext(txt)}<shownumcorrect/><clearwrong/></hint>\n'
    return out


def gfeedback(it):
    s = it.get("sol") or ""
    if it.get("ref"):
        s += (" " if s else "") + f'<br>📘 Zum Nachlesen: Skript {it["ref"]}'
    return f'<generalfeedback format="html">{mtext(s)}</generalfeedback>'


def qheader(L, it, qtype, i):
    name = f'{L["id"]}-{i:02d} {it.get("tag", it["id"])}'
    return (f'<question type="{qtype}">\n<name><text>{xesc(name)}</text></name>\n<questiontext format="html">{mtext(it["q"] + (it.get("fig") or ""))}</questiontext>\n'
            f'{gfeedback(it)}\n<defaultgrade>1</defaultgrade>\n<penalty>0.5</penalty>\n<hidden>0</hidden>\n<idnumber>{xesc(L["id"] + "_" + it["id"])}</idnumber>\n')


def combined_fb():
    return ('<correctfeedback format="html"><text>Richtig!</text></correctfeedback>\n'
            '<partiallycorrectfeedback format="html"><text>Teilweise richtig.</text></partiallycorrectfeedback>\n'
            '<incorrectfeedback format="html"><text>Noch nicht richtig.</text></incorrectfeedback>\n<shownumcorrect/>\n')


def moodle_question(L, it, i):
    t = it["type"]
    if t in ("mc", "multi", "bug"):
        opts = it["opts"] if t != "bug" else [f'<code>Zeile {k + 1}: ' + re.sub(r"^ +", lambda m: "&nbsp;" * len(m.group(0)), html.unescape(ln).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")) + '</code>' for k, ln in enumerate(it["lines"])]
        a = it["a"] if isinstance(it["a"], list) else [it["a"]]
        single = t == "mc"
        nwrong = max(1, len(opts) - len(a))
        q = qheader(L, it, "multichoice", i)
        if t == "bug":
            q = q.replace(cdata(it["q"] + (it.get("fig") or "")), cdata(it["q"] + "<br><small>Wähle alle fehlerhaften Zeilen.</small>"))
        q += f'<single>{"true" if single else "false"}</single>\n<shuffleanswers>{"false" if t == "bug" else "true"}</shuffleanswers>\n<answernumbering>none</answernumbering>\n<showstandardinstruction>0</showstandardinstruction>\n' + combined_fb()
        for k, o in enumerate(opts):
            if single:
                fr = 100 if k in a else 0
            else:
                fr = round(100 / len(a), 5) if k in a else -round(100 / len(a), 5)
            q += f'<answer fraction="{fr}" format="html">{mtext(o)}<feedback format="html"><text></text></feedback></answer>\n'
        return q + qhints(it) + "</question>\n"
    if t in ("tf", "match"):
        rows = [[r[0], "richtig" if r[1] else "falsch"] for r in it["rows"]] if t == "tf" else it["rows"]
        q = qheader(L, it, "match", i) + "<shuffleanswers>true</shuffleanswers>\n" + combined_fb()
        for r in rows:
            q += f'<subquestion format="html">{mtext(r[0])}<answer><text>{xesc(r[1])}</text></answer></subquestion>\n'
        for x in it.get("extra", []):
            q += f'<subquestion format="html"><text></text><answer><text>{xesc(x)}</text></answer></subquestion>\n'
        if t == "tf" and len({r[1] for r in rows}) < 2:
            q += f'<subquestion format="html"><text></text><answer><text>{"falsch" if rows[0][1] == "richtig" else "richtig"}</text></answer></subquestion>\n'
        return q + qhints(it) + "</question>\n"
    if t == "order":
        q = qheader(L, it, "ordering", i) + ("<layouttype>VERTICAL</layouttype>\n<selecttype>ALL</selecttype>\n<selectcount>0</selectcount>\n"
                                            "<gradingtype>ALL_OR_NOTHING</gradingtype>\n<showgrading>SHOW</showgrading>\n<numberingstyle>123</numberingstyle>\n") + combined_fb()
        for x in it["items"]:
            q += f'<answer fraction="1" format="html">{mtext(x)}</answer>\n'
        return q + qhints(it) + "</question>\n"
    if t == "num":
        tol = it.get("tol")
        if tol is None:
            tol = max(0.01, abs(it["a"]) * 0.01)
        q = qheader(L, it, "numerical", i)
        if it.get("unit"):
            q = q.replace(cdata(it["q"] + (it.get("fig") or "")), cdata(it["q"] + (it.get("fig") or "") + f'<br><small>Gib nur die Zahl ein (Einheit: {html.escape(it["unit"])}).</small>'))
        q += f'<answer fraction="100" format="moodle_auto_format"><text>{it["a"]}</text><tolerance>{tol}</tolerance><feedback format="html"><text></text></feedback></answer>\n'
        q += "<unitgradingtype>0</unitgradingtype>\n<unitpenalty>0</unitpenalty>\n<showunits>3</showunits>\n<unitsleft>0</unitsleft>\n"
        return q + qhints(it) + "</question>\n"
    if t == "text":
        q = qheader(L, it, "shortanswer", i) + "<usecase>0</usecase>\n"
        for p in it["accept"]:
            q += f'<answer fraction="100" format="moodle_auto_format"><text>{xesc(p)}</text><feedback format="html"><text></text></feedback></answer>\n'
        return q + qhints(it) + "</question>\n"
    if t == "cloze":
        k = 0
        txt = re.sub(r"\[\[(\d+)\]\]", lambda m: f"[[{int(m.group(1)) + 1}]]", it["text"])
        q = qheader(L, it, "gapselect", i).replace(cdata(it["q"] + (it.get("fig") or "")), cdata(it["q"] + "<br>" + txt))
        q += "<shuffleanswers>1</shuffleanswers>\n" + combined_fb()
        for gi, g in enumerate(it["gaps"]):
            q += f'<selectoption><text>{xesc(g["opts"][g["a"]])}</text><group>{gi + 1}</group></selectoption>\n'
        for gi, g in enumerate(it["gaps"]):
            for oi, o in enumerate(g["opts"]):
                if oi != g["a"]:
                    q += f'<selectoption><text>{xesc(o)}</text><group>{gi + 1}</group></selectoption>\n'
        return q + qhints(it) + "</question>\n"
    raise ValueError(t)


def build_moodle_xml():
    out = os.path.join(ROOT, "dist/mebis/fragen")
    os.makedirs(out, exist_ok=True)
    allq = ""
    for L in LESSONS:
        cat = f'$course$/top/{L["id"]} Verständnisprüfung'
        body = f'<question type="category"><category><text>{xesc(cat)}</text></category><info format="html"><text>{xesc(L["title"])} – Skript Kap. {xesc(L["read"]["kap"])}, S. {xesc(L["read"]["pages"])}</text></info></question>\n'
        for i, it in enumerate(L["check"], 1):
            body += moodle_question(L, it, i)
        allq += body
        open(os.path.join(out, f'{L["id"]}_Verstaendnispruefung.xml'), "w", encoding="utf8").write('<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n' + body + "</quiz>\n")
    open(os.path.join(out, "Alle_Verstaendnispruefungen.xml"), "w", encoding="utf8").write('<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n' + allq + "</quiz>\n")
    # Kursstruktur als Daten für die Einrichtung (Skript tools/mebis_setup.php)
    plan = {"course": C["title"], "pass": C["pass"], "lessons": [
        {"id": L["id"], "num": L["num"], "title": L["title"], "file": L["file"], "kap": L["read"]["kap"], "pages": L["read"]["pages"], "page": L["read"]["page"],
         "sections": L["read"]["sections"], "focus": L["read"]["focus"], "skip": L["read"].get("skip", ""), "note": L["read"].get("note", ""),
         "goals": L["goals"], "nquestions": len(L["check"]), "ntasks": len([d for d in L["deep"] if not d.get("opt")]),
         "scorm": f'{L["id"]}_Vertiefung_SCORM.zip', "xml": f'{L["id"]}_Verstaendnispruefung.xml'} for L in LESSONS]}
    json.dump(plan, open(os.path.join(ROOT, "dist/mebis/kursplan.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)


def build_ln_mebis():
    """Leistungsnachweise als mebis-Aufgaben: Beschreibung (HTML) + Bewertungsrichtlinie, aus derselben Quelle wie die Webseite."""
    ln = json.load(open(os.path.join(ROOT, "content/ln.json"), encoding="utf8"))
    lnd = open(os.path.join(ROOT, "assets/ln-data.js"), encoding="utf8").read()
    reflect_q = json.loads(lnd[lnd.index("{"):lnd.rindex("}") + 1])["reflect"]
    byk = {L["id"]: L for L in LESSONS}
    out = os.path.join(ROOT, "dist/mebis/leistungsnachweise")
    os.makedirs(out, exist_ok=True)
    plan = []
    for x in ln:
        h = [f'<p><b>{e(x["kind"].capitalize())} · {e(x["lb"])} · {x["minutes"]} Minuten · {x["window"]}</b>'
             + (' · Gruppenarbeit (2–3 Personen), jede Person gibt ab' if x["group"] else ' · Einzelarbeit') + '</p>',
             f'<p>{e(x["intro"])}</p>',
             '<p><b>Voraussetzung:</b> Vertiefung abgeschlossen in ' + ", ".join(f'{k} {e(byk[k]["title"])}' for k in x["req"]) + '. Dann öffnet sich diese Aufgabe.</p>',
             ('<h4>So läuft es ab</h4><ol><li>Eure Lehrkraft lost eurer Gruppe eine Variante zu.</li>'
              '<li>Sammelt Trainingsdaten, trainiert euer Modell und testet es mit neuen Daten.</li>'
              '<li>Präsentiert euer Ergebnis; jede Person beantwortet eine Einzelfrage.</li>'
              '<li>Jede Person gibt die Dokumentation unten ab.</li></ol>' if x["group"] else
              '<h4>So läuft es ab</h4><ol><li>Deine Lehrkraft lost dir eine Variante zu (oder ihr zieht sie im Unterricht).</li>'
              '<li>Baue die Steuerung bzw. den Roboter auf und programmiere sie in Python.</li>'
              + ('<li>Erstelle dein Handlungsprodukt.</li>' if x["product"] else '')
              + ('<li>Schreibe deine Reflexion.</li>' if x["reflect"] else '')
              + '<li>Gib unten ab und führe deiner Lehrkraft den Roboter vor.</li></ol>'),
             '<h4>Varianten</h4>']
        for v in x["variants"]:
            h.append(f'<p><b>Variante {e(v["id"])}: {e(v["title"])}</b><br>{e(v["text"])}</p><ul>' + "".join(f'<li>☐ {e(c)}</li>' for c in v["checks"]) + '</ul>')
        if x["product"]:
            p = dict(x["product"])  # Web-Formulierungen an die mebis-Abgabe anpassen
            p["choices"] = [c.replace(" (wird unten ausgefüllt)", "") for c in p["choices"]]
            p["text"] = p["text"].replace("Dein Protokoll entsteht direkt auf dieser Seite und landet in der Abgabe-PDF.",
                                          "Dein Protokoll schreibst du in das Textfeld der Abgabe. Ergänzend kannst du Fotos hochladen.")
            h.append(f'<h4>{e(p["label"])}</h4><p>Wähle: ' + " oder ".join(e(c) for c in p["choices"]) + f'.</p><p>{e(p["text"])}</p>')
        h.append('<h4>Das gibst du ab</h4><ul><li><b>Variante</b> (Buchstabe/Nummer)</li>')
        for f in x["fields"]:
            h.append(f'<li><b>{e(f["label"])}</b>' + (f' – als Tabelle mit den Spalten {", ".join(e(c) for c in f["cols"])}' if f["type"] == "table" else '') + '</li>')
        if x["product"]:
            h.append('<li><b>Dein Handlungsprodukt</b> als Datei (Video, Bilder, PDF) oder als Link (OneDrive: „Teilen“ → „Link kopieren“)</li>')
        h.append('<li>Optional: Fotos oder Screenshots (Messwerte, Programm)</li>' if x["group"] else '<li>Optional: Datei <code>main.py</code> oder Screenshot deines Programms</li>')
        if x["reflect"]:
            h.append('<li><b>Reflexion:</b><ol>' + "".join(f'<li>{e(q)}</li>' for q in reflect_q) + '</ol></li>')
        h.append('</ul><p>Schreibe die Texte direkt in das Textfeld der Abgabe; Dateien lädst du darunter hoch.</p>')
        h.append(f'<h4>Bewertung ({x["max"]} Punkte)</h4><table border="1" cellpadding="4"><tr><th>Kriterium</th><th>Punkte</th></tr>'
                 + "".join(f'<tr><td>{e(c)}</td><td>{p}</td></tr>' for c, p in x["rubric"]) + '</table>')
        html_desc = "\n".join(h)
        open(os.path.join(out, f'LN{x["n"]}_{x["title"]}.html'), "w", encoding="utf8").write(html_desc)
        plan.append({"n": x["n"], "name": f'Leistungsnachweis {x["n"]}: {x["title"]} ({x["kind"]})', "max": x["max"], "req": x["req"],
                     "rubric": x["rubric"], "group": x["group"], "html": html_desc})
    json.dump(plan, open(os.path.join(out, "ln_plan.json"), "w", encoding="utf8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    build_web()
    if "--web" not in sys.argv:
        build_scorm()
        build_moodle_xml()
        build_ln_mebis()
    print("Fertig:", len(LESSONS), "Lektionen")
