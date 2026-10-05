# KI 2 – Perzeptron erkennt Richtungspfeile (5x5-Bilder) und steuert den Buggy
import time, math
from lib.controller import *

IMPULSE_PRO_CM = 6.438
IMPULSE_PRO_GRAD = 0.751
L, R = TXT_M_M1_encodermotor, TXT_M_M2_encodermotor

def bewege(impulse, richtung_links, richtung_rechts, speed=400):
    L.set_speed(speed, richtung_links)
    R.set_speed(speed, richtung_rechts)
    L.set_distance(round(impulse), R)
    while L.is_running():
        time.sleep(0.01)

def vor(cm):      bewege(cm * IMPULSE_PRO_CM, Motor.CCW, Motor.CCW)
def links(grad):  bewege(grad * IMPULSE_PRO_GRAD, Motor.CW, Motor.CCW)
def rechts(grad): bewege(grad * IMPULSE_PRO_GRAD, Motor.CCW, Motor.CW)
trainingsbilder = [
    ([[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,0,0]], "rechts"),
    ([[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,0,1]], "rechts"),
    ([[0,0,1,0,0],[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0]], "rechts"),
    ([[0,0,1,0,1],[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0]], "rechts"),
    ([[0,0,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0]], "rechts"),
    ([[1,0,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0]], "rechts"),
    ([[0,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,0,0]], "links"),
    ([[1,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0],[0,0,1,0,0],[0,0,0,0,0]], "links"),
    ([[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0],[0,0,1,0,0]], "links"),
    ([[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0],[0,0,1,0,1]], "links"),
    ([[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0]], "links"),
    ([[0,0,0,0,1],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0]], "links"),
]

testbilder = [
    ([[0,0,0,0,0],[0,0,1,0,0],[0,0,0,1,0],[1,1,1,1,0],[0,0,0,1,0]], "rechts"),
    ([[1,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,0,0,0,0]], "rechts"),
    ([[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,1],[0,0,0,0,0]], "rechts"),
    ([[0,0,1,0,0],[1,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0],[0,0,1,0,0]], "links"),
    ([[0,0,1,0,0],[1,1,0,0,0],[1,1,1,1,1],[0,1,0,0,0],[0,0,1,0,0]], "links"),
    ([[0,0,0,0,0],[0,0,1,0,0],[0,1,0,0,1],[1,1,1,1,1],[0,1,0,0,0]], "links"),
]

def flach(bild):                       # 5x5 -> Liste mit 25 Zahlen
    return [pixel for zeile in bild for pixel in zeile]

w = [0.0] * 25
b = 0.0

def vorhersage(bild):
    x = flach(bild)
    summe = b
    for i in range(25):
        summe = summe + w[i] * x[i]
    return "rechts" if summe > 0 else "links"

def trainieren(epochen=20, lernrate=0.1):
    global b
    for e in range(epochen):
        for bild, soll in trainingsbilder:
            fehler = (1 if soll == "rechts" else 0) - (1 if vorhersage(bild) == "rechts" else 0)
            x = flach(bild)
            for i in range(25):
                w[i] = w[i] + lernrate * fehler * x[i]
            b = b + lernrate * fehler

def bild_lesen():
    """TODO Kamera: Kamerabild auf 5x5 Pixel (0/1) verkleinern und als Liste von 5 Zeilen zurueckgeben."""
    return [[0,0,1,0,0],[0,0,0,1,0],[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0]]

trainieren()
for kreuzung in range(3):
    vor(25)
    schild = bild_lesen()
    richtung = vorhersage(schild)
    print("Kreuzung", kreuzung + 1, ":", richtung)
    if richtung == "rechts":
        rechts(90)
    else:
        links(90)
vor(25)
