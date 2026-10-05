# A4 Kodierung – Code-39-Dekodierer mit Fehlererkennung
# Konfiguration: USB1 = Kamera mit Linienerkennung (Kamera-Fenster in ROBO Pro Coding), Display-Label "txt_label"
import time
from lib.controller import *
from lib.display import *

zeichen = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]
codes   = ["000110100", "100100001", "001100001", "101100000", "000110001", "100110000", "001110000", "000100101", "100100100", "001100100", "100001001", "001001001", "101001000", "000011001", "100011000", "001011000", "000001101", "100001100", "001001100", "000011100", "100000011", "001000011", "101000010", "000010011", "100010010", "001010010", "000000111", "100000110", "001000110", "000010110", "110000001", "011000001", "111000000", "010010001", "110010000", "011010000"]

def balken_lesen():
    """TODO Kamera: Liste mit den 9 Breiten (5 Balken + 4 Luecken) in Pixeln zurueckgeben.
    Den Code dafuer erzeugt ROBO Pro Coding, wenn du in Blockly den Baustein der
    Linienerkennung (Breite der erkannten Linien) verwendest und in die Python-Ansicht wechselst."""
    return [21, 8, 9, 7, 8, 21, 8, 9, 22]      # Testwerte = "A"

def dekodieren(breiten):
    schwelle = (min(breiten) + max(breiten)) / 2
    bits = ""
    for b in breiten:
        bits += "1" if b > schwelle else "0"
    if bits.count("1") != 3 or bits not in codes:   # Code 39: genau 3 breite Elemente
        return "Fehler (" + bits + ")"
    return zeichen[codes.index(bits)]

while True:
    display.set_attr("txt_label.text", dekodieren(balken_lesen()))
    time.sleep(0.5)
