# DeepPump ESP Simulator

**Simulador educativo interactivo de Bombas Electrosumergibles (ESP) para pozos petroleros.**

Aplicación web standalone (HTML + CSS + JavaScript puro, sin dependencias externas) con interfaz estilo SCADA/industrial, motor físico completo, y 15 escenarios preconfigurados para el estudio del comportamiento de sistemas ESP bajo distintas condiciones de reservorio, bomba y operación.

---

## Captura de pantalla

> *Ejecutar localmente para ver la interfaz completa (ver instrucciones abajo).*

La interfaz reproduce el look de una consola de control de campo SCADA con:
- Displays LCD de texto verde
- Paneles metálicos biselados
- Gráficos de series temporales en tiempo real
- Visualización animada del pozo con fluidos
- Curva de bomba Head vs Rate con múltiples curvas simultáneas

---

## Características

### Motor físico
- **Curva de bomba** — modelo parabólico `H(Q) = H_si × (1 - (Q/Q_max)²)`
- **Leyes de afinidad** — escalado de caudal (lineal) y cabeza (cuadrática) según frecuencia del VFD
- **Desgaste** — reduce Q y H cuadráticamente; emula bomba erosionada
- **Viscosidad** — corrección ANSI/HI 9.6.7 simplificada para fluidos viscosos
- **IPR lineal** — `BLPD = PI × (SBHP − PIP)`
- **GVF** — cálculo de gas libre a presión de entrada con conversión a volumen real
- **Potencia y amperaje** — `Amps = (BHP × 746) / (√3 × V)`, con factor de potencia y eficiencia del motor
- **Temperatura del motor** — función del caudal, GVF (gas no enfría) y carga relativa al BEP
- **Punto de operación** — resolución por bisección (30 iteraciones) del equilibrio bomba–sistema
- **Niveles de fluido** — columnas hidrostáticas del casing y el tubing actualizadas en tiempo real

### Interfaz
| Panel | Contenido |
|---|---|
| **VFD** | Botón de encendido, setpoints OL/UL, display Hz/Amp, slider de frecuencia |
| **FTP** | Presión fluyente en superficie (psi) |
| **Choke/BPD** | Apertura del choke (%) y caudal en superficie (BPD promedio) |
| **Ammeter Chart** | Historial de 5 variables divididas en 3 paneles: Amperaje (AMP, OL, UL), Prod/Temp (MWT, BLPD) y Presiones (FTP, PIP) |
| **Parámetros** | Sliders para: Pump Wear, Sep Eff, SBHP, PI, GLR, Visc, Liq SG |
| **Pozo** | Animación 2D: casing, tubing, fluidos, bomba ESP, check-valve |
| **Curva de bomba** | 4 curvas: catálogo base (50 Hz), ajustada al Hz actual, operación real, curva del sistema |
| **Datos calculados** | BHP, BLPD, Head, PDP, PIP, Pump SG, Motor Temp, GVF |
| **Casos** | Navegación entre 15 escenarios preconfigurados |
| **Velocidad** | Multiplicador de velocidad de simulación (0–5×) |

### Sistema de alarmas
- **Trip OL** (Overload): si Amps > setpoint OL durante 2 s → trip, reinicio manual
- **Trip UL** (Underload): si Amps < setpoint UL durante 2 s → trip, reinicio automático en 10 s (simula pumpoff)
- **Gas Lock**: GVF > 60 % → la bomba pierde capacidad, indicador naranja en el panel y en la bomba
- **Motor Temp**: advertencia (amarillo) > 300 °F, crítico (rojo parpadeante) > 400 °F
- **GVF**: advertencia (amarillo) > 40 %, crítico (rojo) > 60 %
- **Flash del display VFD** durante cualquier trip

### Visualización del pozo
- Color del fluido varía con el GVF (verde oscuro = líquido, verde más claro/grisáceo = con gas)
- Nivel del casing sube/baja según PIP y SG del reservorio
- Nivel del tubing sube/baja según PDP y mezcla gas–líquido
- Ondas animadas en la superficie de los fluidos
- Bomba muestra "GAS LOCK" cuando el GVF supera el umbral
- Check-valve cliqueable: activa/desactiva el reflujo al apagar

### Tooltips pedagógicos
Todos los controles, displays, botones y labels tienen tooltips que explican el concepto, unidades, rango, y efecto físico de cada parámetro al pasar el mouse.

---

## Escenarios preconfigurados (15 casos)

| # | Caso | Condición simulada |
|---|---|---|
| 1 | Base Case | Operación normal de referencia |
| 2 | Low OL Trip | OL bajo → trip por sobrecarga |
| 3 | Pumpoff (UL) | Nivel cae → underload → trip/reinicio |
| 4 | High Pump Wear | Bomba muy desgastada (70%) |
| 5 | High Viscosity | Petróleo viscoso (50 cp) |
| 6 | Low PI | Reservorio de baja productividad |
| 7 | High GLR | Alto gas libre → GVF elevado |
| 8 | Gas Lock | GVF > 60 % → gas lock |
| 9 | Choke Restricted | Choke parcialmente cerrado |
| 10 | Low Freq (VFD) | Operación a baja frecuencia (35 Hz) |
| 11 | High Freq | Operación a alta frecuencia (75 Hz) |
| 12 | Gas Separator | Separador de gas activado (80%) |
| 13 | Check Valve | Check-valve instalada, efecto al parar |
| 14 | Worn + Gassy | Bomba desgastada con gas libre |
| 15 | Redesign | Bomba sobredimensionada (alta cabeza) |

---

## Estructura de archivos

```
ESPSIM/
├── index.html              # Layout principal (3 columnas + header/footer)
├── css/
│   └── style.css           # Estilos SCADA/industrial (design tokens, animaciones)
└── js/
    ├── constants.js        # Constantes físicas y rangos de sliders
    ├── cases.js            # 15 escenarios preconfigurados (parámetros)
    ├── physics.js          # Motor físico: 12 funciones puras de cálculo
    ├── state.js            # Estado global (simState) + SimEngine (game logic)
    ├── wellCanvas.js       # Renderer Canvas 2D del pozo animado
    ├── chartCanvas.js      # Renderer Canvas 2D del Ammeter Chart
    ├── pumpCurve.js        # Renderer Canvas 2D de la curva de bomba
    ├── controls.js         # Event handlers, tooltip engine, displays
    └── app.js              # Entry point, game loop a 60 fps
```

---

## Instalación y ejecución

El simulador es una aplicación web estática. No requiere Node.js, npm, ni ninguna dependencia externa. Solo un servidor HTTP local para evitar restricciones CORS de `file://`.

### Opción 1 — Python (recomendado)

```bash
cd ruta/a/ESPSIM
python -m http.server 8080
```

Abrir en el navegador: **http://localhost:8080**

### Opción 2 — Node.js

```bash
npx serve .
```

### Opción 3 — VS Code

Instalar la extensión **Live Server** y hacer clic en *"Open with Live Server"* sobre `index.html`.

### Opción 4 — Abrir directo (sin servidor)

Algunos navegadores permiten abrir `index.html` directamente desde el sistema de archivos con doble clic, siempre que las fuentes de Google Fonts estén disponibles (o se trate de una red local con acceso a internet).

> **Nota**: Chrome bloquea carga de scripts locales desde `file://` por políticas CORS. Si el simulador aparece en blanco, usar uno de los métodos con servidor arriba.

---

## Uso rápido

### Encender la bomba
1. Hacer clic en el botón circular (rojo = apagado, verde = encendido)
2. Esperar ~3 segundos para que la física se estabilice
3. Observar los valores en el panel de datos y en el gráfico de curva de bomba

### Explorar parámetros
- Seleccionar un parámetro en los botones del panel izquierdo inferior (Pump Wear, PI, GLR, etc.)
- Mover el slider para cambiar el valor
- Los efectos son inmediatos y visibles en todos los gráficos y displays

### Cambiar casos
- Usar los botones **◄** y **►** en la barra inferior para navegar entre los 15 escenarios
- Cada caso carga un conjunto completo de parámetros preconfigurados
- El botón **Reset** vuelve siempre al Base Case

### Interacciones especiales
| Elemento | Acción | Efecto |
|---|---|---|
| Check-Valve (CV) | Click sobre el rectángulo CV en el pozo | Activa/desactiva la válvula anti-retorno |
| Handles del gráfico | Arrastrar los cuadraditos en los extremos de los ejes | Cambia `CatalogHead` y `CatalogRate` de la bomba |
| Tooltips | Pasar el mouse sobre cualquier elemento | Muestra descripción técnica del parámetro |

---

## Parámetros de configuración

Todos los parámetros físicos del simulador están centralizados en `js/constants.js` para facilitar la calibración:

| Constante | Valor por defecto | Descripción |
|---|---|---|
| `PUMP_DEPTH` | 7000 ft | Profundidad de la bomba (datum) |
| `MOTOR_VOLTAGE` | 2500 V | Voltaje del motor ESP |
| `STATIC_TEMP` | 163 °F | Temperatura estática del yacimiento |
| `BASE_FREQ` | 50 Hz | Frecuencia base del catálogo de bomba |
| `DEFAULT_CATALOG_HEAD` | 3200 ft | Cabeza de cierre (shutin head) del catálogo |
| `DEFAULT_CATALOG_RATE` | 3800 BLPD | Tasa máxima del catálogo (cabeza cero) |
| `PUMP_EFF_MAX` | 55 % | Eficiencia máxima en el BEP |
| `GAS_LOCK_THRESHOLD` | 60 % GVF | GVF a partir del cual se activa gas lock |
| `TRIP_DELAY` | 2.0 s | Tiempo sostenido antes de activar un trip |
| `UL_RESTART_DELAY` | 10.0 s | Espera antes del reinicio automático por UL |

---

## Tecnología

- **HTML5** — estructura semántica, sin frameworks
- **CSS3** — variables custom, grid layout, keyframe animations, glassmorphism
- **JavaScript ES6+** — módulos objeto-literal, Canvas 2D API, `requestAnimationFrame`
- **Google Fonts** — [Inter](https://fonts.google.com/specimen/Inter) + [Share Tech Mono](https://fonts.google.com/specimen/Share+Tech+Mono)
- **Sin dependencias externas** — cero npm, cero bundler, cero build step

---

## Créditos y propósito

**DeepPump ESP Simulator** es una herramienta educativa original desarrollada para el estudio del comportamiento de Bombas Electrosumergibles en pozos petroleros.

Diseñada para ingenieros de producción, estudiantes de ingeniería petrolera, y operadores de campo que deseen comprender de forma visual e interactiva los fundamentos del levantamiento artificial por ESP, incluyendo:

- Selección de bomba (catálogo, leyes de afinidad)
- Diagnóstico de problemas operativos (desgaste, gas lock, pumpoff)
- Efecto de parámetros de reservorio (PI, SBHP, GLR, viscosidad)
- Protección del sistema (OL/UL, temperatura del motor)

---

## Licencia

Proyecto educativo de uso libre. Todos los derechos del código pertenecen a sus autores.
