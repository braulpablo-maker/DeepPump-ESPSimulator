/**
 * DeepPump ESP Simulator — Constantes de Configuración
 * Constantes fijas del pozo, bomba, motor y simulación.
 * Todos los valores se documentan con sus unidades.
 */

const CONFIG = {
    // === Pozo ===
    PUMP_DEPTH: 7000,            // ft — profundidad de la bomba (datum)
    MOTOR_VOLTAGE: 2500,         // V — voltaje fijo del motor ESP
    STATIC_TEMP: 163,            // °F — temperatura estática del pozo a profundidad de bomba
    BASE_FREQ: 50,               // Hz — frecuencia base del catálogo de bomba

    // === Catálogo de bomba (valores a BASE_FREQ Hz) ===
    DEFAULT_CATALOG_HEAD: 3200,  // ft — cabeza a flujo cero (H_shutin)
    DEFAULT_CATALOG_RATE: 3800,  // BLPD — tasa máxima (a cabeza cero, Q_max)

    // === Constantes hidráulicas ===
    PSI_TO_FT_WATER: 2.309,     // factor conversión: 1 psi = 2.309 ft de columna de agua (SG=1)
    FTP_BASE: 50,                // psi — contrapresión mínima del flowline (backpressure)
    CHOKE_K: 70,                 // constante del orificio del choke — ΔP [psi] = K × ((100/pct)²−1) × (Q/Qref)²

    // === Motor y sistema eléctrico ===
    POWER_FACTOR: 0.85,          // factor de potencia del motor eléctrico
    MOTOR_EFF: 0.90,             // eficiencia del motor eléctrico
    CABLE_LOSSES: 5,             // HP — pérdidas estimadas en cables de potencia
    PUMP_EFF_MAX: 0.55,          // eficiencia máxima de la bomba en el BEP (Best Efficiency Point)

    // === Temperatura del motor ===
    DELTA_T_FULL_LOAD: 50,       // °F — incremento de temperatura a plena carga de diseño

    // === Simulación y animación ===
    LERP_FACTOR: 0.05,           // factor de interpolación lineal para animación de niveles
    SMOOTH_FACTOR: 0.15,         // factor de suavizado para transiciones de valores calculados
    TEMP_SMOOTH_FACTOR: 0.05,    // factor de suavizado para temperatura (más lento)
    HISTORY_MAX_POINTS: 300,     // puntos máximos en historial del ammeter chart
    STARTUP_IGNORE_TIME: 1.5,    // s — tiempo para ignorar spike de corriente al arranque
    TRIP_DELAY: 2.0,             // s — tiempo de condición sostenida antes de activar trip
    UL_RESTART_DELAY: 10.0,      // s — tiempo de espera para reinicio automático por Underload
    STARTUP_SPIKE_FACTOR: 3.0,   // multiplicador de corriente durante spike de arranque

    // === Zona eficiente de la bomba (fracción de Q_max) ===
    EFFICIENT_ZONE_LOW: 0.25,    // límite inferior — debajo = zona Downthrust
    EFFICIENT_ZONE_HIGH: 0.75,   // límite superior — encima = zona Upthrust

    // === Gas ===
    GAS_LOCK_THRESHOLD: 0.60,    // GVF > 60% = condición de Gas Lock

    // === Rangos de parámetros para sliders ===
    RANGES: {
        hz:          { min: 0,    max: 90,   step: 1,    default: 60,   label: 'HZ',        unit: 'Hz'    },
        ol:          { min: 0,    max: 200,  step: 1,    default: 130,  label: 'OL',        unit: 'A'     },
        ul:          { min: 0,    max: 200,  step: 1,    default: 10,   label: 'UL',        unit: 'A'     },
        pumpWear:    { min: 0,    max: 100,  step: 1,    default: 0,    label: 'Pump Wear', unit: '%'     },
        sepEff:      { min: 0,    max: 90,   step: 1,    default: 0,    label: 'Sep Eff',   unit: '%'     },
        sbhp:        { min: 0,    max: 5000, step: 10,   default: 2700, label: 'SBHP',      unit: 'psi'   },
        pi:          { min: 0,    max: 20,   step: 0.05, default: 3.0,  label: 'PI',        unit: 'BLPD/psi' },
        glr:         { min: 0,    max: 5000, step: 25,   default: 200,  label: 'GLR',       unit: 'scf/bbl'  },
        visc:        { min: 0.5,  max: 100,  step: 0.5,  default: 1.0,  label: 'Visc',      unit: 'cp'    },
        liqSG:       { min: 0.6,  max: 1.2,  step: 0.01, default: 0.95, label: 'Liq SG',    unit: ''      },
        choke:       { min: 0,    max: 100,  step: 1,    default: 100,  label: 'Choke',     unit: '%'     },
        catalogHead: { min: 1000, max: 8000, step: 100,  default: 3200, label: 'Cat. Head', unit: 'ft'    },
        catalogRate: { min: 1000, max: 8000, step: 100,  default: 3800, label: 'Cat. Rate', unit: 'BLPD'  },
        simSpeed:    { min: 0,    max: 5,    step: 0.1,  default: 1.0,  label: 'Sim Speed', unit: 'x'     }
    }
};
