/* build_worksheets.js – druckfertige Arbeitsblätter (Word) aus content/lessons/*.json
   Aufruf:  node tools/build_worksheets.js [Zielordner Schüler] [Zielordner Lehrkraft]
   Standard: material/arbeitsblaetter (Schülerfassung) und dist/loesungen (Lehrkraftlösungen – nicht veröffentlichen!)
   PDF:      soffice --headless --convert-to pdf --outdir <ordner> <ordner>/*.docx */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const D = require("docx");
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, AlignmentType, Header, Footer, PageNumber, TabStopType, LevelFormat } = D;

const ROOT = path.join(__dirname, "..");
const OUT_S = process.argv[2] || path.join(ROOT, "material/arbeitsblaetter");
const OUT_L = process.argv[3] || path.join(ROOT, "dist/loesungen");
fs.mkdirSync(OUT_S, { recursive: true }); fs.mkdirSync(OUT_L, { recursive: true });
const COURSE = JSON.parse(fs.readFileSync(path.join(ROOT, "content/course.json"), "utf8"));
const LESSONS = fs.readdirSync(path.join(ROOT, "content/lessons")).filter(f => /^L\d+\.json$/.test(f)).sort().map(f => JSON.parse(fs.readFileSync(path.join(ROOT, "content/lessons", f), "utf8")));

// ---------- Hilfen ----------
const FONT = "Arial", PRI = "1F6F78", RED = "C0392B", GREY = "5B6672";
const W = 9638; // Textbreite A4 bei 2 cm Rand (DXA)
function strip(h) { return String(h || "").replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim(); }
function runs(h, o) { // einfaches HTML → TextRuns (fett erhalten)
  o = o || {}; const out = []; String(h || "").replace(/<br\s*\/?>/gi, " ").split(/(<b>.*?<\/b>)/g).forEach(part => {
    if (!part) return; const bold = /^<b>/.test(part); const t = strip(part); if (!t) return;
    out.push(new TextRun({ text: (out.length && !/^[,.;:!?)]/.test(t) ? " " : "") + t, bold: bold || o.bold, color: o.color, size: o.size, font: FONT, italics: o.italics }));
  }); return out.length ? out : [new TextRun({ text: "", font: FONT })];
}
function P(content, o) { o = o || {}; return new Paragraph({ children: Array.isArray(content) ? content : runs(content, o), spacing: { before: o.before || 0, after: o.after == null ? 80 : o.after }, keepNext: o.keepNext, alignment: o.align, indent: o.indent, border: o.border, shading: o.shading }); }
function CODE(text, color) { return new TextRun({ text, font: "Courier New", size: 18, color }); }
function T(text, o) { o = o || {}; return new TextRun({ text, font: FONT, bold: o.bold, color: o.color, size: o.size, italics: o.italics }); }
function line(n, label) { const a = []; for (let i = 0; i < (n || 1); i++) a.push(new Paragraph({ children: [T(i === 0 && label ? label + " " : "")], spacing: { before: 120, after: 0 }, border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "999999", space: 4 } } })); return a; }
const thin = { style: BorderStyle.SINGLE, size: 4, color: "999999" };
const borders = { top: thin, bottom: thin, left: thin, right: thin };
function cell(content, w, o) { o = o || {}; return new TableCell({ width: { size: w, type: WidthType.DXA }, borders, shading: o.fill ? { fill: o.fill, type: ShadingType.CLEAR, color: "auto" } : undefined, margins: { top: 60, bottom: 60, left: 90, right: 90 },
  children: (Array.isArray(content) ? content : [content]).map(c => c instanceof Paragraph ? c : P(c, { after: 0, bold: o.bold, color: o.color })) }); }
function table(cols, rows, o) { o = o || {}; const sum = cols.reduce((a, b) => a + b, 0);
  return new Table({ width: { size: sum, type: WidthType.DXA }, columnWidths: cols, rows: rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, ci) => cell(c, cols[ci], { fill: o.head && ri === 0 ? "E3F0F1" : (o.fills && o.fills[ri] && o.fills[ri][ci]), bold: o.head && ri === 0 })) })) }); }
function box(children, fill) { return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W], rows: [new TableRow({ children: [new TableCell({ width: { size: W, type: WidthType.DXA }, borders: { top: { style: BorderStyle.SINGLE, size: 6, color: PRI }, bottom: { style: BorderStyle.SINGLE, size: 6, color: PRI }, left: { style: BorderStyle.SINGLE, size: 24, color: PRI }, right: { style: BorderStyle.SINGLE, size: 6, color: PRI } }, shading: { fill: fill || "EEF6F7", type: ShadingType.CLEAR, color: "auto" }, margins: { top: 100, bottom: 100, left: 160, right: 160 }, children })] })] }); }
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function shuffle(n, seed, noId) { let x = seed || 1; const r = () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 100000) / 100000; }; let a;
  for (let t = 0; t < 8; t++) { a = [...Array(n).keys()]; for (let j = n - 1; j > 0; j--) { const k = Math.floor(r() * (j + 1)); [a[j], a[k]] = [a[k], a[j]]; } if (!noId || n < 2 || a.some((v, i) => v !== i)) break; } return a; }
const LETTERS = "ABCDEFGHIJ";
const BOX = "☐", XBOX = "☒";

// ---------- Aufgaben auf Papier ----------
function itemBlocks(L, it, nr, sol) {
  const out = [], seed = hashStr(L.id + it.id);
  const solC = { color: RED, bold: true };
  const qm = String(it.q).match(/^([\s\S]*?)<pre[^>]*>([\s\S]*?)<\/pre>([\s\S]*)$/);
  out.push(P([T(nr + "  ", { bold: true, color: PRI })].concat(runs(qm ? qm[1] : it.q)), { before: 160, keepNext: true }));
  if (qm) { qm[2].replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\s+$/, "").split("\n").forEach(l => out.push(P([CODE(l.replace(/^ +/, m => "\u00a0".repeat(m.length)) || " ")], { indent: { left: 360 }, after: 0, keepNext: true })));
    if (strip(qm[3])) out.push(P(qm[3], { keepNext: true })); }
  const t = it.type;
  if (t === "mc" || t === "multi") {
    out.push(P(t === "mc" ? "Kreuze die richtige Antwort an." : "Kreuze alle passenden Antworten an.", { italics: true, color: GREY, size: 18, keepNext: true }));
    const A = Array.isArray(it.a) ? it.a : [it.a];
    shuffle(it.opts.length, seed, true).forEach(oi => out.push(P([T((sol && A.includes(oi) ? XBOX : BOX) + "  ", { color: sol && A.includes(oi) ? RED : undefined })].concat(runs(it.opts[oi], sol && A.includes(oi) ? solC : {})), { indent: { left: 360 }, after: 40 })));
  } else if (t === "tf") {
    const rows = [["Aussage", "richtig", "falsch"]].concat(it.rows.map(r => [strip(r[0]), sol && r[1] ? "✗" : "", sol && !r[1] ? "✗" : ""]));
    out.push(table([W - 1800, 900, 900], rows, { head: true, fills: rows.map(() => [null, null, null]) }));
    if (sol) out.push(P("Lösung: " + it.rows.map((r, i) => (i + 1) + " " + (r[1] ? "richtig" : "falsch")).join(" · "), { color: RED, size: 18 }));
  } else if (t === "match") {
    const rights = it.rows.map(r => r[1]).concat(it.extra || []).filter((v, i, a) => a.indexOf(v) === i);
    const order = shuffle(rights.length, seed + 7, true).map(i => rights[i]);
    out.push(P("Trage den passenden Buchstaben ein.", { italics: true, color: GREY, size: 18, keepNext: true }));
    const rows = [["", "Buchstabe"]].concat(it.rows.map(r => [strip(r[0]), sol ? LETTERS[order.indexOf(r[1])] : ""]));
    out.push(table([W - 1500, 1500], rows, { head: true }));
    out.push(P(order.map((o, i) => LETTERS[i] + " = " + strip(o)).join("   ·   "), { before: 60, size: 18 }));
  } else if (t === "order") {
    const ord = shuffle(it.items.length, seed + 11, true);
    out.push(P("Nummeriere in der richtigen Reihenfolge (1 = zuerst).", { italics: true, color: GREY, size: 18, keepNext: true }));
    out.push(table([900, W - 900], [["Nr.", "Schritt"]].concat(ord.map(i => [sol ? String(i + 1) : "", strip(it.items[i])])), { head: true }));
  } else if (t === "num") {
    out.push(...line(2, "Rechnung:"));
    out.push(P([T("Ergebnis: ", { bold: true }), T(sol ? String(it.a).replace(".", ",") + " " + (it.unit || "") : "______________ " + (it.unit || ""), sol ? solC : {})], { before: 120 }));
  } else if (t === "text") {
    if (sol) out.push(P([T("Lösung: " + (it.show || it.accept[0].replace(/\*/g, "")), solC)])); else out.push(...line(1));
  } else if (t === "cloze") {
    let k = 0; const txt = it.text.replace(/\[\[(\d+)\]\]/g, (_, g) => { const gg = it.gaps[+g]; k++; return sol ? "[" + gg.opts[gg.a] + "]" : "(" + k + ") ____________"; });
    out.push(P(txt, sol ? {} : {}));
    if (!sol) out.push(P("Wähle aus: " + it.gaps.map((g, i) => "(" + (i + 1) + ") " + shuffle(g.opts.length, seed + i, false).map(j => g.opts[j]).join(" / ")).join("   "), { size: 18, color: GREY }));
    else out.push(P("Lösung: " + it.gaps.map((g, i) => "(" + (i + 1) + ") " + g.opts[g.a]).join(" · "), { color: RED, size: 18 }));
  } else if (t === "bug") {
    out.push(P("Kreuze die fehlerhaften Zeilen an.", { italics: true, color: GREY, size: 18, keepNext: true }));
    out.push(table([700, 900, W - 1600], [["Zeile", "Fehler?", "Programm / Aussage"]].concat(it.lines.map((ln, i) => [String(i + 1), sol && it.a.includes(i) ? XBOX : BOX, ln.replace(/^ +/, m => " ".repeat(m.length))])), { head: true }));
    out.push(P("Begründung / Korrektur:", { before: 80 })); if (!sol) out.push(...line(2));
  } else if (t === "sim") {
    const pp = it.paper || {};
    out.push(P([T("Simulation auf der Lernplattform (Lektion " + L.num + ", Vertiefung, Aufgabe " + nr.replace(/\D/g, "") + ")", { italics: true, color: GREY, size: 18 })], { keepNext: true }));
    out.push(P([T("① Vermutung: ", { bold: true })].concat(runs(it.predict.q)), { keepNext: true }));
    if (it.predict.opts && it.predict.cmp) shuffle(it.predict.opts.length, seed + 1, false).forEach(oi => out.push(P([T((sol && oi === it.predict.a ? XBOX : BOX) + "  ")].concat(runs(it.predict.opts[oi], sol && oi === it.predict.a ? solC : {})), { indent: { left: 360 }, after: 30 })));
    else if (it.predict.opts) out.push(...line(1));
    else out.push(P([T("Meine Vermutung: "), T(sol && it.predict.cmp ? String(it.predict.a).replace(".", ",") + " " + (it.predict.unit || "") : "______________ " + (it.predict.unit || ""), sol ? solC : {})]));
    out.push(P([T("② Ausprobieren: ", { bold: true })].concat(runs(it.goal.text)), { before: 100, keepNext: true }));
    const cols = pp.obs || ["Einstellung", "Beobachtung"];
    let rows = pp.rows || 3; rows = Array.isArray(rows) ? rows.map(r => [r].concat(cols.slice(1).map(() => ""))) : Array.from({ length: rows }, () => cols.map(() => ""));
    out.push(table(cols.map(() => Math.floor(W / cols.length)), [cols].concat(rows), { head: true }));
    if (sol) out.push(P("Erwartung: " + simExpect(it), { color: RED, size: 18 }));
    out.push(P([T("③ Ergebnis erklären: ", { bold: true })], { before: 100, keepNext: true }));
    itemBlocks(L, it.explain, "", sol).slice(0).forEach(x => out.push(x));
  } else if (t === "py") {
    if (!it.ex.check) return [];
    out.push(P([T("Python-Aufgabe auf der Lernplattform (Lektion " + L.num + ")" + (it.opt ? " – freiwillig" : ""), { italics: true, color: GREY, size: 18 })], { keepNext: true }));
    if (sol) { out.push(P("Musterlösung:", { color: RED, bold: true, keepNext: true })); (it.ex.solution || "").replace(/\s+$/, "").split("\n").forEach(l => out.push(P([CODE(l.replace(/^ +/, m => "\u00a0".repeat(m.length)) || " ", RED)], { indent: { left: 360 }, after: 0 }))); }
    else { out.push(P("Plane: Welche Befehle, Bedingungen und Schleifen brauchst du? Notiere die wichtigsten Python-Zeilen.", { size: 18 })); out.push(...line(5)); out.push(P("Ergebnis von ✓ Prüfen / am echten TXT:", { before: 100 })); out.push(...line(1)); }
  } else if (t === "spike") {
    out.push(P([T("Programmieraufgabe auf der Lernplattform (Lektion " + L.num + "): " + (it.title || ""), { italics: true, color: GREY, size: 18 })]));
    if (sol) { out.push(P("Musterlösung (Blöcke):", { color: RED, bold: true })); progLines(it.ex.solution).forEach(l => out.push(P([T(l.replace(/^ +/, m => " ".repeat(m.length)), { color: RED })], { indent: { left: 360 }, after: 20 }))); }
    else { out.push(P("Plane dein Programm: Schreibe die Blöcke der Reihe nach auf (oder zeichne ein Struktogramm).", { size: 18 })); out.push(...line(6)); out.push(P("Ergebnis im Simulator / am Roboter:", { before: 100 })); out.push(...line(1)); }
  }
  if (sol && it.sol && t !== "sim") out.push(P("Erklärung: " + strip(it.sol), { color: RED, size: 18 }));
  if (sol && it.ref) out.push(P("Skript " + it.ref, { color: GREY, size: 16 }));
  return out;
}
function simExpect(it) {
  const E = { naming: "Zähler an C2 → TXT_M_C2_motor_step_counter (Eingabe); LED nur an O-Anschlüssen.",
    ntc: "R = 1500 Ω → 25,0 °C; höhere Temperatur → kleinerer Widerstand (Heißleiter).",
    branch: "Programm B, 10 cm: „langsam“ statt „STOPP“ – A und B unterscheiden sich für alle Abstände unter 15 cm.",
    statemachine: "Nur das passende Ereignis führt weiter; ein voller Zyklus: Endlage → 10 s → 64 Impulse → 5 s → Endlage.",
    timeslice: "sleep: 0 Umschaltungen während der Fahrt; Zeitscheiben/Thread: Fahrzeit ÷ Takt (z. B. 4 s ÷ 0,5 s = 8).",
    binary: "200 = 128 + 64 + 8 = 11001000.", barcode: "Schwelle 15,5 (= (8 + 23) / 2) → 010010100 = „*“; zu kleine/große Schwelle → „Fehler“.",
    morse: "SOS = 30 Einheiten; 4,5 s bei DIT = 0,15 s.", calib: "ca. 6,4 Impulse pro cm; Mittelwert aus mehreren Fahrten.",
    ramp: "z. B. MAX 500, MIN 100, Bremsen ab 70 %: sanft; MIN < 60 → bleibt stehen; keine Rampe → abrupter Stopp.",
    echo: "20 cm → ca. 1,17 ms; Bedingung abstand <= 20 ist wahr → ausweichen.", navi: "Blick 180°, Ziel (20 | −20): Zielrichtung −45°, Drehung 135° nach links, Abstand 28,3 cm.",
    portal: "Hindernis 70 mm: SICHER mindestens 70 mm; jede 10 mm mehr Sicherheitshöhe verlängern den Weg um 20 mm.",
    pline: "Zweipunkt zappelt; P-Regler: kp ≤ 10 zu schwach, ca. 15–60 ruhig, ≥ 80 schwingt.", knn: "Messung (150 | 100): k = 1 grün, k = 3 rot.",
    neuron: "NAND z. B. w₁ = w₂ = −1, b = 1,5; XOR ist mit einem Neuron nicht möglich." };
  return E[it.widget] || "";
}

// ---------- Dokument ----------
function doc(L, sol) {
  const R = L.read, ch = [];
  ch.push(P([T("Lektion " + L.num + " · " + L.lb + " · " + L.ds, { color: PRI, bold: true, size: 18 })], { after: 40 }));
  ch.push(P([T((sol ? "Lösungen: " : "Arbeitsblatt: ") + L.title, { bold: true, size: 34 })], { after: 60 }));
  if (!sol) ch.push(table([3600, 1700, W - 5300], [["Name:", "Klasse:", "Datum:"]], {}));
  else ch.push(P("Nur für die Lehrkraft – nicht an Schülerinnen und Schüler weitergeben.", { color: RED, bold: true }));
  ch.push(P("", { after: 60 }));
  ch.push(box([P([T("📘 Leseauftrag: ", { bold: true }), T("Skript, Kapitel " + R.kap + " – " + R.title + ", Seite" + (String(R.pages).includes("–") ? "n " : " ") + R.pages)], { after: 40 }),
    P("Lies: " + R.sections.map(strip).join(" · "), { after: 40, size: 20 }),
    ...(R.skip ? [P("Hinweis: " + strip(R.skip), { size: 18, color: GREY, after: 40 })] : []),
    P("Achte besonders auf: " + R.focus.map(strip).join(" · "), { size: 20, after: 0 })]));
  ch.push(P([T("A  Verständnis – beantworte die Fragen mithilfe des Skripts", { bold: true, color: PRI, size: 26 })], { before: 240, after: 60, keepNext: true }));
  L.check.forEach((it, i) => ch.push(...itemBlocks(L, it, "A" + (i + 1), sol)));
  ch.push(P([T("B  Vertiefung – Simulationen und Python-Aufgaben", { bold: true, color: PRI, size: 26 })], { before: 280, after: 60, keepNext: true }));
  ch.push(P("Die Simulationen und Python-Aufgaben findest du auf der Lernplattform. Halte deine Vermutungen, Beobachtungen und Ergebnisse hier fest. Das Arbeitsblatt ist keine Voraussetzung für den Abschluss der Lektion.", { size: 18, color: GREY }));
  L.deep.filter(it => !(it.type === "py" && !it.ex.check)).forEach((it, i) => ch.push(...itemBlocks(L, it, "B" + (i + 1), sol)));
  if (L.close && L.close.merke) {
    if (L.close.praxis) { ch.push(P([T("Am echten TXT 4.0", { bold: true, color: PRI, size: 24 })], { before: 240, keepNext: true })); ch.push(P(L.close.praxis)); }
    ch.push(P([T("Das nimmst du mit", { bold: true, color: PRI, size: 24 })], { before: 240, keepNext: true }));
    L.close.merke.forEach(m => ch.push(new Paragraph({ numbering: { reference: "bul", level: 0 }, children: runs(m), spacing: { after: 40 } })));
  }
  return new Document({
    creator: "Vertiefungskurs Robotik", title: (sol ? "Lösungen " : "Arbeitsblatt ") + L.id + " " + L.title,
    styles: { default: { document: { run: { font: FONT, size: 21 } } } },
    numbering: { config: [{ reference: "bul", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 360, hanging: 240 } } } }] }] },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1134, right: 1134 } } },
      headers: { default: new Header({ children: [P([T("Vertiefungskurs Robotik · Python & fischertechnik TXT 4.0", { color: GREY, size: 16 }), new TextRun({ children: ["   ·   " + (sol ? "Lehrkraftlösung " : "Arbeitsblatt ") + L.id], font: FONT, size: 16, color: GREY })], { after: 0 })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ children: ["Seite ", PageNumber.CURRENT, " von ", PageNumber.TOTAL_PAGES], font: FONT, size: 16, color: GREY })] })] }) },
      children: ch }]
  });
}

(async () => {
  for (const L of LESSONS) {
    fs.writeFileSync(path.join(OUT_S, "AB_" + L.id + ".docx"), await Packer.toBuffer(doc(L, false)));
    fs.writeFileSync(path.join(OUT_L, "Loesung_AB_" + L.id + ".docx"), await Packer.toBuffer(doc(L, true)));
  }
  console.log("Arbeitsblätter:", LESSONS.length, "→", OUT_S, "| Lösungen →", OUT_L);
})();
