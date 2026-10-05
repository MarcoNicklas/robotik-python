# A7 Malroboter – Punkte (x|y) in cm anfahren (Malen nach Zahlen)
# Konfiguration: M1/C1 links, M2/C2 rechts (CCW = vorwaerts), Stift in der Mitte zwischen den Raedern
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

pos_x, pos_y, blick = 0.0, 0.0, 0.0

def fahre_zu(zx, zy):
    global pos_x, pos_y, blick
    dx, dy = zx - pos_x, zy - pos_y
    ziel = math.degrees(math.atan2(dy, dx))
    drehung = (ziel - blick + 180) % 360 - 180
    if drehung > 0:
        links(drehung)
    else:
        rechts(-drehung)
    vor(math.hypot(dx, dy))
    pos_x, pos_y, blick = zx, zy, ziel

bild = [(20, 0), (20, 20), (0, 20), (0, 0), (20, 20), (10, 30), (0, 20), (20, 0)]
for punkt in bild:
    fahre_zu(punkt[0], punkt[1])
