# Registro de Desarrollo: DeepPump ESP Simulator

Este documento detalla el proceso constructivo del simulador **DeepPump**, las dificultades técnicas de ingeniería y programación encontradas, así como las decisiones de diseño adoptadas para culminar en un producto educativo funcional, preciso e industrialmente satisfactorio.

---

## 1. Implementación Básica y Reconstrucción
El objetivo inicial fue portar y mejorar las especificaciones del antiguo sistema "ESPtoy" hacia una plataforma web moderna, utilizando estrictamente HTML5, CSS3 y Vanilla JavaScript sin librerías externas (como Chart.js o React), priorizando el rendimiento a 60 FPS y un tamaño pequeño de archivo.

### Decisión de Arquitectura
Se estructuró el código bajo el patrón de **Módulos Objeto-Literal** para mantener la simplicidad y el encapsulamiento sin depender de un `build step` (Webpack/Vite). Se crearon submódulos como `Physics`, `SimEngine` y los renderizadores de Canvas (`WellRenderer`, `ChartRenderer`).

---

## 2. Dificultades Físicas y de Simulación

Al implementar las ecuaciones para representar el comportamiento físico fluido, de la bomba electrosumergible (ESP) y el VFD, surgieron desafíos matemáticos importantes:

### Dificultad: Inestabilidad del Choke
Al principio, el estrangulador (choke) carecía de sensibilidad. Al cambiar su apertura, la presión de tubing fluyente (FTP) apenas respondía operativamente, quitándole valor pedagógico al estrangulamiento.
**Solución adoptada**: Implementar una ecuación simplificada de *orificio inverso* cuadrática:
`FTP_choke = ((100/pct)² - 1) × CHOKE_K × (Q / Q_ref)²`
Y se ajustó exhaustivamente el valor del coeficiente empírico `CHOKE_K` (llevándolo de valores iniciales mínimos a `70`) para que a 20% de choke, la presión superase notablemente los 1000 psi forzando una reducción de caudal visible en la curva.

### Dificultad: Inestabilidad Matemática en el "Sim Speed" (Acelerador de tiempo)
El usuario solicitó un multiplicador de velocidad. Originalmente, el simulador multiplicaba linealmente las tasas de cambio de presión según el incremento del `dt`. Esto provocó un colapso matemático al acelerar el simulador a 5x, pues las presiones de casing y tubing tenían oscilaciones bruscas que "rompían" la física.
**Solución adoptada**: Se refactorizó la actualización temporal (`Physics.updateState`) implementando un enfoque de decaimiento pseudo-exponencial `1 - Math.exp(-rate * dt)`. De esta forma, sin importar qué tan grande fuera el paso computacional (dt), la inercia del fluido y presión convergía asintomáticamente limitando la inestabilidad.

---

## 3. UI/UX: Modificación del "Ammeter Chart" (Sistema SCADA)

Uno de los procesos más iterativos fue el diseño del panel gráfico (Ammeter Chart):

### Dificultad: Amontonamiento de curvas en escala universal
Originalmente, el gráfico ploteaba 7 variables (Amperaje, Presiones, Temperaturas, Caudales, Fracciones de Gas) dentro de una única ventana usando un `maxVal` global. Dado que el caudal (`BLPD`) podía medir 3000 unidades y el amperaje (`AMP`) escasos 50 amperes, el amperaje se volvía una línea recta en el fondo invisible, destruyendo la legibilidad fundamental del gráfico cuyo nombre era *Ammeter* Chart (Amperímetro).

**Fase 1 de Solución: El Eje Y Doble (El Experimento)**
Se intentó codificar un gráfico complejo con Eje Y izquierdo exclusivo para los amperes (0-164 A) y un Eje Y derecho (0-100%) donde las demás variables se graficaban de manera normalizada y superpuesta (eliminando de paso GVF y PDP a petición expresa para reducir el ruido).  
*Resultado*: Cumplía con la visibilidad, pero la sobre-simplificación normalizada perdió los clásicos tooltips HTML en la inferior, reduciendo la claridad visual para quien no es experto. El diseño final "no gustó".

**Decisión Final Revertida: Diseño de 3 Paneles Apilados ("Strip-Logs")**
Atendiendo al "paso atrás" deliberado sugerido para asegurar legibilidad, se decidió **separar físicamente la interfaz en tres `Canvas` independientes** agrupados bajo el mismo layout vertical de la izquierda. 
1. **Gráfico 1**: Reservado explícitamente para Amperaje, OL, UL.
2. **Gráfico 2**: Nodos de operación relacionados a temperatura y volumen (BLPD, MWT).
3. **Gráfico 3**: Dinámicas de tubería (FTP, PIP).
*Resultado*: Cada gráfico posee de manera interna su propia capacidad de auto-escala purista, se recupera el legendado en formato `<div data-tooltip>`, logrando el equilibrio óptimo entre el requerimiento SCADA y la retención pedagógica.

> **Bug crítico superado:** Durante la separación estructural, se eliminó el antiguo `#ammeter-chart` de la vista HTML. Sin embargo, un `addEventListener('click')` obsoleto en el archivo de `js/controls.js` provocaba un `TypeError property is null` que paralizaba fatalmente el `requestAnimationFrame`, dejando el 100% de la aplicación en negro. Requirió rastreo del objeto global DOM y la inyección temporal de un visualizador de errores `window.onerror` durante su diagnóstico y parcheo exitoso.

---

## 4. Decisiones Estéticas, Controles y Parametrización
A lo largo de todas las peticiones, se ampliaron drásticamente las tolerancias operativas para admitir escenarios verdaderamente extremos que sirvieran para certificaciones y estudio:
- Rango de `SBHP` expandido hasta `5000 psi`.
- Rango de `PI` tolerado hasta `20`.
- Rango expandido para correlaciones de alto Gas Libre (`GLR` a `5000`).
- Rangos de desgaste y eficiencia del separador manipulables dinámicamente (`0` a `100%`).
- Soporte dinámico para pantallas de laptop y mouse events complejos sobre los canvas (por ej. manipulación y drag de la propia Curva Catalogada).

## Resumen Final
El simulador DeepPump actual es el resultado de un ciclo virtuoso de iteración rápida: priorizar la matemática estable, trasladar el feedback visual SCADA al DOM y Canvas puros e invertir las refactorizaciones que restaban legibilidad educativa apostando siempre la claridad. El producto resulta en una herramienta ágil, físicamente verificable y exenta de pesados entornos de ejecución modernos.
