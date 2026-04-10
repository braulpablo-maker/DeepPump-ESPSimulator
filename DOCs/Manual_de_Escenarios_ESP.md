# Manual Técnico y Operativo de Escenarios — ESP Simulator

Este documento consolida el análisis de ingeniería y la guía pedagógica para los 15 escenarios preconfigurados en el simulador industrial **DeepPump ESP**.

---

## 1. Base Case (Caso Base)
**Contexto:** Pozo en condiciones óptimas de diseño, recién completado o tras una intervención exitosa.
*   **Parámetros:** 60 Hz, SBHP 2700 psi, PI 3.0, GLR 200, Visc 1.0 cp.
*   **Física:** El punto de operación resulta del equilibrio entre la **Curva de Bomba** corregida por leyes de afinidad a 60 Hz y la **Curva del Sistema** (IPR + Cabeza Estática + Fricción). Coincide con el BEP (Best Efficiency Point).
*   **Diagnóstico SCADA:** 
    *   **AMP:** Estable (~23A).
    *   **Curva H-Q:** El punto de operación (bola negra) se encuentra centrado en la zona eficiente.
    *   **Temp:** ~180°F (enfriamiento óptimo por flujo de líquido).
*   **Resolución:** Operación de referencia. Se puede intentar optimizar subiendo frecuencia (Hz) hasta 65-68 Hz para capturar más caudal, siempre vigilando el límite OL.

## 2. Underload (Baja Carga / Error de Setpoint)
**Contexto:** Error de configuración en las protecciones del VFD o caída real de carga.
*   **Parámetros:** UL setpoint = 25A (superior a los 23A de operación normal).
*   **Física:** El sistema de protección detecta que la corriente es inferior al setpoint UL. En la realidad, esto protegería a la bomba de girar aire/gas (pumpoff) o por una rotura de eje.
*   **Diagnóstico SCADA:** El VFD muestra **"TRIP: UL"** casi inmediatamente tras el arranque. El pozo se apaga y entra en ciclo de reinicio automático (10s).
*   **Resolución:** Ajustar el parámetro **UL** (Underload) a un valor inferior al consumo real (ej. 10-15A).

## 3. Overload (Sobrecarga Eléctrica)
**Contexto:** Operación a alta frecuencia o con fluido demasiado pesado para la placa del motor.
*   **Parámetros:** 80 Hz, OL setpoint = 100A.
*   **Física:** La potencia al freno (BHP) escala con el cubo de la frecuencia ($BHP \propto Hz^3$). A 80 Hz, la demanda eléctrica excede el límite térmico del motor.
*   **Diagnóstico SCADA:** **"TRIP: OL"**. El gráfico de AMP muestra la corriente subiendo rápidamente por encima de 100A antes del corte.
*   **Resolución:** Reducir la frecuencia (**Hz**) a 60-65 Hz o aumentar el setpoint **OL** si las especificaciones del motor lo permiten.

## 4. Pumpoff (Agotamiento de Nivel)
**Contexto:** El yacimiento no aporta suficiente fluido para mantener la tasa de extracción actual.
*   **Parámetros:** SBHP baja (1800), PI bajo (0.8), 70 Hz.
*   **Física:** La tasa de extracción es mayor que el aporte por IPR. El nivel de fluido en el casing cae hasta la intake; el gas entra a la bomba reduciendo la carga.
*   **Diagnóstico SCADA:** Fluctuaciones en el Ammeter Chart. La PIP cae progresivamente. El pozo muestra el nivel visual llegando a la bomba roja. Eventual TRIP por UL.
*   **Resolución:** Bajar frecuencia (**Hz**) para que la tasa de extracción coincida con la productividad del yacimiento (Matching IPR).

## 5. Worn (Bomba Desgastada)
**Contexto:** Erosión interna (arena) o cavitación severa que ha degradado los impulsores.
*   **Parámetros:** Pump Wear = 35%.
*   **Física:** Las fugas internas (recirculación) reducen la cabeza generada proporcionalmente al cuadrado del desgaste ($H \propto (1-wear)^2$).
*   **Diagnóstico SCADA:** Producción (BLPD) y presión de descarga (PDP) muy bajas. La curva roja de operación está colapsada respecto a la de catálogo.
*   **Resolución:** Requiere reemplazo de bomba (*Workover*). En superficie solo se puede "parchear" subiendo Hz, pero con baja eficiencia.

## 6. Viscous (Aceite Pesado / Emulsión)
**Contexto:** Producción de crudo viscoso (pesado) que genera alta fricción interna.
*   **Parámetros:** Visc = 30 cp (Agua = 1 cp).
*   **Física:** Siguiendo el modelo ANSI/HI, la viscosidad produce "drag" mecánico, degradando cabeza y caudal mientras dispara el consumo de BHP.
*   **Diagnóstico SCADA:** Amperaje muy alto para una producción tan reducida. "Curva aplastada" en el gráfico H-Q. 
*   **Resolución:** Aumentar frecuencia (**Hz**) para vencer la resistencia viscosa, vigilando estrictamente el límite **OL**.

## 7. Gassy (Pozo con Gas Libre)
**Contexto:** Operación por debajo de la presión de burbuja sin separación eficiente.
*   **Parámetros:** GLR = 600 scf/bbl.
*   **Física:** El gas libre entra en la bomba, reduciendo el SG de la mezcla y ocupando el volumen destinado al líquido, lo que degrada la cabeza hidraulica.
*   **Diagnóstico SCADA:** Display de **"High GVF"** (amarillo). Inestabilidad en PIP y Amperaje.
*   **Resolución:** 
    1. Aumentar eficiencia del separador (**Sep Eff**).
    2. Cerrar ligeramente el **Choke** para subir la PIP y mantener más gas en solución.

## 8. Gas Lock (Bloqueo por Gas)
**Contexto:** Condición crítica donde la bomba se llena de gas y deja de desplazar líquido.
*   **Parámetros:** GLR = 800+.
*   **Física:** El GVF supera el 60% (Umbral crítico). La bomba pierde el "prime". Al no circular líquido, el motor pierde enfriamiento rápidamente.
*   **Diagnóstico SCADA:** BLPD cae a cero. Gráfico de **MWT** (Motor Temp) subiendo verticalmente. Display en rojo parpadeante.
*   **Resolución:** Parada de emergencia. Esperar segregación de gas. Aumentar **Sep Eff** antes de un rearranque lento.

## 9. Redesign 1 (Sobredimensionada)
**Contexto:** Pozo maduro donde la bomba actual es demasiado grande para su producción actual.
*   **Parámetros:** SBHP 2200, PI 1.2.
*   **Física:** La bomba opera en el extremo izquierdo de su curva (Downthrust), desperdiciando energía y arriesgando daño mecánico.
*   **Diagnóstico SCADA:** Punto de operación en la zona gris (izquierda) del gráfico H-Q. Eficiencia bajísima.
*   **Resolución:** Bajar frecuencia al mínimo permitido (~40 Hz). Planificar cambio por una bomba de menor caudal.

## 10. Redesign 2 (Baja Energía / Downthrust)
**Contexto:** Presión de reservorio insuficiente.
*   **Parámetros:** SBHP 1500, PI 0.6.
*   **Física:** El pozo no tiene energía para alimentar la bomba ni siquiera a bajas frecuencias.
*   **Diagnóstico SCADA:** Constantes TRIPs por UL. PIP casi igual a SBHP.
*   **Resolución:** Inviable. Requiere rediseño a una bomba con más etapas o de menor capacidad nominal.

## 11. OPS 1 (Fallas Combinadas)
**Contexto:** Escenario complejo de campo: pozo viejo, viscoso y gaseoso.
*   **Parámetros:** Wear 20%, GLR 500, Visc 5 cp.
*   **Física:** Interacción de múltiples factores de degradación. El gas suele ser el factor dominante que desestabiliza el sistema.
*   **Diagnóstico SCADA:** Analizar qué variable tiene el mayor "gap" respecto al catálogo.
*   **Resolución:** Primero optimizar separación de gas y luego ajustar Hz para equilibrar carga térmica y producción.

## 12. OPS 2 (Calibración / Matching)
**Contexto:** Ajuste del modelo teórico a la realidad observada en campo (1800 BLPD).
*   **Parámetros:** Desgaste y Presión variables.
*   **Física:** Proceso de calibración manual para que el simulador refleje el estado real del activo.
*   **Diagnóstico SCADA:** El BLPD leído no coincide con los datos históricos de campo.
*   **Resolución:** Ajustar **PI** o **SBHP** levemente hasta que el valor en el LCD coincida con la realidad.

## 13. OPS 3 (Error: Choke Cerrado)
**Contexto:** Error operativo crítico. Todas las válvulas de salida están cerradas.
*   **Parámetros:** Choke = 5%.
*   **Física:** Operación a "Shut-in" o flujo cero. La bomba consume energía que se disipa puramente como calor en el fluido atrapado.
*   **Diagnóstico SCADA:** 0 BLPD, motor calentándose rápidamente a pesar de tener PIP estable.
*   **Resolución:** **Abrir Choke al 100%** de inmediato.

## 14. OPS 4 (Arranque con Fluido Pesado)
**Contexto:** Pozo lleno de salmuera pesada o lodo de intervención.
*   **Parámetros:** Liq SG = 1.07.
*   **Física:** El motor hace mucho más esfuerzo para levantar el peso de la salmuera ($BHP \propto SG$).
*   **Diagnóstico SCADA:** Amperaje inicial rozando el límite OL. PDP alta.
*   **Resolución:** Arrancar a frecuencia moderada y esperar a que el pozo se "limpie" con petróleo más liviano antes de subir Hz.

## 15. OPS 5 (Cambio de Reservorio)
**Contexto:** Colapso de presión estática o daño súbito en la formación.
*   **Parámetros:** SBHP cae a 2200, PI cae a 2.0.
*   **Física:** El aporte del yacimiento cambia, desplazando el equilibrio sistema-bomba hacia la izquierda.
*   **Diagnóstico SCADA:** Caída de producción repentina (~1000 BLPD menos) sin haber tocado el VFD. La PIP sube.
*   **Resolución:** Diagnosticar si es daño (requiere tratamiento químico) o agotamiento (requiere reducir Hz).


---
*Nota: Todos los modelos físicos de este manual están basados en las especificaciones de DeepPump ESP Simulator v4.0.*
