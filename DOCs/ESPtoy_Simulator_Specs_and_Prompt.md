# ESPtoy — Documentación Completa para Replicar el Simulador

Este documento recopila **toda** la información técnica, ecuaciones, metodología, layout de interfaz, y casos de uso extraídos de la documentación original de **ESPtoy** (Burney Waring, Copyright 2018), complementados con fundamentos de ingeniería petrolera estándar (Leyes de Afinidad, Centrilift Submersible Pump Handbook, ANSI/HI 9.6.7).

El objetivo es que este archivo contenga la información suficiente para que una IA generativa construya un simulador interactivo equivalente.

---

## 1. Descripción General del Proyecto Original

ESPtoy es un "juguete de software" educativo diseñado para enseñar el comportamiento dinámico de sistemas de **Bombas Electrosumergibles (ESP — Electric Submersible Pumps)** utilizados en la producción de petróleo.

**Características clave:**
- **No es un modelo de ingeniería** preciso para diseño real, pero sí es realista en su comportamiento cualitativo.
- Fue construido en **Python 3** (Anaconda + Spyder) usando la librería gráfica **pygame**.
- Interfaz fija de **1024 × 719 px** por defecto, redimensionable.
- El pozo simulado tiene la bomba a **7000 pies** de profundidad.
- Voltaje del motor fijo en **2500 V**.
- Temperatura estática del pozo a profundidad de bomba: **163 °F**.
- Referencia técnica principal: **Centrilift Submersible Pump Handbook** (4ta edición).

---

## 2. Anatomía de la Interfaz (Layout del UI)

Basado en el screenshot original, la interfaz se compone de las siguientes zonas:

### 2.1 Zona Superior-Izquierda: Panel VFD
- **Botón de encendido/apagado (Power):** Botón circular que se torna verde cuando la bomba está activa.
- **Botones grises: HZ, OL, UL** — Al hacer clic en cada uno, se habilita un slider inferior para modificar el valor correspondiente.
- **Display digital verde** (tipo LCD): Muestra `XX HZ, YY A` (frecuencia y amperaje actuales).

### 2.2 Zona Superior-Centro: Presión en Superficie
- **Display grande verde-amarillo**: Muestra la **FTP (Flowing Tubing Pressure)** en psi (ej. `100 psi`).

### 2.3 Zona Superior-Derecha: Choke y Medidor
- **Display verde "Choke"**: Muestra el porcentaje de apertura del estrangulador (ej. `50%`).
- **Display verde "BPD"**: Medidor de superficie que muestra la tasa de producción promediada (ej. `3 BPD`). Se reinicia al encender la bomba.
- **Botón "Info"**: Abre la documentación.

### 2.4 Zona Central: Visualización del Pozo
- **Representación gráfica del casing y tubing** con niveles de fluido animados (color verde).
- **Escala lateral izquierda**: Marcas cada 1000 pies, desde 0 (superficie) hasta 7000 pies (profundidad de bomba).
- **Bomba ESP**: Representada como una forma roja en la parte inferior.
- **Check-valve (válvula anti-retorno)**: Rectángulo gris justo encima de la bomba. Clic para instalar/quitar. Previene flujo inverso cuando la bomba está apagada.
- **Niveles de fluido**: Animación dinámica — cuando la bomba está encendida, el nivel del casing baja y el del tubing sube; cuando está apagada, se equilibran lentamente.

### 2.5 Zona Izquierda: Gráfico Ammeter Chart (Registro histórico)
- **Gráfico de series temporales** que muestra las siguientes curvas simultáneamente:
  - **AMPS** (Azul oscuro) — Amperaje del motor
  - **Motor Temp / MWT** (Cian) — Temperatura del motor
  - **BLPD** (Amarillo) — Tasa de producción
  - **FTP** (Verde oscuro) — Presión fluyente en superficie
  - **Discharge Pressure / PDP** (Rojo/Magenta) — Presión de descarga de la bomba
  - **Intake Pressure / PIP** (Violeta/Azul) — Presión de entrada de la bomba
  - **GVF** (Negro) — Fracción de volumen de gas
- **Líneas horizontales OL y UL** rojas marcando los límites de trip.
- **Clic sobre el gráfico** alterna entre modo multi-curvas y solo amperaje.

### 2.6 Zona Inferior-Izquierda: Panel de Control de Parámetros
- **Fila de 7 botones grises**: `Pump Wear`, `Sep Eff`, `SBHP`, `PI`, `GLR`, `Visc`, `Liq SG`.
- **Display verde grande** que muestra el nombre y valor actual del parámetro seleccionado.
- **Slider horizontal** debajo del display para modificar el valor.

### 2.7 Zona Derecha: Curva de Bomba y Datos Calculados
- **Gráfico de Curva de Bomba (Pump Curve)**:
  - Eje X: `Rate (blpd)` — tasa de bombeo.
  - Eje Y: `Head (feet)` — cabeza generada.
  - **Curva azul**: Curva de catálogo (agua fresca, 60Hz, sin desgaste) — la curva "de diseño" de la bomba.
  - **Curva roja**: Curva actual de operación (ajustada por HZ, desgaste, viscosidad, GVF, SG).
  - **Dos puntos negros** sobre la curva azul marcan los límites de la zona eficiente (entre Upthrust y Downthrust).
  - **Cuadritos grises** diminutos en los extremos de los ejes permiten cambiar el Catalog Head y Catalog Rate (simular cambio de bomba).
- **Panel de datos numéricos** debajo del gráfico muestra:
  - `Power (BHP): XX` — Potencia requerida en HP
  - `Pump rate (blpd): XXXX` — Tasa de bombeo actual
  - `Head (feet): XXXX` — Cabeza dinámica total
  - `Pump Disch. (psi): XXXX` — Presión de descarga
  - `Pump Intake (psi): XXXX` — Presión de entrada (= FBHP)
  - `Pump SG: X.XX` — Gravedad específica de la mezcla en la bomba
  - `Motor Temp (F): XXX` — Temperatura del motor en °F
  - `GVF into pump (%): XX` — Fracción de gas volumétrica a la entrada

### 2.8 Zona Inferior-Derecha: Controles de Caso y Reset
- **Botón "Cases"**: Navega entre distintos escenarios preconfigurados (Base Case, Underload, Overload, Pumpoff, Worn, Viscous, Gassy, Gas Lock, Redesign 1-2, OPS 1-5).
- **Botones de Navegación** (flechas izq/der) para cambiar entre casos.
- **Botón "Reset"**: Restaura todos los valores al caso base original.
- **Botón "Running Speed"**: Controla la velocidad de la simulación. El slider permite pausar (todo a la izquierda) o acelerar.

---

## 3. Parámetros de Entrada Completos

| Parámetro | Abreviatura | Unidad | Rango Típico | Valor por Defecto (Base Case) |
|---|---|---|---|---|
| Frecuencia del VFD | HZ | Hz | 0 – 90 | ~60 |
| Límite Overload | OL | Amps | 0 – 200 | ~130 |
| Límite Underload | UL | Amps | 0 – 200 | ~10 |
| Desgaste de Bomba | Pump Wear | % (ratio 0–1) | 0 – 100% | 0% |
| Eficiencia Separador | Sep Eff | % | 0 – 90% | 0% |
| Presión Estática de Fondo | SBHP | psi | 500 – 4000 | ~2700 |
| Índice de Productividad | PI | BLPD/psi | 0.1 – 10 | ~3.0 |
| Relación Gas-Líquido | GLR | scf/bbl | 0 – 1000+ | ~200 |
| Viscosidad | Visc | cp (centipoise) | 0.5 – 100+ | 1.0 |
| Gravedad Específica Líquido | Liq SG | adim. | 0.6 – 1.2 | ~0.95 |
| Apertura del Choke | Choke | % | 0 – 100 | 100% (abierto) |
| Cabeza de Catálogo (por etapa) | Catalog Head | ft | Ajustable | ~fijo de fábrica |
| Tasa de Catálogo | Catalog Rate | BLPD | Ajustable | ~fijo de fábrica |

**Nota importante sobre OL:** Si OL se pone en 200 (máximo), ESPtoy ignora el chequeo de overload. Esto permite explorar casos extremos sin trip.

---

## 4. Metodología y Ecuaciones Completas

### 4.1 Curva de Bomba (Pump Curve)
La curva Head-vs-Rate de una bomba centrífuga se modela típicamente con un **polinomio de segundo orden (parábola descendente)**:

```
H_catalog(Q) = A + B*Q + C*Q²
```

Donde:
- `H` es la cabeza (head) en pies por etapa.
- `Q` es la tasa de flujo (rate) en BLPD.
- `A`, `B`, `C` son coeficientes empíricos derivados de la curva del fabricante. Típicamente `A > 0`, `B ≤ 0`, `C < 0`.

En ESPtoy, la curva de catálogo se define a **60 Hz** con **agua fresca (SG = 1.0)** y se puede modificar cambiando los valores de Catalog Head y Catalog Rate (lo cual redefine los coeficientes).

Los **dos puntos** sobre la curva de catálogo delimitan la **zona de operación eficiente** (rango recomendado, típicamente 70-120% del BEP):
- A la **izquierda** del punto izquierdo → zona de **Downthrust** (alta cabeza, bajo caudal).
- A la **derecha** del punto derecho → zona de **Upthrust** (baja cabeza, alto caudal).

### 4.2 Leyes de Afinidad (Affinity Laws)
Cuando la frecuencia del VFD cambia de la base (`f_base`, usualmente 50 Hz según tu preferencia), la curva de la bomba se reescala:

```
Ratio = HZ_actual / HZ_base

Q_ajustado = Q_catalogo × Ratio          (lineal)
H_ajustado = H_catalogo × Ratio²         (cuadrática)
P_ajustado = P_catalogo × Ratio³         (cúbica)
```

> **NOTA:** El usuario cambió la frecuencia base a 50 Hz. En el ESPtoy original la curva de catálogo se referencia a 60 Hz (estándar norteamericano). Para Argentina/Europa usar 50 Hz como base es correcto.

### 4.3 Efecto del Desgaste de Bomba (Pump Wear)
El desgaste se representa como un ratio de diámetros:

```
W = diámetro_desgastado / diámetro_original    (valor entre 0 y 1; 0 = bomba destruida, 1 = nueva)
```

Efectos sobre la curva:
```
Q_efectivo = Q_ajustado × (1 - PumpWear)       o equivalente: × W
H_efectivo = H_ajustado × (1 - PumpWear)²      o equivalente: × W²
```

El PumpWear es un "factor de corrección general" que no solo representa desgaste abrasivo, sino también scaling, problemas mecánicos, sellos defectuosos, y cualquier discrepancia entre el cálculo y la realidad.

### 4.4 Corrección por Viscosidad
Basado en los factores de corrección del Centrilift Handbook y estándar ANSI/HI 9.6.7:

La viscosidad superior a agua (1 cp) degrada el desempeño de la bomba:
```
Q_viscoso = Q × C_Q    (C_Q < 1 para viscosidad alta)
H_viscoso = H × C_H    (C_H < 1 para viscosidad alta)
η_viscoso = η × C_E    (C_E < 1 para viscosidad alta)
```

El efecto neto: **menor tasa, menor cabeza, menor eficiencia, mayor potencia requerida y mayor temperatura de motor**.

### 4.5 Modelo de Producción del Pozo (IPR simplificada lineal)

```
Producción (BLPD) = PI × (SBHP - FBHP)
```

Donde:
- `FBHP` = Flowing Bottom Hole Pressure = Pump Intake Pressure (en ESPtoy son equivalentes, ambos al datum de 7000 ft).
- Si `FBHP` cae por debajo de 0, la producción está limitada por el reservorio.

Reorganizando:
```
FBHP = SBHP - (BLPD / PI)
```

### 4.6 Cabeza Dinámica Total (Total Dynamic Head)
La cabeza que la bomba necesita generar para elevar los fluidos a superficie:

```
Head_requerida = (Presión_Descarga - Presión_Entrada) × 2.309 / SG_mezcla
```

Más específicamente:
```
Head (feet) = 2.309 × ΔP / SG
```

Donde `ΔP` incluye:
- La diferencia entre el nivel de fluido en el tubing y el nivel en el casing.
- La contrapresión aplicada por el choke (FTP - Flowing Tubing Pressure).
- Pérdidas por fricción (simplificadas en ESPtoy).

**Nota clave de ESPtoy:** El casing está conectado a la línea de flujo aguas abajo del choke, permitiendo que el gas fluya junto con el líquido. Por lo tanto, si no hay choke y los niveles son iguales, la cabeza debería ser cero.

### 4.7 Fracción de Volumen de Gas (GVF)
Ecuación completa documentada en ESPtoy:

```
Gas_libre_reserv = GLR (en reservorio) - GLR (a presión de entrada de bomba)
```

ESPtoy **simplifica** asumiendo que el gas que sale de solución a la presión de la bomba es:
```
Gas_sale_solucion = GLR × (1 - FBHP / SBHP)
```

Tasa de gas en BPD a condiciones de fondo:
```
G = (Gas_sale_solucion) × BLPD / 5.61 × (35.37 × P / (Z × T)) × (1 - Sep_Eff)
```

Simplificación adicional de ESPtoy: sustituye el factor de volumen de fondo por `14.7 / Pump_Intake_Pressure`.

**GVF a la entrada de la bomba:**
```
GVF = G / (G + BLPD)
```

**Valores operativos críticos:**
- GVF < 10-15% → Operación aceptable sin separador especial.
- GVF > 15-20% → Se necesita separador rotativo de gas (40-80% eficiencia).
- GVF muy alto → Riesgo de **Gas Lock** (la bomba no puede generar cabeza suficiente con mezcla tan liviana).

**Efecto adicional: La eficiencia del separador de gas NO ayuda a la temperatura del motor.** El gas sigue pasando por el motor antes de ser separado en la entrada de la bomba.

### 4.8 Cálculos Eléctricos

**Potencia hidráulica requerida por la bomba (HP):**
```
HP = (BPD × Head_feet × SG) / (136,000 × η_bomba)
```

**Potencia mecánica total (Brake Horse Power - BHP):**
```
BHP = HP / (PF × η_motor) + Pérdidas_cable
```
Donde `PF` = Power Factor, `η_motor` = eficiencia del motor.

**Amperaje del motor:**
```
Amps = (BHP × 746) / (1.73 × Voltaje)
```
ESPtoy asume **Voltaje = 2500 V** fijo.

**¿Por qué 2500V?** Se necesita alto voltaje para transmitir suficiente potencia a través de 7000 pies de cable sin pérdidas excesivas. Menor voltaje implicaría mayor amperaje y cables conductores más gruesos que no cabrían en el casing.

### 4.9 Temperatura del Motor

La temperatura base del pozo a la profundidad de la bomba es **163 °F**.

**Aumento de temperatura del fluido al pasar el motor:**
```
ΔT_fluido = (HP_perdidas × 42.44) / (masa_fluido_lb_min × calor_específico_BTU_lb_F)
```

**Aumento de temperatura interna del motor por carga:**
```
ΔT_interno = ΔT_plena_carga × (HP_actual / HP_diseño)^1.2
```

**Efectos del gas sobre la temperatura:**
- El gas tiene **bajo calor específico** y **baja masa** comparado con agua/petróleo.
- ESPtoy asume que la capacidad de enfriamiento se reduce proporcionalmente con el GVF.
- Un motor rodeado solo de gas **sobrecalentará rápidamente**.
- Líquidos con menor SG tienen menor calor específico → motor más caliente.

**Temperatura final del motor:**
```
T_motor = T_estática_pozo + ΔT_fluido + ΔT_interno
```

### 4.10 Upthrust y Downthrust

- **Upthrust**: Ocurre cuando la bomba opera a **alta tasa** y **baja cabeza** (a la derecha del punto derecho en la curva). Los impulsores son empujados hacia arriba contra sus alojamientos.
- **Downthrust**: Ocurre cuando la bomba opera a **baja tasa** y **alta cabeza** (a la izquierda del punto izquierdo). Los impulsores son empujados hacia abajo contra superficies de desgaste.

**En la práctica real:** Los ingenieros que seleccionan ESPs apuntan al extremo de Upthrust de la curva, porque a medida que el pozo depleciona, el punto de operación se mueve naturalmente hacia la izquierda (menor tasa, mayor cabeza). Se puede aplicar choke para mover el punto operativo a la izquierda, pero no a la derecha.

### 4.11 Efecto del Choke

El choke aplica contrapresión (Flowing Tubing Pressure):
```
FTP = f(Choke_%, Produccion)      (más cerrado = mayor FTP)
```

Un choke más cerrado (menor %):
- ↑ FTP → ↑ Head requerida → el punto de operación se mueve a la **izquierda** en la curva.
- Puede ayudar a **salir de Upthrust**.
- Reduce la producción.

### 4.12 Nivel de Fluido en el Casing

- **Nivel estático (bomba apagada):** Determinado directamente por SBHP y SG del fluido.
  ```
  Nivel_estático (ft desde superficie) = 7000 - (SBHP × 2.309 / SG)
  ```
- **Nivel dinámico (bomba encendida):** Baja a medida que la bomba extrae fluido, determinado por el balance entre la tasa de producción y la IPR del pozo.
- Si el nivel baja lo suficiente, **gas entra en la bomba** → condición de pumpoff.

### 4.13 Check Valve (Válvula Anti-retorno)

- **Instalada:** Cuando la bomba se apaga, el fluido en el tubing NO vuelve a caer a través de la bomba. El nivel del tubing se mantiene y el casing sube más rápido.
- **No instalada:** El fluido vuelve a pasar por la bomba en reversa, los niveles se equilibran gradualmente.

### 4.14 Comportamiento del Trip (Apagado Automático)

**Trip por Overload (OL):**
- Si `Amps > OL` → la bomba se apaga. 
- Requiere reinicio manual.
- Al arranque hay un spike de corriente que el VFD ignora (inercia + inductancia).

**Trip por Underload (UL):**
- Si `Amps < UL` → la bomba se apaga.
- Se **reinicia automáticamente** después de un tiempo.
- Ciclos repetidos de apagado/encendido son dañinos para la ESP (estrés eléctrico, térmico y mecánico).

---

## 5. Casos de Estudio Preconfigurados

### 5.1 Problemas Comunes (con soluciones)

| Caso | Descripción | Solución |
|---|---|---|
| **Base Case** | Pozo normal produciendo ~2800 BLPD. ¿Se puede optimizar con restricciones? (< 90 Hz, < 130A, PIP > 1000psi, sin upthrust/downthrust) | HZ=83, Choke=82% → 3920 BLPD. Con rediseño de bomba (mayor catalog rate) → ~4800 BLPD |
| **Underload** | Ejemplo de trip por bajo amperaje | Bajar el valor de UL. Pero también diagnosticar la causa raíz |
| **Overload** | Trip por sobrecarga eléctrica | Subir OL pero sin exceder el máximo del sistema eléctrico |
| **Pumpoff** | Pozo con PI bajo que se seca. El nivel de casing baja, gas entra a la bomba, causa underload, se apaga y reinicia cíclicamente | Bajar HZ a ~55 → ~1400 BLPD estable. NO solo bajar UL |
| **Worn** | Desgaste del 35%. Produce solo 620 BLPD. Debería producir ~2800 sin desgaste | Poner Pump Wear a 0 para ver producción ideal |
| **Viscous** | Aceite viscoso degrada severamente la bomba | Reducir viscosidad a 1.0 → cabeza aumenta, tasa sube, BHP baja, motor se enfría |
| **Gassy** | Alto GLR con GVF excesivo en la bomba | Instalar separador (85% eficiencia) → +700 BLPD. Choke + HZ → ~3500 BLPD |
| **Gas Lock** | Gas excesivo bloquea la bomba, motor sobrecalienta | Apagar, bajar HZ a 56, reiniciar. Subir UL para cortar antes |

### 5.2 Desafíos Avanzados (sin soluciones publicadas)

| Caso | Descripción |
|---|---|
| **Redesign 1** | Pozo a 1010 BLPD. Maximizar con ajustes operativos. ¿Justifica un workover a $300K? |
| **Redesign 2** | Bajo SBHP y PI. Imposible evitar Downthrust. ¿Qué bomba elegirías? |
| **OPS 1** | Pozo con problemas graves. ¿Cuánto mejorar con ajustes de superficie? |
| **OPS 2** | Calibrar ESPtoy a datos reales (1800 BLPD, casing 5800ft, etc.) ajustando solo Pump Wear, SBHP y PI. Luego optimizar a 2800 BLPD |
| **OPS 3** | Bomba encendida pero no funciona. Sellos del wellhead goteando. Motor caliente. ¿Llamar al rig? |
| **OPS 4** | Pozo recién completado, casing lleno de salmuera hasta superficie. Verificar que todo funcione |
| **OPS 5** | Producción cayó de 3400 a 2400 BLPD con cambio en amperaje y niveles. ¿Qué cambió en el subsuelo? |

---

## 6. Constantes Fijas del Simulador Original

| Constante | Valor | Notas |
|---|---|---|
| Profundidad de la bomba | 7000 ft | Datum para todas las presiones |
| Voltaje del motor | 2500 V | Fijo, no ajustable |
| Temperatura estática del pozo (a 7000ft) | 163 °F | Línea base para cálculo de temperatura |
| Resolución por defecto | 1024 × 719 px | Redimensionable |
| Frecuencia base de catálogo | 50 Hz* | (*60 Hz en original USA, ajustado a 50 Hz para Argentina) |

---

## 7. PROMPT COMPLETO PARA GENERAR EL SIMULADOR CON IA

Copiar y pegar el siguiente bloque en una IA generativa de código (Claude, ChatGPT, Gemini, etc.):

---

```
Actúa como un Desarrollador Web Senior especializado en simulaciones físicas interactivas Y como un Ingeniero Petrolero con experiencia en Bombas Electrosumergibles (ESP).

REGLA CRÍTICA — ORIGINALIDAD:
El simulador que construyas es un producto ORIGINAL. NO debes mencionar, referenciar, ni incluir en NINGÚN lugar del código, comentarios, interfaz de usuario, metadatos, títulos, ni textos visibles la palabra "ESPtoy" ni el nombre "Burney Waring". Este es un desarrollo propio e independiente. Elegí un nombre propio para el simulador (por ejemplo "ESP Simulator", "SimESP", o similar) y usalo consistentemente.

Tu tarea es construir una **aplicación web de página única (SPA)** que funcione como un simulador educativo interactivo de un sistema de Bomba Electrosumergible (ESP) en un pozo petrolero.

===========================
ARQUITECTURA GENERAL
===========================
- Tecnología: HTML5 + CSS3 + JavaScript puro (vanilla). Un solo archivo index.html o bien separado en index.html + style.css + app.js.
- La simulación debe correr en un loop continuo a ~10-15 fps actualizando los cálculos y la visualización.
- La interfaz debe ser tipo SCADA/consola industrial: fondo oscuro (gris oscuro a negro), displays con texto verde brillante imitando LCD/7-segmentos, paneles con bordes metálicos.
- Debe ser responsive pero optimizada para pantalla completa de escritorio (~1200x800 px).

===========================
LAYOUT DE LA INTERFAZ
===========================

La pantalla se divide en estas zonas:

1. **PANEL VFD (superior-izquierdo):**
   - Botón circular de encendido/apagado (rojo cuando apagado, verde cuando encendido).
   - 3 botones: "HZ", "OL", "UL" que al hacer clic seleccionan qué parámetro controla el slider principal.
   - Display LCD: Muestra "XX HZ, YY.Y A" (frecuencia actual y amperaje).

2. **PRESIÓN EN SUPERFICIE (superior-centro):**
   - Display grande mostrando "FTP: XXXX psi" (Flowing Tubing Pressure).

3. **CHOKE Y MEDIDOR (superior-derecho):**
   - Display mostrando "Choke: XX%" con un slider o botón para ajustar.
   - Display mostrando "XXXX BPD" — medidor de producción en superficie (promedio móvil).

4. **VISUALIZACIÓN DEL POZO (centro):**
   - Representación esquemática tipo corte transversal del pozo.
   - Casing (columna exterior) y Tubing (columna interior) con niveles de fluido animados (color verde-azulado).
   - Escala de profundidad en el lado izquierdo (0 a 7000 ft).
   - Bomba ESP representada como un bloque rojo en la parte inferior (7000 ft).
   - Válvula check-valve como rectángulo gris encima de la bomba (clic para activar/desactivar).
   - El nivel de fluido en casing y tubing debe animarse suavemente en respuesta a los cambios de estado.

5. **AMMETER CHART (izquierda del pozo):**
   - Gráfico de series temporales que registra los últimos N segundos de:
     * Amperaje (línea azul oscura)
     * Temperatura del motor (línea cian)
     * BLPD (línea amarilla)
     * FTP (línea verde)
     * Presión de descarga (línea roja)
     * Presión de entrada (línea violeta)
     * GVF (línea negra/blanca)
   - Dos líneas horizontales punteadas rojas para OL y UL.

6. **CONTROLES DE PARÁMETROS (inferior-izquierda):**
   - 7 botones en fila: "Pump Wear", "Sep Eff", "SBHP", "PI", "GLR", "Visc", "Liq SG".
   - Al hacer clic en uno, se muestra su nombre y valor actual en un display, y el slider principal se vincula a ese parámetro.
   - Slider horizontal grande.

7. **CURVA DE BOMBA Y DATOS (derecha):**
   - Gráfico X-Y de curva de bomba:
     * Eje X = Rate (BLPD), Eje Y = Head (feet).
     * Curva azul = catálogo (60Hz, agua fresca, sin desgaste).
     * Curva roja = operación actual (ajustada por HZ, wear, visc, GVF, SG).
     * Dos puntos en la curva azul marcando los límites de zona eficiente.
     * Un punto/marcador mostrando el punto de operación actual.
   - Debajo del gráfico, panel de texto con valores calculados:
     * Power (BHP): XX HP
     * Pump rate (blpd): XXXX
     * Head (feet): XXXX
     * Pump Disch. (psi): XXXX
     * Pump Intake (psi): XXXX
     * Pump SG: X.XX
     * Motor Temp (F): XXX
     * GVF into pump (%): XX

8. **CONTROLES INFERIORES (inferior-derecha):**
   - Botón "Reset" para volver a valores base.
   - Selector de "Cases" (dropdown o botones izq/der) con los casos: Base Case, Underload, Overload, Pumpoff, Worn, Viscous, Gassy, Gas Lock, Redesign 1, Redesign 2, OPS 1-5.
   - Botón/slider de "Sim Speed" para controlar velocidad de simulación.

===========================
MOTOR FÍSICO / ECUACIONES
===========================
Implementar las siguientes ecuaciones ejecutadas en cada frame del loop de simulación:

**CONSTANTES DEL POZO:**
- Profundidad de la bomba: 7000 ft
- Voltaje del motor: 2500 V
- Temperatura estática del pozo: 163 °F
- Frecuencia base del catálogo: 50 Hz

**1. CURVA DE BOMBA (modelo parabólico):**
H_catalog(Q) = H_shutin × (1 - (Q / Q_max)²)
Donde H_shutin es la cabeza a flujo cero y Q_max es la tasa máxima (a cabeza cero).
Estos valores se controlan con "Catalog Head" y "Catalog Rate".
Valores por defecto sugeridos: H_shutin = 4500 ft, Q_max = 4000 BLPD.

**2. LEYES DE AFINIDAD:**
ratio = HZ_actual / HZ_base
Q_max_actual = Q_max_catalogo × ratio
H_shutin_actual = H_shutin_catalogo × ratio²
HP_actual = HP_base × ratio³

**3. DESGASTE:**
factor_wear = 1 - (PumpWear / 100)
Q se escala por factor_wear
H se escala por factor_wear²

**4. VISCOSIDAD (simplificado):**
Si visc > 1.0:
  C_Q = 1 - 0.05 × ln(visc)
  C_H = 1 - 0.04 × ln(visc)
  C_eff = 1 - 0.08 × ln(visc)
  (Limitar todos entre 0.3 y 1.0)
Q se escala por C_Q, H se escala por C_H, eficiencia se escala por C_eff.

**5. IPR DEL POZO:**
BLPD = PI × (SBHP - PIP)      donde PIP = Pump Intake Pressure
PIP = SBHP - BLPD / PI

El punto de operación es donde la curva de demanda del sistema (Head requerida) interseca la curva de la bomba (Head generada). Resolver iterativamente:
- Para una tasa Q dada, calcular PIP = SBHP - Q/PI
- Calcular Head_disponible de la curva de bomba para Q
- Calcular Head_requerida = columna_tubing + FTP_efecto - columna_casing
- Ajustar Q hasta que Head_disponible ≈ Head_requerida

**6. GVF:**
gas_libre = GLR × (1 - PIP / SBHP) × BLPD × (14.7 / PIP) × (1 - SepEff/100)
GVF = gas_libre / (gas_libre + BLPD)
Si GVF > 0.6 → condición de GAS LOCK (la bomba no puede generar cabeza suficiente).

**7. POTENCIA Y AMPERAJE:**
HP = (BLPD × Head × Pump_SG) / (136000 × eficiencia)
BHP = HP / 0.85 / 0.90 + cable_losses    (Power Factor ≈ 0.85, Motor Eff ≈ 0.90)
Amps = (BHP × 746) / (1.73 × 2500)

**8. TEMPERATURA DEL MOTOR:**
T_base = 163
cooling_factor = max(0.1, (1 - GVF) × (BLPD / 2000))
ΔT_interno = 50 × (BHP / BHP_diseño)^1.2
T_motor = T_base + ΔT_interno / cooling_factor
Si BLPD ≈ 0 o gas lock: T_motor escala rápidamente (hasta 400+ °F = peligro).

**9. NIVELES DE FLUIDO (animación):**
nivel_casing = 7000 - (PIP × 2.309 / Liq_SG)     (en ft desde superficie)
nivel_tubing = 7000 - (PDP × 2.309 / Pump_SG_tubing)   (PDP = Pump Discharge Pressure)
Transicionar suavemente con lerp: nivel = nivel_prev + (nivel_target - nivel_prev) × 0.05

**10. TRIPS:**
Si Amps > OL por más de 2s simulados → TRIP OVERLOAD (apagar bomba, requiere clic manual para reiniciar).
Si Amps < UL por más de 2s simulados → TRIP UNDERLOAD (apagar bomba, reinicio automático tras ~10s simulados).
Al arrancar la bomba, hay un spike de corriente de ~1.5s que se ignora para el chequeo de trip.

**11. CHOKE:**
FTP_base = 50 psi (contrapresión fija del flowline)
FTP_choke = FTP_base + (1 - Choke/100)² × K × BLPD²    (K es una constante de orificio)
Esto incrementa la Head_requerida.

**12. CHECK VALVE:**
Cuando la bomba se apaga:
  - CON check valve: El nivel del tubing se mantiene, no hay flujo inverso.
  - SIN check valve: Los niveles se equilibran lentamente (fluido cae por gravedad a través de la bomba).

===========================
CASOS PRECONFIGURADOS
===========================
Implementar un objeto/diccionario con al menos estos casos:

BaseCase:     { HZ: 60, OL: 130, UL: 10, PumpWear: 0, SepEff: 0, SBHP: 2700, PI: 3.0, GLR: 200, Visc: 1.0, LiqSG: 0.95, Choke: 100 }
Underload:    { HZ: 60, OL: 130, UL: 25, ... ajustar para que cause trip por UL }
Overload:     { HZ: 80, OL: 100, ... ajustar para que cause trip por OL }
Pumpoff:      { HZ: 70, PI: 0.8, SBHP: 1800, ... ajustar para que se seque el pozo }
Worn:         { PumpWear: 35, ... resto similar a base }
Viscous:      { Visc: 30, ... resto similar a base }
Gassy:        { GLR: 600, SepEff: 0, ... }
GasLock:      { GLR: 800, SepEff: 0, HZ: 70, ... ajustar para provocar gas lock }
(Agrega Redesign1, Redesign2, OPS1-5 con variaciones similares)

===========================
ESTILO VISUAL
===========================
- Fondo general: gris oscuro (#1a1a1a a #2d2d2d) con textura sutil de metal.
- Paneles: bordes biselados estilo industrial (#555 a #888).
- Displays LCD: fondo negro (#0a0a0a) con texto verde brillante (#00ff41) en fuente monospace.
- Botones: estilo raised metálico gris, hover con highlight, active con efecto presionado.
- Bomba: bloque rojo (#cc0000).
- Fluidos: degradado verde-azulado (#006644 a #00aa66) con sutil animación de ondas.
- Gráficos: fondo blanco con cuadrícula gris claro, curvas de 2px de grosor.
- Alertas de TRIP: flash rojo parpadeante sobre el display de la zona VFD.
- Micro-animaciones en transiciones de valores numéricos.

===========================
REQUISITOS ADICIONALES
===========================
1. No usar frameworks externos. Solo HTML/CSS/JS vanilla.
2. Los gráficos pueden dibujarse con Canvas 2D.
3. Todo el estado de la simulación debe estar en un objeto global `simState`.
4. Código bien comentado en español.
5. El simulador debe ser funcional al abrir el archivo HTML en el navegador.
6. **PROHIBIDO:** No incluir en NINGUNA parte del código fuente, comentarios, HTML, títulos de página, meta tags, textos de interfaz, consola, ni en ningún otro lugar visible o invisible las palabras "ESPtoy" o "Burney Waring". Este es un desarrollo original e independiente.

Entrega el código completo.
```

---

## 8. Referencias Técnicas

- **ESPtoy v1.0** — Burney Waring, Copyright 2018. Software educativo, uso no comercial. http://waringworld.com/esptoy/
- **Centrilift Submersible Pump Handbook** (4ta y 10ma edición) — Baker Hughes.
- **ANSI/HI 9.6.7** — Hydraulic Institute. Guideline for Effects of Liquid Viscosity on Performance.
- **Affinity Laws** — https://en.wikipedia.org/wiki/Affinity_laws
- **ESP Design Hand Calculations** — https://production-technology.org/esp-design-hand-calculations
- **Libro**: *Practical Optimization of Petroleum Production Systems* — Burney Waring (Amazon).
