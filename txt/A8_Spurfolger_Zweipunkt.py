# A8 Spurfolger mit zwei IR-Spursensoren (1 = weiss, 0 = schwarz)
# Konfiguration: M1 links, M2 rechts (CCW = vorwaerts), I1 = IR-Spursensor links, I2 = rechts, 9V-Versorgung
import time
from lib.controller import *

def motoren(links, rechts):
    TXT_M_M1_encodermotor.set_speed(int(max(0, min(512, links))), Motor.CCW)
    TXT_M_M2_encodermotor.set_speed(int(max(0, min(512, rechts))), Motor.CCW)
    TXT_M_M1_encodermotor.start()
    TXT_M_M2_encodermotor.start()

SCHNELL, LANGSAM = 300, 60
letzte = "links"
while True:
    l = TXT_M_I1_trail_follower.get_state()
    r = TXT_M_I2_trail_follower.get_state()
    if l == 0 and r == 0:
        motoren(SCHNELL, SCHNELL)
    elif l == 1 and r == 0:
        motoren(SCHNELL, LANGSAM)      # nach rechts
        letzte = "rechts"
    elif l == 0 and r == 1:
        motoren(LANGSAM, SCHNELL)      # nach links
        letzte = "links"
    else:
        if letzte == "links":
            motoren(LANGSAM, SCHNELL)
        else:
            motoren(SCHNELL, LANGSAM)
    time.sleep(0.01)
