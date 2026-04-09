/**
 * DeepPump ESP Simulator — Casos de Estudio Preconfigurados
 * Cada caso define los valores de los parámetros del simulador
 * para reproducir distintas condiciones operativas de un sistema ESP.
 * 
 * Los valores de catalogHead y catalogRate son referidos a la frecuencia
 * base (CONFIG.BASE_FREQ = 50 Hz).
 */

const CASES = {
    'Base Case': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Pozo normal produciendo ~2800 BLPD. ¿Se puede optimizar con restricciones operativas?'
    },

    'Underload': {
        hz: 60, ol: 130, ul: 25,
        pumpWear: 0, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Trip por bajo amperaje (UL demasiado alto). Diagnosticar la causa raíz.'
    },

    'Overload': {
        hz: 80, ol: 100, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Trip por sobrecarga eléctrica. Alta frecuencia supera el límite OL.'
    },

    'Pumpoff': {
        hz: 70, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 1800,
        pi: 0.8, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Pozo con PI bajo — se seca, gas entra a la bomba, causa ciclos de UL.'
    },

    'Worn': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 35, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Bomba con 35% de desgaste. Producción severamente reducida.'
    },

    'Viscous': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 200, visc: 30, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Aceite viscoso (30 cp) degrada severamente el desempeño de la bomba.'
    },

    'Gassy': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 600, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Alto GLR con GVF excesivo en la bomba. ¿Instalar separador de gas?'
    },

    'Gas Lock': {
        hz: 70, ol: 200, ul: 5,
        pumpWear: 0, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 800, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Gas excesivo bloquea la bomba. Motor sobrecalienta peligrosamente.'
    },

    'Redesign 1': {
        hz: 55, ol: 130, ul: 10,
        pumpWear: 10, sepEff: 0, sbhp: 2200,
        pi: 1.2, glr: 300, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Pozo a ~1000 BLPD. Maximizar con ajustes. ¿Justifica workover de $300K?'
    },

    'Redesign 2': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 1500,
        pi: 0.6, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Bajo SBHP y PI. Imposible evitar Downthrust. ¿Qué bomba elegirías?'
    },

    'OPS 1': {
        hz: 49, ol: 130, ul: 10,
        pumpWear: 20, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 500, visc: 5, liqSG: 0.97,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Múltiples problemas combinados. ¿Cuánto mejorar solo con ajustes de superficie?'
    },

    'OPS 2': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 15, sepEff: 0, sbhp: 2400,
        pi: 2.0, glr: 250, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Calibrar simulador a datos reales (1800 BLPD). Luego optimizar a 2800 BLPD.'
    },

    'OPS 3': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 5, sepEff: 0, sbhp: 2700,
        pi: 3.0, glr: 200, visc: 1.0, liqSG: 0.95,
        choke: 5,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Bomba encendida pero no funciona. Sellos del wellhead goteando. Motor caliente.'
    },

    'OPS 4': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 3500,
        pi: 3.0, glr: 0, visc: 1.0, liqSG: 1.07,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Pozo recién completado, casing lleno de salmuera hasta superficie.'
    },

    'OPS 5': {
        hz: 60, ol: 130, ul: 10,
        pumpWear: 0, sepEff: 0, sbhp: 2200,
        pi: 2.0, glr: 350, visc: 1.0, liqSG: 0.95,
        choke: 100,
        catalogHead: 3200, catalogRate: 3800,
        description: 'Producción cayó de 3400 a 2400 BLPD. ¿Qué cambió en el subsuelo?'
    }
};

// Lista ordenada de nombres de casos para navegación con botones prev/next
const CASE_NAMES = Object.keys(CASES);
