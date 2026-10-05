# KI 1 – Buggy reagiert auf Farbflaechen, Klassifikation mit k-Naechste-Nachbarn
# Konfiguration: M1/M2 Encodermotoren, O1 = LED rot, USB1 = Kamera
# Tipp: trainingsdaten mit eigenen Messungen ersetzen!
import time, math
from lib.controller import *

trainingsdaten = [
    ([205, 45, 50], "rot"),   ([190, 30, 40], "rot"),   ([220, 60, 55], "rot"),
    ([55, 165, 70], "gruen"), ([40, 150, 60], "gruen"), ([70, 175, 85], "gruen"),
    ([45, 70, 195], "blau"),  ([30, 60, 180], "blau"),  ([60, 85, 205], "blau"),
    ([230, 210, 60], "gelb"), ([240, 220, 80], "gelb"), ([215, 195, 50], "gelb"),
    ([235, 235, 228], "weiss"), ([245, 240, 235], "weiss"), ([220, 222, 215], "weiss"),
]

def farbabstand(a, b):
    return math.sqrt((a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2)

def klassifiziere(rgb):
    return min(trainingsdaten, key=lambda t: farbabstand(rgb, t[0]))[1]

def fahren():
    TXT_M_M1_encodermotor.set_speed(250, Motor.CCW)
    TXT_M_M2_encodermotor.set_speed(250, Motor.CCW)
    TXT_M_M1_encodermotor.start_sync(TXT_M_M2_encodermotor)

def anhalten():
    TXT_M_M1_encodermotor.stop_sync(TXT_M_M2_encodermotor)

def farbe_lesen():
    """TODO Kamera: [r, g, b] der Flaeche vor dem Buggy zurueckgeben
    (Kamera-Farberkennung in ROBO Pro Coding, siehe A4 Experimentieraufgabe 1)."""
    return [235, 235, 230]

letzte = ""
fahren()
while True:
    farbe = klassifiziere(farbe_lesen())
    if farbe != letzte:
        print(farbe)
        if farbe == "rot":
            anhalten()
            TXT_M_O1_led.set_brightness(512)
            time.sleep(2)
            TXT_M_O1_led.set_brightness(0)
            fahren()
        elif farbe == "blau":
            anhalten()
            break
        letzte = farbe
    time.sleep(0.1)
