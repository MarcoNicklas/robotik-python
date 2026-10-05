# A2 Parkhausschranke mit Bedarfstaster, Lichtschranke und Durchfahrt-Zähler
# Konfiguration: M1 = Encodermotor (CCW = öffnen), C1 = Encoder-Zähler M1,
#                I1 = Mini-Taster Endlage unten, I2 = Mini-Taster Bedarf, I3 = Fototransistor (Lichtschranke)
# Drehrichtung mit dem Interface-Test prüfen und ggf. CW/CCW tauschen!
import time
from lib.controller import *
from lib.display import *

IMPULSE_90_GRAD = 64          # 63,9 Impulse je Achsumdrehung, Untersetzung beachten (A2 Aufgabe 3a)

def schliessen():
    TXT_M_M1_encodermotor.set_speed(300, Motor.CW)
    TXT_M_M1_encodermotor.start()
    while not TXT_M_I1_mini_switch.is_closed():
        time.sleep(0.01)
    TXT_M_M1_encodermotor.stop()

def oeffnen():
    TXT_M_M1_encodermotor.set_speed(300, Motor.CCW)
    TXT_M_M1_encodermotor.set_distance(IMPULSE_90_GRAD)
    while TXT_M_M1_encodermotor.is_running():
        time.sleep(0.01)

durchfahrten = 0
schliessen()                                   # definierter Startzustand
display.set_attr("txt_label.text", "Durchfahrten: 0")
while True:
    if TXT_M_I2_mini_switch.is_closed():       # Bedarfstaster
        time.sleep(3)
        oeffnen()
        while not TXT_M_I3_photo_transistor.is_dark():   # warten bis Fahrzeug in der Lichtschranke
            time.sleep(0.02)
        while TXT_M_I3_photo_transistor.is_dark():       # warten bis Fahrzeug durch ist
            time.sleep(0.02)
        time.sleep(1)
        schliessen()
        durchfahrten += 1
        display.set_attr("txt_label.text", "Durchfahrten: " + str(durchfahrten))
    time.sleep(0.02)
