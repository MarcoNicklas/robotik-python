/* widgets.js – interaktive Simulationen für den Vertiefungskurs Robotik (Python & TXT 4.0).
   Aufruf: WIDGETS[name](root, cfg, onState)
   - cfg: Startwerte (optional)
   - onState(state): wird bei jeder Änderung mit dem aktuellen Zustand aufgerufen (für Ziele/Beobachtungen)
   Alle Widgets funktionieren mit Maus, Touch und Tastatur. */
(function () {
"use strict";
function el(t, c, h) { var e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
function fmt(x, d) { return Number(x).toFixed(d == null ? 1 : d).replace(".", ","); }
function noop() {}
function num(v, d) { var x = parseFloat(String(v).replace(",", ".")); return isNaN(x) ? d : x; }
function bind(root, fn) { root.querySelectorAll("input,select").forEach(function (i) { i.addEventListener("input", fn); i.addEventListener("change", fn); }); }
function sel(opts, val) { return opts.map(function (o) { var v = Array.isArray(o) ? o[0] : o, l = Array.isArray(o) ? o[1] : o; return '<option value="' + v + '"' + (String(v) === String(val) ? " selected" : "") + ">" + l + "</option>"; }).join(""); }
function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
function code(lines, hi) { return '<pre class="code wcode">' + lines.map(function (l, i) { return '<span class="' + (hi && hi.indexOf(i) >= 0 ? "hl" : "") + '">' + esc(l) + '</span>'; }).join("\n") + '</pre>'; }
var W = {};

/* ---------- L01 Namensgenerator: Bauteil + Anschluss → Python-Name ---------- */
W.naming = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var P = { mini_switch: ["Mini-Taster", "I", "is_closed()", "E"], ntc_resistor: ["NTC-Widerstand", "I", "get_resistance()", "E"], photo_transistor: ["Fototransistor", "I", "is_dark()", "E"],
            ultrasonic_distance_meter: ["Ultraschallsensor", "I", "get_distance()", "E"], trail_follower: ["IR-Spursensor", "I", "get_state()", "E"],
            led: ["LED", "O", "set_brightness(512)", "A"], encodermotor: ["Encodermotor", "M", "set_speed(300, Motor.CCW)", "A"], motor_step_counter: ["Zähler (Encoder)", "C", "get_count()", "E"], servo: ["Servo", "S", "set_position(256)", "A"] };
  var ports = []; [["I", 8], ["C", 4], ["M", 4], ["O", 8], ["S", 3]].forEach(function (p) { for (var i = 1; i <= p[1]; i++) ports.push(p[0] + i); });
  root.innerHTML = '<h4>🏷️ Konfiguration → Python-Name</h4><div class="row"><label>Bauteil <select class="p">' + sel(Object.keys(P).map(function (k) { return [k, P[k][0]]; }), cfg.p || "mini_switch") + '</select></label>' +
    '<label>Anschluss <select class="o">' + sel(ports, cfg.o || "I1") + '</select></label></div><div class="wbig nm"></div><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); };
  function upd() {
    var p = q(".p").value, o = q(".o").value, d = P[p], valid = o.charAt(0) === d[1];
    var name = "TXT_M_" + o + "_" + p;
    q(".nm").innerHTML = valid ? '<code>' + name + '</code>' : '<span style="color:var(--red)">✗ ' + esc(d[0]) + ' kann nicht an ' + o + ' angeschlossen werden.</span>';
    q(".wout").innerHTML = valid ? 'TXT_M = Haupt-Controller · ' + o + ' = Anschluss · ' + p + ' = Bauteil<br>' + (d[3] === "E" ? "<b>Eingabe</b> (Sensor)" : "<b>Ausgabe</b> (Aktor)") + ' · Beispielbefehl: <code>' + name + '.' + d[2] + '</code>'
      : 'Passende Anschlüsse für ' + esc(d[0]) + ': <b>' + d[1] + '…</b> (I = Eingänge, C = Zähler, M = Motoren, O = Einzelausgänge, S = Servos)';
    on({ p: p, o: o, valid: valid, name: valid ? name : "", eva: d[3] });
  }
  bind(root, upd); upd();
};

/* ---------- L02 Thermometer: Widerstand → Temperatur (Steinhart-Hart) ---------- */
W.ntc = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var a = 0.004164866085, b = -0.0002763825278, c = 0.000003094580198;
  function T(R) { var l = Math.log(R); return 1 / (a + b * l + c * l * l * l) - 273.15; }
  root.innerHTML = '<h4>🌡️ NTC-Thermometer</h4><div class="row"><label>Widerstand R <input type="range" class="r" min="300" max="6000" step="10" value="' + (cfg.R || 3000) + '"> <b class="vr"></b> Ω</label></div>' +
    '<canvas width="640" height="230" aria-label="Kennlinie Widerstand und Temperatur"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  function draw() {
    var R = +q(".r").value, t = T(R), g = cv.getContext("2d"); q(".vr").textContent = R;
    g.clearRect(0, 0, cv.width, cv.height);
    var X = function (r) { return 50 + (r - 300) / 5700 * 560; }, Y = function (tt) { return 200 - (tt + 10) / 90 * 180; };
    g.strokeStyle = "#cfd6db"; g.beginPath(); g.moveTo(50, 20); g.lineTo(50, 200); g.lineTo(615, 200); g.stroke();
    g.fillStyle = "#5b6672"; g.font = "12px system-ui"; g.fillText("T in °C", 6, 16); g.fillText("R in Ω", 580, 220);
    [0, 20, 40, 60].forEach(function (v) { g.fillText(v, 26, Y(v) + 4); });
    [1000, 3000, 5000].forEach(function (v) { g.fillText(v, X(v) - 14, 216); });
    g.strokeStyle = "#1f6f78"; g.lineWidth = 2.5; g.beginPath();
    for (var r = 300; r <= 6000; r += 50) { var y = Y(Math.max(-10, Math.min(80, T(r)))); if (r === 300) g.moveTo(X(r), y); else g.lineTo(X(r), y); }
    g.stroke(); g.fillStyle = "#c0392b"; g.beginPath(); g.arc(X(R), Y(Math.max(-10, Math.min(80, t))), 6, 0, 7); g.fill();
    q(".wout").innerHTML = '<code>R = ' + R + '</code> (int) → <code>T = ' + fmt(t, 3).replace(",", ".") + '</code> (float) → Anzeige <code>f"{T:.1f} °C"</code> = <span class="resl">„' + fmt(t, 1).replace(",", ".") + ' °C“</span> (str)';
    on({ R: R, T: Math.round(t * 100) / 100 });
  }
  bind(root, draw); draw();
};

/* ---------- L03 if/elif/else: Reihenfolge der Bedingungen ---------- */
W.branch = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var V = { A: [["if abstand < 15:", "STOPP"], ["elif abstand < 40:", "langsam"]], B: [["if abstand < 40:", "langsam"], ["elif abstand < 15:", "STOPP"]] };
  root.innerHTML = '<h4>🔀 Welcher Zweig wird ausgeführt?</h4><div class="row"><label>Abstand <input type="range" class="d" min="0" max="100" value="' + (cfg.d != null ? cfg.d : 50) + '"> <b class="vd"></b> cm</label>' +
    '<label>Programm <select class="v">' + sel([["A", "A: zuerst < 15 prüfen"], ["B", "B: zuerst < 40 prüfen"]], cfg.v || "A") + '</select></label></div><div class="cd"></div><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); };
  function run(v, d) { var r = V[v]; if (d < (v === "A" ? 15 : 40)) return [r[0][1], 1]; if (d < (v === "A" ? 40 : 15)) return [r[1][1], 3]; return ["freie Fahrt", 5]; }
  function upd() {
    var d = +q(".d").value, v = q(".v").value, r = V[v]; q(".vd").textContent = d;
    var res = run(v, d), oA = run("A", d)[0], oB = run("B", d)[0];
    var lines = ["abstand = " + d, r[0][0], '    print("' + r[0][1] + '")', r[1][0], '    print("' + r[1][1] + '")', "else:", '    print("freie Fahrt")'];
    q(".cd").innerHTML = code(lines, res[1] === 1 ? [1, 2] : res[1] === 3 ? [1, 3, 4] : [1, 3, 5, 6]);
    q(".wout").innerHTML = 'Ausgabe: <span class="resl">' + res[0] + '</span> · Programm A gäbe „' + oA + '“, Programm B „' + oB + '“' + (oA !== oB ? ' – <b style="color:var(--red)">unterschiedlich!</b>' : '');
    on({ d: d, v: v, out: res[0], outA: oA, outB: oB });
  }
  bind(root, upd); upd();
};

/* ---------- L04 Zustandsautomat der Parkhausschranke ---------- */
W.statemachine = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var Z = ["SCHLIESSEN", "GESCHLOSSEN", "OEFFNEN", "OFFEN"];
  var E = [["end", "Endlagentaster I1 gedrückt", "SCHLIESSEN", "GESCHLOSSEN"], ["t10", "10 s vergangen", "GESCHLOSSEN", "OEFFNEN"], ["imp", "64 Impulse gezählt", "OEFFNEN", "OFFEN"], ["t5", "5 s vergangen", "OFFEN", "SCHLIESSEN"]];
  var z = cfg.start || "SCHLIESSEN", cycles = 0, wrong = 0, log = [], seen = {};
  root.innerHTML = '<h4>🚧 Zustandsautomat: Parkhausschranke</h4><canvas width="640" height="190" aria-label="Zustandsdiagramm"></canvas><div class="row ev"></div><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  E.forEach(function (e) { var b = el("button", "btn", "⚡ " + e[1]); b.type = "button"; b.onclick = function () { fire(e); }; q(".ev").appendChild(b); });
  var rs = el("button", "btn", "↺ Neustart"); rs.type = "button"; rs.onclick = function () { z = "SCHLIESSEN"; log = []; seen = {}; upd(); }; q(".ev").appendChild(rs);
  function fire(e) {
    if (e[2] === z) { log.push(z + " → " + e[3]); seen[z] = 1; z = e[3]; if (z === "GESCHLOSSEN" && seen.OFFEN) { cycles++; seen = {}; } }
    else { wrong++; log.push("„" + e[1] + "“ im Zustand " + z + ": kein Übergang"); }
    upd();
  }
  function draw() {
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var pos = [[110, 50], [530, 50], [530, 150], [110, 150]];
    g.font = "12px system-ui";
    E.forEach(function (e, i) { var a = pos[i], b = pos[(i + 1) % 4]; g.strokeStyle = "#8a96a3"; g.lineWidth = 2; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; g.fillStyle = "#5b6672"; g.textAlign = "center"; g.fillText(e[1], mx, my + (i % 2 ? 0 : -6) + (i === 2 ? 16 : 0)); });
    Z.forEach(function (n, i) { var p = pos[i]; g.fillStyle = n === z ? "#1f6f78" : "#e9eef1"; g.strokeStyle = "#1f6f78"; g.beginPath(); g.rect(p[0] - 78, p[1] - 17, 156, 34); g.fill(); g.stroke();
      g.fillStyle = n === z ? "#fff" : "#1c2430"; g.font = "bold 13px system-ui"; g.textAlign = "center"; g.fillText(n, p[0], p[1] + 5); g.font = "12px system-ui"; });
    g.textAlign = "left";
  }
  function upd() {
    draw();
    q(".wout").innerHTML = 'Aktueller Zustand: <span class="resl">' + z + '</span> · vollständige Zyklen: ' + cycles + ' · Ereignisse ohne Übergang: ' + wrong + (log.length ? '<br><small>' + log.slice(-3).map(esc).join(" · ") + '</small>' : '<br><small>Löse Ereignisse aus. Nur das passende Ereignis führt in den nächsten Zustand.</small>');
    on({ z: z, cycles: cycles, wrong: wrong });
  }
  upd();
};

/* ---------- L05 Blinken während der Motor läuft: sleep vs. Zeitscheiben ---------- */
W.timeslice = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  root.innerHTML = '<h4>⏱️ Zwei Dinge gleichzeitig?</h4><div class="row"><label>Programm <select class="m">' + sel([["sleep", "Erst time.sleep(Fahrzeit), dann blinken"], ["slice", "Zeitscheiben: auf die Uhr schauen"], ["thread", "Thread: Blinklicht läuft nebenher"]], cfg.m || "sleep") + '</select></label></div>' +
    '<div class="row"><label>Fahrzeit der Schranke <input type="range" class="t" min="2" max="6" step="0.5" value="' + (cfg.t || 3) + '"> <b class="vt"></b> s</label>' +
    '<label>Blinktakt <input type="range" class="i" min="0.25" max="1" step="0.25" value="' + (cfg.i || 0.5) + '"> <b class="vi"></b> s</label></div>' +
    '<canvas width="640" height="150" aria-label="Zeitstrahl Motor und LED"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  function upd() {
    var m = q(".m").value, T = +q(".t").value, iv = +q(".i").value; q(".vt").textContent = fmt(T, 1); q(".vi").textContent = fmt(iv, 2);
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var tot = 8, X = function (t) { return 70 + t / tot * 550; };
    g.font = "12px system-ui"; g.fillStyle = "#5b6672"; g.fillText("Motor M1", 6, 44); g.fillText("LED O1", 6, 94);
    g.fillStyle = "#3b7d3a"; g.fillRect(X(0), 30, X(T) - X(0), 22);
    var start = m === "sleep" ? T : 0, end = m === "sleep" ? Math.min(tot, T + 3) : T, on1 = true, toggles = 0, during = 0;
    for (var t = start; t < end - 1e-9; t += iv) { if (on1) { g.fillStyle = "#ffcc00"; g.fillRect(X(t), 80, X(Math.min(end, t + iv)) - X(t), 22); } toggles++; if (t < T) during++; on1 = !on1; }
    g.strokeStyle = "#cfd6db"; g.beginPath(); g.moveTo(X(0), 120); g.lineTo(X(tot), 120); g.stroke();
    for (var s = 0; s <= tot; s++) { g.fillStyle = "#5b6672"; g.fillText(s + " s", X(s) - 8, 138); }
    q(".wout").innerHTML = 'Umschaltungen der LED, während der Motor läuft: <span class="resl">' + during + '</span> · ' +
      (m === "sleep" ? 'Während <code>time.sleep(' + fmt(T, 1).replace(",", ".") + ')</code> tut das Programm nichts anderes – das Warnlicht bleibt dunkel.' : m === "slice" ? 'Die Schleife wartet nur 0,01 s und schaut auf <code>time.time()</code> – alle ' + fmt(iv, 2) + ' s wird umgeschaltet.' : 'Der Thread blinkt unabhängig vom Hauptprogramm, das die Schranke fährt.');
    on({ m: m, T: T, iv: iv, during: during });
  }
  bind(root, upd); upd();
};

/* ---------- L06 Dualzahlen ---------- */
W.binary = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var bits = (cfg.bits || "00000000").split("").map(Number);
  root.innerHTML = '<h4>💡 8 Bit = 1 Byte</h4><div class="row bits"></div><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); };
  function upd() {
    var box = q(".bits"); box.innerHTML = "";
    var v = 0, parts = [];
    bits.forEach(function (b, i) {
      var w = Math.pow(2, 7 - i); if (b) { v += w; parts.push(w); }
      var bt = el("button", "btn bit" + (b ? " on" : ""), '<small>' + w + '</small><br><b>' + b + '</b>'); bt.type = "button"; bt.setAttribute("aria-label", "Bit mit Wert " + w + ": " + b);
      bt.onclick = function () { bits[i] = 1 - bits[i]; upd(); }; box.appendChild(bt);
    });
    var s = bits.join("");
    q(".wout").innerHTML = '<code>int("' + s + '", 2)</code> = ' + (parts.length ? parts.join(" + ") + " = " : "") + '<span class="resl">' + v + '</span> · <code>bin(' + v + ')</code> = <code>\'0b' + v.toString(2) + '\'</code>';
    on({ v: v, bits: s, ones: parts.length });
  }
  upd();
};

/* ---------- L06 Code 39: Balkenbreiten → Bits ---------- */
W.barcode = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var w = cfg.w || [9, 22, 8, 10, 21, 9, 23, 11, 8];
  var codes = { "100001001": "A", "001001001": "B", "101001000": "C", "000011001": "D", "100011000": "E", "001011000": "F", "000001101": "G", "100001100": "H", "001001100": "I", "000011100": "J", "010010100": "*" };
  root.innerHTML = '<h4>▮▯ Code-39-Leser: Schwelle einstellen</h4><div class="row"><label>Schwelle <input type="range" class="s" min="5" max="25" step="0.5" value="' + (cfg.s || 6) + '"> <b class="vs"></b> Pixel</label></div>' +
    '<canvas width="640" height="150" aria-label="Balken und Lücken"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  function upd() {
    var s = +q(".s").value; q(".vs").textContent = fmt(s, 1);
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var x = 40, bits = "";
    w.forEach(function (b, i) { var wide = b > s; bits += wide ? "1" : "0"; if (i % 2 === 0) { g.fillStyle = "#1c2430"; g.fillRect(x, 20, b * 2.5, 80); } else { g.strokeStyle = "#cfd6db"; g.strokeRect(x, 20, b * 2.5, 80); }
      g.fillStyle = wide ? "#c0392b" : "#5b6672"; g.font = "13px system-ui"; g.fillText(b, x + b * 1.25 - 6, 118); g.font = "bold 14px system-ui"; g.fillText(wide ? "1" : "0", x + b * 1.25 - 4, 140); x += b * 2.5 + 2; });
    var ones = bits.split("1").length - 1, ch = codes[bits], valid = ones === 3 && !!ch;
    var mid = (Math.min.apply(null, w) + Math.max.apply(null, w)) / 2;
    q(".wout").innerHTML = 'Bits: <code>' + bits + '</code> · breite Elemente: ' + ones + ' → ' + (valid ? '<b style="color:var(--green)">gültig: Zeichen „' + ch + '“</b>' : '<b style="color:var(--red)">„Fehler“</b> (gültig sind nur Muster mit genau 3 breiten Elementen aus der Tabelle)') +
      '<br><small>Das Programm im Skript nimmt als Schwelle (min + max) / 2 = ' + fmt(mid, 1) + '.</small>';
    on({ s: s, bits: bits, ones: ones, valid: valid, ch: ch || "", mid: mid });
  }
  bind(root, upd); upd();
};

/* ---------- L07 Morse-Sender: Zeitstrahl ---------- */
W.morse = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var M = { A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.", H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.", O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-", V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--.." };
  root.innerHTML = '<h4>📡 Morse-Sender mit LED</h4><div class="row"><label>Text <input type="text" class="t" maxlength="8" value="' + (cfg.t || "E") + '" style="width:120px;text-transform:uppercase"></label>' +
    '<label>DIT <input type="range" class="d" min="0.05" max="0.3" step="0.05" value="' + (cfg.d || 0.1) + '"> <b class="vd"></b> s</label></div>' +
    '<canvas width="640" height="120" aria-label="Zeitstrahl der LED"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  function upd() {
    var txt = q(".t").value.toUpperCase().replace(/[^A-Z]/g, ""), D = +q(".d").value; q(".vd").textContent = fmt(D, 2);
    var seg = [], t = 0, code = [];
    txt.split("").forEach(function (b) { var m = M[b]; code.push(m); m.split("").forEach(function (z) { var len = z === "." ? D : 3 * D; seg.push([t, len]); t += len + D; }); t += 2 * D; });
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var tot = Math.max(t, 0.5), X = function (x) { return 20 + x / tot * 600; };
    g.fillStyle = "#e9eef1"; g.fillRect(20, 30, 600, 34); g.fillStyle = "#ffcc00"; seg.forEach(function (s) { g.fillRect(X(s[0]), 30, X(s[0] + s[1]) - X(s[0]), 34); });
    g.fillStyle = "#5b6672"; g.font = "12px system-ui"; g.fillText("0 s", 16, 84); g.fillText(fmt(t, 2) + " s", 580, 84);
    q(".wout").innerHTML = (txt ? '<code>' + code.join(" ") + '</code> · Gesamtdauer von <code>sende("' + txt + '")</code>: <span class="resl">' + fmt(t, 2) + ' s</span> (' + Math.round(t / D) + ' Einheiten)' : 'Gib Buchstaben A–Z ein.') +
      '<br><small>signal(): LED an für dit (1 Einheit) oder dah (3 Einheiten), danach 1 Einheit aus · nach jedem Buchstaben 2 weitere Einheiten.</small>';
    on({ text: txt, dit: D, dur: Math.round(t * 1000) / 1000, units: Math.round(t / D) });
  }
  bind(root, upd); upd();
};

/* ---------- L08 Kalibrierfahrt ---------- */
W.calib = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var TRUE = cfg.ipc || 6.44, runs = [], seed = 3;
  function rnd() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
  root.innerHTML = '<h4>📏 Kalibrierfahrt: Impulse pro cm</h4><div class="row"><label>Impulse <select class="n">' + sel([300, 500, 800, 1000], cfg.n || 500) + '</select></label>' +
    '<button type="button" class="btn run go">▶ Fahren und messen</button><button type="button" class="btn rs">↺ Messungen löschen</button></div>' +
    '<canvas width="640" height="90" aria-label="Gefahrene Strecke"></canvas><div class="row tab"></div><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  function upd() {
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    g.strokeStyle = "#5b6672"; g.beginPath(); g.moveTo(20, 60); g.lineTo(620, 60); g.stroke();
    for (var c = 0; c <= 160; c += 20) { g.beginPath(); g.moveTo(20 + c * 3.6, 55); g.lineTo(20 + c * 3.6, 65); g.stroke(); g.fillStyle = "#5b6672"; g.font = "11px system-ui"; g.fillText(c + " cm", 12 + c * 3.6, 80); }
    if (runs.length) { var r = runs[runs.length - 1]; g.fillStyle = "#f5c518"; g.fillRect(20 + r[1] * 3.6 - 14, 30, 28, 20); }
    q(".tab").innerHTML = runs.length ? '<table class="t"><tr><th>Fahrt</th><th>Impulse</th><th>gemessen</th><th>Impulse ÷ cm</th></tr>' + runs.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td><td>' + r[0] + '</td><td>' + fmt(r[1], 1) + ' cm</td><td>' + fmt(r[0] / r[1], 2) + '</td></tr>'; }).join("") + '</table>' : "";
    var mean = runs.length ? runs.reduce(function (s, r) { return s + r[0] / r[1]; }, 0) / runs.length : null;
    q(".wout").innerHTML = runs.length ? 'Mittelwert aus ' + runs.length + ' Fahrten: <span class="resl">' + fmt(mean, 2) + ' Impulse pro cm</span>' : 'Fahre eine feste Impulszahl und miss die Strecke. Mehrere Fahrten → Mittelwert.';
    on({ runs: runs.length, mean: mean != null ? Math.round(mean * 100) / 100 : null, diff: runs.length > 1 ? new Set(runs.map(function (r) { return r[0]; })).size : runs.length });
  }
  q(".go").onclick = function () { var n = +q(".n").value; var d = n / TRUE * (1 + (rnd() - 0.5) * 0.04); runs.push([n, Math.round(d * 10) / 10]); upd(); };
  q(".rs").onclick = function () { runs = []; upd(); };
  upd();
};

/* ---------- L08 Bremsrampe ---------- */
W.ramp = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  root.innerHTML = '<h4>📉 Bremsrampe</h4><div class="row"><label>MAX <input type="range" class="mx" min="200" max="512" step="10" value="' + (cfg.max || 400) + '"> <b class="vmx"></b></label>' +
    '<label>MIN <input type="range" class="mn" min="0" max="200" step="10" value="' + (cfg.min != null ? cfg.min : 0) + '"> <b class="vmn"></b></label>' +
    '<label>Bremsen ab <input type="range" class="bs" min="50" max="100" step="5" value="' + (cfg.bs || 100) + '"> <b class="vbs"></b> % der Strecke</label></div>' +
    '<canvas width="640" height="210" aria-label="Geschwindigkeit über der Strecke"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas"), ZIEL = 1000;
  function v(t, MX, MN, B) { if (t < B) return MX; var f = (t - B) / (ZIEL - B); return MX - f * (MX - MN); }
  function upd() {
    var MX = +q(".mx").value, MN = +q(".mn").value, bs = +q(".bs").value, B = ZIEL * bs / 100;
    q(".vmx").textContent = MX; q(".vmn").textContent = MN; q(".vbs").textContent = bs;
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var X = function (t) { return 50 + t / ZIEL * 560; }, Y = function (s) { return 180 - s / 512 * 160; };
    g.strokeStyle = "#cfd6db"; g.beginPath(); g.moveTo(50, 15); g.lineTo(50, 180); g.lineTo(615, 180); g.stroke();
    g.fillStyle = "#5b6672"; g.font = "12px system-ui"; g.fillText("Geschwindigkeit", 54, 14); g.fillText("Ticks", 580, 198); g.fillText("Ziel " + ZIEL, X(ZIEL) - 40, 198);
    g.fillStyle = "rgba(192,57,43,.25)"; g.fillRect(50, Y(60), 560, Y(0) - Y(60)); g.fillStyle = "#c0392b"; g.fillText("Haftreibung: Motor dreht nicht", 56, Y(30));
    g.strokeStyle = "#1f6f78"; g.lineWidth = 3; g.beginPath(); for (var t = 0; t <= ZIEL; t += 5) { var y = Y(v(t, MX, MN, B)); if (!t) g.moveTo(X(t), y); else g.lineTo(X(t), y); } g.lineTo(X(ZIEL), Y(0)); g.stroke();
    var stall = MN < 60 && bs < 100, jerk = bs >= 100 || (MX - MN) / Math.max(1, ZIEL - B) > 1.5, ok = !stall && !jerk;
    var half = MX - 0.5 * (MX - MN);
    q(".wout").innerHTML = 'Bei Fortschritt 0,5 in der Bremszone: Geschwindigkeit = <span class="resl">' + Math.round(half) + '</span> · ' +
      (bs >= 100 ? '<b style="color:var(--amber)">keine Rampe: abrupter Stopp, der Buggy rutscht nach</b>' : stall ? '<b style="color:var(--red)">MIN zu klein: der Motor bleibt vor dem Ziel stehen (Haftreibung)</b>' : jerk ? '<b style="color:var(--amber)">Rampe sehr kurz – fast ein abrupter Stopp</b>' : '<b style="color:var(--green)">sanftes, sicheres Abbremsen bis ins Ziel</b>');
    on({ max: MX, min: MN, bs: bs, half: Math.round(half), stall: stall, jerk: jerk, ok: ok });
  }
  bind(root, upd); upd();
};

/* ---------- L09 Ultraschall: Echo und Abstand ---------- */
W.echo = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  root.innerHTML = '<h4>🔊 Ultraschall: Echo und Abstand</h4><div class="row"><label>Abstand zum Hindernis <input type="range" class="d" min="4" max="200" value="' + (cfg.d || 60) + '"> <b class="vd"></b> cm</label>' +
    '<label>Ausweichen ab <input type="range" class="g" min="5" max="60" step="5" value="' + (cfg.g || 20) + '"> <b class="vg"></b> cm</label>' +
    '<button type="button" class="btn run go">📡 Impuls senden</button></div><canvas width="640" height="170" aria-label="Schallimpuls zwischen Sensor und Wand"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas"), raf = null, pulse = null, measured = null;
  function geo() { var d = +q(".d").value; return { d: d, x: 70 + d * 2.6 }; }
  function draw() {
    var g = cv.getContext("2d"), G = geo(); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = "rgba(192,57,43,.12)"; g.fillRect(70, 20, +q(".g").value * 2.6, 130);
    g.fillStyle = "#cfd6db"; g.fillRect(20, 60, 50, 50); g.fillStyle = "#333"; g.beginPath(); g.arc(70, 75, 7, 0, 7); g.arc(70, 97, 7, 0, 7); g.fill();
    g.fillStyle = "#8d6e4a"; g.fillRect(Math.min(G.x, 620), 20, 14, 130);
    if (pulse) { g.strokeStyle = pulse.back ? "#1f6fd1" : "#d98e04"; g.lineWidth = 3; g.beginPath(); g.arc(pulse.x, 86, 16, -0.8, 0.8); g.stroke(); }
    g.fillStyle = "#5b6672"; g.font = "12px system-ui"; g.fillText("Sensor", 22, 128);
  }
  function fire() {
    if (raf) cancelAnimationFrame(raf); var G = geo(), t0 = performance.now(), dur = 300 + G.d * 8;
    (function st(now) {
      var f = (now - t0) / dur; if (f >= 1) { pulse = null; measured = G.d; draw(); res(); return; }
      pulse = f < 0.5 ? { x: 76 + (G.x - 76) * f * 2, back: false } : { x: G.x - (G.x - 76) * (f - 0.5) * 2, back: true };
      draw(); raf = requestAnimationFrame(st);
    })(t0);
  }
  function res() {
    var d = measured, gr = +q(".g").value, t = d != null ? 2 * d / 100 / 343 * 1000 : null;
    q(".wout").innerHTML = d == null ? "Sende einen Impuls und miss die Zeit bis zum Echo." : 'Echo nach <span class="resl">' + fmt(t, 2) + ' ms</span> → Abstand = t · 343 m/s ÷ 2 = <span class="resl">' + fmt(d, 0) + ' cm</span> → <code>if abstand &lt;= ' + gr + '</code> ist <b>' + (d <= gr ? "True: ausweichen!" : "False: weiterfahren") + '</b>';
    on({ d: +q(".d").value, g: gr, t: t != null ? Math.round(t * 100) / 100 : null, measured: d, ausweichen: d != null && d <= gr });
  }
  q(".go").addEventListener("click", fire);
  bind(root, function () { q(".vd").textContent = q(".d").value; q(".vg").textContent = q(".g").value; measured = null; draw(); res(); });
  q(".vd").textContent = q(".d").value; q(".vg").textContent = q(".g").value; draw(); res();
};

/* ---------- L10 Abstand und Richtung im Koordinatensystem ---------- */
W.navi = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var tx = cfg.zx != null ? cfg.zx : 30, ty = cfg.zy != null ? cfg.zy : 40;
  root.innerHTML = '<h4>🧭 fahre_zu(): Abstand und Drehung</h4><div class="row"><label>Blickrichtung des Roboters <select class="b">' + sel([[0, "0° (→ x)"], [90, "90° (↑ y)"], [180, "180° (←)"], [-90, "−90° (↓)"]], cfg.blick != null ? cfg.blick : 0) + '</select></label>' +
    '<label>Ziel x <input type="number" class="x" value="' + tx + '" step="5" style="width:70px"></label><label>Ziel y <input type="number" class="y" value="' + ty + '" step="5" style="width:70px"></label></div>' +
    '<canvas width="640" height="300" aria-label="Koordinatensystem, Klick setzt das Ziel"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas"), S = 2.5, OX = 320, OY = 150;
  cv.addEventListener("click", function (e) { var r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
    q(".x").value = Math.round((x - OX) / S / 5) * 5; q(".y").value = Math.round((OY - y) / S / 5) * 5; upd(); });
  function upd() {
    var b = +q(".b").value, zx = num(q(".x").value, 0), zy = num(q(".y").value, 0);
    var d = Math.hypot(zx, zy), ziel = Math.atan2(zy, zx) * 180 / Math.PI, dreh = ((ziel - b + 180) % 360 + 360) % 360 - 180;
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    g.strokeStyle = "#e3e8ec"; for (var gx = -60; gx <= 60; gx += 10) { g.beginPath(); g.moveTo(OX + gx * S, 0); g.lineTo(OX + gx * S, 300); g.stroke(); } for (var gy = -60; gy <= 60; gy += 10) { g.beginPath(); g.moveTo(0, OY - gy * S); g.lineTo(640, OY - gy * S); g.stroke(); }
    g.strokeStyle = "#8a96a3"; g.beginPath(); g.moveTo(0, OY); g.lineTo(640, OY); g.moveTo(OX, 0); g.lineTo(OX, 300); g.stroke();
    g.fillStyle = "#5b6672"; g.font = "11px system-ui"; g.fillText("x", 628, OY - 4); g.fillText("y", OX + 4, 10);
    g.strokeStyle = "#1f6f78"; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); g.moveTo(OX, OY); g.lineTo(OX + zx * S, OY - zy * S); g.stroke(); g.setLineDash([]);
    g.fillStyle = "#c0392b"; g.beginPath(); g.arc(OX + zx * S, OY - zy * S, 6, 0, 7); g.fill();
    g.save(); g.translate(OX, OY); g.rotate(-b * Math.PI / 180); g.fillStyle = "#f5c518"; g.fillRect(-10, -8, 20, 16); g.fillStyle = "#d98e04"; g.beginPath(); g.moveTo(16, 0); g.lineTo(8, -6); g.lineTo(8, 6); g.fill(); g.restore();
    q(".wout").innerHTML = 'Δx = ' + zx + ', Δy = ' + zy + ' · Abstand <code>math.hypot</code> = <span class="resl">' + fmt(d, 1) + ' cm</span> · Zielrichtung <code>atan2</code> = <span class="resl">' + fmt(ziel, 1) + '°</span><br>Drehung = (' + fmt(ziel, 1) + ' − ' + b + ' + 180) % 360 − 180 = <span class="resl">' + fmt(dreh, 1) + '°</span> → ' +
      (Math.abs(dreh) < 0.05 ? "keine Drehung" : dreh > 0 ? "<b>links(" + fmt(dreh, 1) + ")</b>" : "<b>rechts(" + fmt(-dreh, 1) + ")</b>");
    on({ blick: b, zx: zx, zy: zy, d: Math.round(d * 10) / 10, ziel: Math.round(ziel * 10) / 10, dreh: Math.round(dreh * 10) / 10 });
  }
  bind(root, upd); upd();
};

/* ---------- L11 Portalroboter: Sicherheitshöhe ---------- */
W.portal = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  root.innerHTML = '<h4>🏗️ Portalroboter: von A nach B</h4><div class="row"><label>Sicherheitshöhe SICHER <input type="range" class="s" min="0" max="120" step="5" value="' + (cfg.s != null ? cfg.s : 20) + '"> <b class="vs"></b> mm</label>' +
    '<label>Höhe des Hindernisses <input type="range" class="h" min="10" max="80" step="5" value="' + (cfg.h || 45) + '"> <b class="vh"></b> mm</label></div>' +
    '<canvas width="640" height="230" aria-label="Seitenansicht des Greiferwegs"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  var A = [20, 0, 10], B = [160, 120, 10];
  function upd() {
    var s = +q(".s").value, h = +q(".h").value; q(".vs").textContent = s; q(".vh").textContent = h;
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var hor = Math.hypot(B[0] - A[0], B[1] - A[1]), X = function (u) { return 60 + u / hor * 500; }, Y = function (z) { return 200 - z * 1.4; };
    g.strokeStyle = "#8a96a3"; g.beginPath(); g.moveTo(40, 200); g.lineTo(600, 200); g.stroke();
    g.fillStyle = "#8d6e4a"; g.fillRect(X(hor * 0.45), Y(h), X(hor * 0.6) - X(hor * 0.45), Y(0) - Y(h));
    g.fillStyle = "#1f6f78"; g.fillRect(X(0) - 10, Y(A[2]) - 4, 20, 14); g.fillStyle = "#3b7d3a"; g.fillRect(X(hor) - 12, 196, 24, 4);
    var top = Math.max(s, A[2]), coll = top < h;
    g.strokeStyle = coll ? "#c0392b" : "#1f6f78"; g.lineWidth = 3; g.setLineDash([]); g.beginPath(); g.moveTo(X(0), Y(A[2])); g.lineTo(X(0), Y(top)); g.lineTo(X(hor), Y(top)); g.lineTo(X(hor), Y(B[2])); g.stroke();
    if (coll) { g.fillStyle = "#c0392b"; g.font = "bold 14px system-ui"; g.fillText("💥 Kollision", X(hor * 0.45), Y(h) - 8); }
    g.fillStyle = "#5b6672"; g.font = "12px system-ui"; g.fillText("A(20 | 0 | 10)", X(0) - 30, 218); g.fillText("B(160 | 120 | 10)", X(hor) - 50, 218); g.fillText("z = " + top + " mm", X(hor / 2) - 20, Y(top) - 6);
    var weg = (top - A[2]) + hor + (top - B[2]), dir = Math.hypot(B[0] - A[0], B[1] - A[1], B[2] - A[2]);
    q(".wout").innerHTML = 'Weg des Greifers: hoch ' + (top - A[2]) + ' mm, waagerecht ' + fmt(hor, 1) + ' mm, runter ' + (top - B[2]) + ' mm = <span class="resl">' + fmt(weg, 1) + ' mm</span> (direkter Abstand √(Δx² + Δy² + Δz²) = ' + fmt(dir, 1) + ' mm) · ' +
      (coll ? '<b style="color:var(--red)">Der Greifer stößt das Hindernis um.</b>' : '<b style="color:var(--green)">kollisionsfrei</b>');
    on({ s: s, h: h, coll: coll, weg: Math.round(weg), luft: top - h });
  }
  bind(root, upd); upd();
};

/* ---------- L12 Spurfolger: Zweipunkt- und P-Regler ---------- */
W.pline = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  root.innerHTML = '<h4>🛣️ Spurfolger auf einer Kurvenstrecke</h4><div class="row"><label>Regler <select class="m">' + sel([["two", "Zweipunktregler (IR-Sensoren)"], ["p", "P-Regler (Kamera)"]], cfg.m || "two") + '</select></label>' +
    '<label>kp <input type="range" class="k" min="0" max="120" step="5" value="' + (cfg.k != null ? cfg.k : 20) + '"> <b class="vk"></b></label></div>' +
    '<canvas width="640" height="240" aria-label="Spur und gefahrene Bahn"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  function lineY(x) { return x < 80 ? 0 : x < 200 ? (x - 80) * 0.25 : x < 300 ? 30 - (x - 200) * 0.45 : -15 + (x - 300) * 0.1; }
  function sim(m, kp) {   // Kamera misst die Abweichung 10 cm vor dem Buggy, 0,2 s Verzögerung
    var x = 0, y = 0, h = 0, B = 300, pts = [[0, 0]], maxe = 0, sw = 0, last = 0, lost = false, buf = [], sumE = 0, n = 0, dt = 0.02, LA = 10;
    for (var t = 0; t < 45 && x < 380; t += dt) {
      var e = lineY(x + LA * Math.cos(h)) - (y + LA * Math.sin(h)), et = y - lineY(x); buf.push(e); var meas = buf.length > 10 ? buf[buf.length - 11] : 0;
      var vl, vr;
      if (m === "two") { if (meas < -0.5) { vl = B; vr = 60; } else if (meas > 0.5) { vl = 60; vr = B; } else { vl = B; vr = B; } }
      else { vl = B - kp * meas; vr = B + kp * meas; }   // wie im Skript: e > 0 → Linie liegt links → rechts schneller
      vl = Math.max(0, Math.min(512, vl)); vr = Math.max(0, Math.min(512, vr));
      var v = (vl + vr) / 2 / 20, w = (vr - vl) / 20 / 12; h += w * dt; x += v * Math.cos(h) * dt; y += v * Math.sin(h) * dt;
      if (Math.round(t / dt) % 3 === 0) pts.push([x, y]);
      var ae = Math.abs(et); maxe = Math.max(maxe, ae); sumE += ae; n++; if (ae > 12 || Math.abs(h) > 2) lost = true;
      var sg = et > 0.3 ? 1 : et < -0.3 ? -1 : 0; if (sg && last && sg !== last) sw++; if (sg) last = sg;
    }
    return { pts: pts, maxe: maxe, mean: sumE / Math.max(1, n), sw: sw, lost: lost, x: x };
  }
  function upd() {
    var m = q(".m").value, k = +q(".k").value; q(".vk").textContent = k; q(".k").disabled = m === "two";
    var r = sim(m, k), g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    var X = function (x) { return 20 + x * 1.55; }, Y = function (y) { return 120 - y * 2.6; };
    g.strokeStyle = "#1c2430"; g.lineWidth = 9; g.beginPath(); for (var x = 0; x <= 380; x += 4) { if (!x) g.moveTo(X(x), Y(lineY(x))); else g.lineTo(X(x), Y(lineY(x))); } g.stroke();
    g.strokeStyle = "#f5a623"; g.lineWidth = 2.5; g.beginPath(); r.pts.forEach(function (p, i) { if (i) g.lineTo(X(p[0]), Y(p[1])); else g.moveTo(X(p[0]), Y(p[1])); }); g.stroke();
    var ok = m === "p" && !r.lost && r.x >= 370 && r.sw <= 6 && r.maxe < 4;
    q(".wout").innerHTML = (m === "p" ? 'links = BASIS − kp·e, rechts = BASIS + kp·e · ' : 'nur „zu weit links/rechts“ · ') + 'größte Abweichung <span class="resl">' + fmt(r.maxe, 1) + ' cm</span> · mittlere ' + fmt(r.mean, 1) + ' cm · Richtungswechsel ' + r.sw + ' · ' +
      (r.lost || r.x < 370 ? '<b style="color:var(--red)">Spur verloren</b>' : m === "two" ? (r.sw > 6 ? '<b style="color:var(--amber)">der Buggy zappelt hin und her</b>' : 'folgt der Spur') : ok ? '<b style="color:var(--green)">ruhig auf der Spur</b>' : r.sw > 6 ? '<b style="color:var(--amber)">kp zu groß: der Buggy schwingt</b>' : '<b style="color:var(--amber)">kp zu klein: in Kurven zu weit neben der Spur</b>');
    on({ m: m, k: k, maxe: Math.round(r.maxe * 10) / 10, mean: Math.round(r.mean * 10) / 10, sw: r.sw, lost: r.lost || r.x < 370, ok: ok });
  }
  bind(root, upd); upd();
};

/* ---------- L13 k-Nächste-Nachbarn ---------- */
W.knn = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  var D = [[205, 45, "rot"], [190, 70, "rot"], [220, 60, "rot"], [170, 50, "rot"], [210, 90, "rot"], [55, 70, "gruen"], [70, 95, "gruen"], [40, 110, "gruen"], [90, 80, "gruen"], [60, 130, "gruen"],
           [45, 195, "blau"], [70, 180, "blau"], [30, 210, "blau"], [95, 200, "blau"], [125, 160, "blau"], [150, 100, "gruen"], [120, 125, "rot"]];
  var COL = { rot: "#d0453a", gruen: "#3b9d4a", blau: "#2f6fd1" }, P = [cfg.r || 140, cfg.b || 110];
  root.innerHTML = '<h4>🎨 Farben erkennen mit kNN</h4><div class="row"><label>k <select class="k">' + sel([1, 3, 5], cfg.k || 1) + '</select></label><span class="muted">Klicke in das Diagramm, um eine neue Messung (R | B) zu setzen. G ist fest.</span></div>' +
    '<canvas width="640" height="300" aria-label="Trainingsdaten im Farbraum"></canvas><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); }, cv = q("canvas");
  var X = function (r) { return 50 + r / 255 * 560; }, Y = function (b) { return 270 - b / 255 * 250; };
  cv.addEventListener("click", function (e) { var rc = cv.getBoundingClientRect(), x = (e.clientX - rc.left) * cv.width / rc.width, y = (e.clientY - rc.top) * cv.height / rc.height;
    P = [Math.max(0, Math.min(255, Math.round((x - 50) / 560 * 255))), Math.max(0, Math.min(255, Math.round((270 - y) / 250 * 255)))]; upd(); });
  function classify(k) {
    var s = D.map(function (d) { return [Math.hypot(d[0] - P[0], d[1] - P[1]), d[2], d]; }).sort(function (a, b) { return a[0] - b[0]; }).slice(0, k);
    var v = {}; s.forEach(function (x) { v[x[1]] = (v[x[1]] || 0) + 1; });
    var best = Object.keys(v).sort(function (a, b) { return v[b] - v[a] || 0; })[0];
    return { cls: best, nb: s, votes: v };
  }
  function upd() {
    var k = +q(".k").value, r = classify(k), c1 = classify(1).cls, c3 = classify(3).cls, c5 = classify(5).cls;
    var g = cv.getContext("2d"); g.clearRect(0, 0, cv.width, cv.height);
    g.strokeStyle = "#8a96a3"; g.beginPath(); g.moveTo(50, 15); g.lineTo(50, 270); g.lineTo(615, 270); g.stroke();
    g.fillStyle = "#5b6672"; g.font = "12px system-ui"; g.fillText("B (blau)", 54, 14); g.fillText("R (rot)", 570, 288);
    r.nb.forEach(function (n) { g.strokeStyle = "#8a96a3"; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(P[0]), Y(P[1])); g.lineTo(X(n[2][0]), Y(n[2][1])); g.stroke(); g.setLineDash([]); });
    D.forEach(function (d) { g.fillStyle = COL[d[2]]; g.beginPath(); g.arc(X(d[0]), Y(d[1]), 6, 0, 7); g.fill(); });
    g.strokeStyle = "#1c2430"; g.lineWidth = 3; g.beginPath(); g.arc(X(P[0]), Y(P[1]), 9, 0, 7); g.stroke(); g.lineWidth = 1;
    q(".wout").innerHTML = 'Messung (R ' + P[0] + ' | B ' + P[1] + ') · ' + k + ' nächste Nachbarn: ' + r.nb.map(function (n) { return n[1] + " (" + fmt(n[0], 0) + ")"; }).join(", ") + ' → Klasse <span class="resl">' + r.cls + '</span>' +
      '<br><small>k = 1: ' + c1 + ' · k = 3: ' + c3 + ' · k = 5: ' + c5 + '</small>';
    on({ r: P[0], b: P[1], k: k, cls: r.cls, c1: c1, c3: c3, c5: c5 });
  }
  bind(root, upd); upd();
};

/* ---------- L14 Ein künstliches Neuron ---------- */
W.neuron = function (root, cfg, on) {
  cfg = cfg || {}; on = on || noop;
  root.innerHTML = '<h4>🧠 Künstliches Neuron: Ausgabe = 1, wenn w₁·x₁ + w₂·x₂ + b &gt; 0</h4><div class="row"><label>w₁ <input type="range" class="w1" min="-2" max="2" step="0.5" value="' + (cfg.w1 != null ? cfg.w1 : 1) + '"> <b class="v1"></b></label>' +
    '<label>w₂ <input type="range" class="w2" min="-2" max="2" step="0.5" value="' + (cfg.w2 != null ? cfg.w2 : 1) + '"> <b class="v2"></b></label>' +
    '<label>b <input type="range" class="b" min="-3" max="2" step="0.5" value="' + (cfg.b != null ? cfg.b : 0) + '"> <b class="vb"></b></label></div><div class="row tab"></div><div class="row wout" aria-live="polite"></div>';
  var q = function (c) { return root.querySelector(c); };
  var G = { UND: [0, 0, 0, 1], ODER: [0, 1, 1, 1], NAND: [1, 1, 1, 0], NOR: [1, 0, 0, 0], XOR: [0, 1, 1, 0] };
  function upd() {
    var w1 = +q(".w1").value, w2 = +q(".w2").value, b = +q(".b").value; q(".v1").textContent = fmt(w1, 1); q(".v2").textContent = fmt(w2, 1); q(".vb").textContent = fmt(b, 1);
    var X = [[0, 0], [0, 1], [1, 0], [1, 1]], out = X.map(function (x) { return w1 * x[0] + w2 * x[1] + b > 0 ? 1 : 0; });
    q(".tab").innerHTML = '<table class="t"><tr><th>x₁</th><th>x₂</th><th>Summe</th><th>Ausgabe</th></tr>' + X.map(function (x, i) { return '<tr><td>' + x[0] + '</td><td>' + x[1] + '</td><td>' + fmt(w1 * x[0] + w2 * x[1] + b, 1) + '</td><td><b>' + out[i] + '</b></td></tr>'; }).join("") + '</table>';
    var gate = Object.keys(G).filter(function (k) { return G[k].join("") === out.join(""); })[0] || "";
    q(".wout").innerHTML = gate ? 'Das Neuron verhält sich wie ein <span class="resl">' + gate + '</span>-Gatter.' : 'Ausgabe ' + out.join(" ") + ' – kein bekanntes Gatter.';
    on({ w1: w1, w2: w2, b: b, out: out.join(""), gate: gate });
  }
  bind(root, upd); upd();
};

window.WIDGETS = W;
})();
