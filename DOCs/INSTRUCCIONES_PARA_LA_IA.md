# Instrucciones: Cómo usar el archivo de especificaciones con una IA

## Prompt para darle a la IA

Copiá y pegá exactamente el siguiente texto como tu primer mensaje a la IA (Claude, ChatGPT, Gemini, etc.):

---

```
Te voy a adjuntar un archivo llamado "ESPtoy_Simulator_Specs_and_Prompt.md". 
Este archivo contiene la documentación técnica completa de un simulador de Bombas 
Electrosumergibles (ESP) para pozos petroleros, incluyendo todas las ecuaciones, 
la descripción del layout de interfaz, los casos de estudio, y un PROMPT detallado 
en la Sección 7.

Necesito que hagas lo siguiente en este orden:

FASE 1 — PLAN:
1. Leé todo el documento completo.
2. Extraé el prompt de la Sección 7 y usalo como tu especificación técnica principal.
3. Antes de escribir código, generá un plan de implementación con:
   - Estructura de archivos propuesta (index.html, style.css, app.js o similar).
   - Lista de módulos/funciones principales que vas a crear.
   - Orden de implementación sugerido.
4. Presentame el plan para que lo revise antes de avanzar.

FASE 2 — DESARROLLO:
5. Una vez que apruebe el plan, desarrollá el código completo siguiendo 
   estrictamente las especificaciones del prompt de la Sección 7.
6. Priorizá que el simulador sea funcional: que los cálculos físicos funcionen 
   correctamente y que la interfaz responda a los controles.
7. Entregá el código en archivos separados y bien comentados en español.

REGLAS IMPORTANTES:
- Este es un desarrollo ORIGINAL. En NINGÚN lugar del código, interfaz, comentarios 
  o metadatos debe aparecer la palabra "ESPtoy" ni "Burney Waring".
- Elegí un nombre propio para el simulador (ej: "SimESP", "ESP Simulator Pro", etc.).
- No uses frameworks externos, solo HTML/CSS/JS vanilla.
- Los gráficos deben usar Canvas 2D.
```

---

## Después del primer mensaje

Una vez que la IA te presente el **plan**, revisalo y respondé con:

```
El plan se ve bien. Procedé con la FASE 2, desarrollá el código completo.
```

O si querés modificar algo:

```
Antes de avanzar, hacé estos cambios al plan: [describí tus cambios].
```

## Si la IA te entrega el código incompleto

A veces las IAs cortan el código por ser muy largo. En ese caso respondé:

```
El código quedó incompleto. Continuá exactamente desde donde cortaste, 
sin repetir lo que ya entregaste.
```

## Si querés iterar sobre el diseño visual

```
El simulador funciona pero quiero mejorar el diseño visual. 
Hacé estos cambios: [describí qué querés cambiar].
```

## Si querés agregar un caso de estudio nuevo

```
Agregá un nuevo caso preconfigurado llamado "[nombre]" con estos valores:
HZ: XX, SBHP: XXXX, PI: X.X, GLR: XXX, Visc: X.X, LiqSG: X.XX, 
PumpWear: XX, SepEff: XX, Choke: XX, OL: XXX, UL: XX.
Descripción del problema: [tu texto].
```
