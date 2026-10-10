"""Prüft alle Python-Aufgaben: Musterlösung besteht, Startprogramm besteht nicht (lokal mit dem Browser-Simulator fischersim)."""
import json, glob, os, sys, types
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "assets/sim.js"), encoding="utf8").read()
SIM = json.loads(src[src.index("=") + 1:].strip().rstrip(";"))
m = types.ModuleType("fischersim"); exec(compile(SIM, "fischersim.py", "exec"), m.__dict__); sys.modules["fischersim"] = m

def tasks():
    files = sorted(glob.glob(os.path.join(ROOT, "content/lessons/L*.json")))
    if files:
        for f in files:
            L = json.load(open(f, encoding="utf8"))
            for it in L["deep"]:
                if it["type"] == "py": yield L["id"] + " " + it["id"], it["ex"]
    else:
        for lid, L in json.load(open(sys.argv[1], encoding="utf8")).items():
            for e in L["exs"]: yield lid + " " + e["eid"], e["ex"]

bad = 0; n = 0
for name, d in tasks():
    if not d.get("check"): continue
    n += 1
    r = json.loads(m.run(d["solution"], json.dumps(d.get("cfg", {})), d["check"]))
    ok = bool(r["checks"]) and all(c["ok"] for c in r["checks"]) and not r.get("err")
    r2 = json.loads(m.run(d.get("starter", ""), json.dumps(d.get("cfg", {})), d["check"]))
    ok2 = bool(r2["checks"]) and all(c["ok"] for c in r2["checks"]) and not r2.get("err")
    if not ok or ok2:
        bad += 1; print("FEHLER", name, "Lösung ok:", ok, [c for c in r["checks"] if not c["ok"]], r.get("err"), "| Start besteht:", ok2)
print(n, "Aufgaben geprüft,", bad, "Fehler")
sys.exit(1 if bad else 0)
