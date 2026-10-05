# A6 Buggy – Fahrfunktionen, Stoßstangen und Ultraschall-Umfahrung (Material 3.3)
# Konfiguration: M1/C1 = Encodermotor links, M2/C2 = Encodermotor rechts (CCW = vorwärts),
#                I3 = Ultraschall, I7 = Taster links, I8 = Taster rechts
import time
from lib.controller import *

IMPULSE_PRO_CM = 6.438        # selbst kalibrieren! (Aufgabe 8.3)
IMPULSE_PRO_GRAD = 0.751      # selbst kalibrieren!
L, R = TXT_M_M1_encodermotor, TXT_M_M2_encodermotor
distance = 40

def bewege(impulse, richtung_links, richtung_rechts, speed=350):
    L.set_speed(speed, richtung_links)
    R.set_speed(speed, richtung_rechts)
    L.set_distance(round(impulse), R)
    while L.is_running():
        time.sleep(0.01)

def vor(cm):      bewege(cm * IMPULSE_PRO_CM, Motor.CCW, Motor.CCW)
def zurueck(cm):  bewege(cm * IMPULSE_PRO_CM, Motor.CW, Motor.CW)
def rechts(grad): bewege(grad * IMPULSE_PRO_GRAD, Motor.CCW, Motor.CW)
def links(grad):  bewege(grad * IMPULSE_PRO_GRAD, Motor.CW, Motor.CCW)

def geradeaus(speed=350):
    L.set_speed(speed, Motor.CCW)
    R.set_speed(speed, Motor.CCW)
    L.start_sync(R)

def umfahren():
    L.stop_sync(R)
    rechts(90);    time.sleep(1)
    vor(distance); time.sleep(1)
    links(90);     time.sleep(1)
    vor(distance); time.sleep(3)
    links(90);     time.sleep(1)
    vor(distance); time.sleep(1)
    rechts(90);    time.sleep(3)

while True:
    if TXT_M_I7_mini_switch.is_closed():
        L.stop_sync(R); zurueck(10); rechts(45)
    elif TXT_M_I8_mini_switch.is_closed():
        L.stop_sync(R); zurueck(10); links(45)
    elif TXT_M_I3_ultrasonic_distance_meter.get_distance() <= 20:
        umfahren()
    else:
        geradeaus()
    time.sleep(0.02)
