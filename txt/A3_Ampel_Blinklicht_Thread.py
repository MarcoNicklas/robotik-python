# A3 Bedarfsampel mit Blinklicht als nebenläufigem Prozess (Thread)
# Konfiguration: I1 = Mini-Taster (Bedarf), O1 = LED Blinklicht, O3 = LED rot, O4 = LED grün
import time
import threading
from lib.controller import *

blinken_aktiv = False

def blinklicht():                       # läuft parallel zum Hauptprogramm
    while True:
        if blinken_aktiv:
            TXT_M_O1_led.set_brightness(512)
            time.sleep(0.5)
            TXT_M_O1_led.set_brightness(0)
            time.sleep(0.5)
        else:
            time.sleep(0.05)

def rot():
    TXT_M_O3_led.set_brightness(512)
    TXT_M_O4_led.set_brightness(0)

def gruen():
    TXT_M_O3_led.set_brightness(0)
    TXT_M_O4_led.set_brightness(512)

threading.Thread(target=blinklicht, daemon=True).start()
rot()
while True:
    if TXT_M_I1_mini_switch.is_closed():
        blinken_aktiv = True            # Thread "triggern"
        time.sleep(3)
        gruen()
        time.sleep(5)
        rot()
        blinken_aktiv = False
    time.sleep(0.02)
