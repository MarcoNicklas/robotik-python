# A1 Analoge Sensoren – Thermometer mit Min/Max und Abstandsanzeige
# Konfiguration: I1 = NTC-Widerstand, I2 = Ultraschall-Abstandssensor, Display-Label "txt_label"
import time
from lib.controller import *
from lib.display import *

kleinste = 1000
groesste = -1000

while True:
    temp = TXT_M_I1_ntc_resistor.get_temperature()
    abstand = TXT_M_I2_ultrasonic_distance_meter.get_distance()
    kleinste = min(kleinste, temp)
    groesste = max(groesste, temp)
    display.set_attr("txt_label.text", f"{temp:.1f} °C (min {kleinste:.1f} / max {groesste:.1f})  {abstand} cm")
    print(temp, kleinste, groesste, abstand)
    time.sleep(1)
