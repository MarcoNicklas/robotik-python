# A5 Morse-Sender ueber die Licht-Strecke
# Konfiguration: O1 = Sende-LED (Polung beachten!), I1 = Fototransistor, O2 = Empfangs-LED
import time
import threading
from lib.controller import *

morse = {
    "A": ".-",     "B": "-...",     "C": "-.-.",     "D": "-..",     "E": ".",     "F": "..-.",
    "G": "--.",     "H": "....",     "I": "..",     "J": ".---",     "K": "-.-",     "L": ".-..",
    "M": "--",     "N": "-.",     "O": "---",     "P": ".--.",     "Q": "--.-",     "R": ".-.",
    "S": "...",     "T": "-",     "U": "..-",     "V": "...-",     "W": ".--",     "X": "-..-",
    "Y": "-.--",     "Z": "--..", 
}

DIT = 0.1          # Basis-Zeiteinheit in Sekunden

def signal(dauer):
    TXT_M_O1_led.set_brightness(512)
    time.sleep(dauer)
    TXT_M_O1_led.set_brightness(0)
    time.sleep(DIT)

def sende(text):
    for buchstabe in text.upper():
        if buchstabe not in morse:
            time.sleep(7 * DIT)        # Wortpause
            continue
        for z in morse[buchstabe]:
            signal(DIT if z == "." else 3 * DIT)
        time.sleep(2 * DIT)

def empfaenger():                      # nebenlaeufig: Empfangs-LED zeigt Licht an
    while True:
        TXT_M_O2_led.set_brightness(512 if TXT_M_I1_photo_transistor.is_bright() else 0)
        time.sleep(0.005)

threading.Thread(target=empfaenger, daemon=True).start()
sende("thequickbrownfoxjumpsoverthelazydog")
