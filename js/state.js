/**
 * DeepPump ESP Simulator — Estado Global y Lógica de Simulación
 * Maneja el objeto simState (estado mutable), trips, actualizaciones
 * frame a frame, y carga de casos preconfigurados.
 */

// =========================================================================
// ESTADO GLOBAL DE LA SIMULACIÓN
// =========================================================================

const simState = {
    // --- Estado de la bomba ---
    running: false,          // Bomba encendida/apagada
    tripped: false,          // Trip activo
    tripType: null,          // 'OL' | 'UL' | null
    tripTimer: 0,            // Acumulador de tiempo en condición de trip (s)
    ulRestartTimer: 0,       // Timer para reinicio automático por UL (s)
    startupTimer: 0,         // Timer para ignorar spike de arranque (s)
    gasLocked: false,        // Condición de gas lock activa

    // --- Parámetros de entrada (controlados por sliders/botones) ---
    hz: 60, ol: 130, ul: 10,
    pumpWear: 0, sepEff: 0, sbhp: 2700,
    pi: 3.0, glr: 200, visc: 1.0, liqSG: 0.95,
    choke: 100,
    catalogHead: 3200, catalogRate: 3800,
    checkValve: false,

    // --- Variables calculadas (actualizadas cada frame) ---
    blpd: 0, head: 0, pip: 2700, pdp: 0,
    ftp: 50, gvf: 0, hp: 0, bhp: 0,
    amps: 0, motorTemp: 163, pumpSG: 0.95,
    efficiency: 0,
    Hsi_final: 0, Qmax_final: 0, bhpDesign: 100,

    // --- Niveles de fluido (actuales y objetivos para lerp) ---
    casingLevel: 500,        // ft desde superficie (actual, interpolado)
    tubingLevel: 7000,       // ft desde superficie (actual, interpolado)
    casingLevelTarget: 500,  // ft desde superficie (objetivo)
    tubingLevelTarget: 7000, // ft desde superficie (objetivo)

    // --- Historial para Ammeter Chart ---
    history: {
        amps: [], hz: [], motorTemp: [], blpd: [],
        ftp: [], pdp: [], pip: [], gvf: []
    },

    // --- Control de simulación ---
    simSpeed: 1.0,           // Multiplicador de velocidad
    simTime: 0,              // Tiempo simulado acumulado (s)
    selectedParam: 'pumpWear', // Parámetro activo en el slider de parámetros
    selectedVFDParam: 'hz',    // Parámetro activo en el slider del VFD
    currentCaseIndex: 0,
    currentCase: 'Base Case',
    avgBPD: 0,               // Promedio móvil para display de superficie
    bpdAccum: 0,             // Acumulador para promedio
    bpdCount: 0,             // Contador para promedio

    // --- Ammeter chart ---
    chartMultiCurve: true    // true=todas las curvas, false=solo amps
};


// =========================================================================
// MOTOR DE SIMULACIÓN
// =========================================================================

const SimEngine = {

    /**
     * Actualiza un frame de la simulación.
     * Se llama desde el game loop con dt ya multiplicado por simSpeed.
     * @param {number} dt - Delta time en segundos simulados
     */
    update(dt) {
        if (dt <= 0) return;
        simState.simTime += dt;

        if (simState.running && !simState.tripped) {
            this._updateRunning(dt);
        } else if (!simState.running) {
            this._updateStopped(dt);
        }

        // Reinicio automático por UL
        if (simState.tripped && simState.tripType === 'UL') {
            simState.ulRestartTimer -= dt;
            if (simState.ulRestartTimer <= 0) {
                this.startPump();
            }
        }

        // Interpolar niveles de fluido — tasa 2/s (dt-aware)
        const lerpRate = 2.0;
        const lf = 1 - Math.exp(-lerpRate * dt);
        simState.casingLevel += (simState.casingLevelTarget - simState.casingLevel) * lf;
        simState.tubingLevel += (simState.tubingLevelTarget - simState.tubingLevel) * lf;

        // Registrar historial
        this._pushHistory();
    },

    /**
     * Actualización cuando la bomba está encendida
     * @private
     */
    _updateRunning(dt) {
        // Reducir timer de arranque
        if (simState.startupTimer > 0) {
            simState.startupTimer -= dt;
        }

        // Calcular punto de operación con el motor físico
        const result = Physics.findOperatingPoint({
            hz: simState.hz,
            sbhp: simState.sbhp,
            pi: simState.pi,
            glr: simState.glr,
            sepEff: simState.sepEff,
            visc: simState.visc,
            liqSG: simState.liqSG,
            choke: simState.choke,
            pumpWear: simState.pumpWear,
            catalogHead: simState.catalogHead,
            catalogRate: simState.catalogRate
        });

        // Aplicar resultados con suavizado dt-aware (converge en ~0.5 s)
        // rate=6 → τ≈0.17s; se escala solo con dt que ya lleva simSpeed
        const smoothRate = 6.0;
        const s = 1 - Math.exp(-smoothRate * dt);
        const tempRate = 0.8;   // temperatura más lenta (τ≈1.25s)
        const ts = 1 - Math.exp(-tempRate * dt);
        simState.blpd   += (result.blpd   - simState.blpd)   * s;
        simState.head   += (result.head   - simState.head)   * s;
        simState.pip    += (result.pip    - simState.pip)    * s;
        simState.pdp    += (result.pdp    - simState.pdp)    * s;
        simState.ftp    += (result.ftp    - simState.ftp)    * s;
        simState.gvf    += (result.gvf    - simState.gvf)    * s;
        simState.pumpSG += (result.pumpSG - simState.pumpSG) * s;
        simState.hp     += (result.hp     - simState.hp)     * s;
        simState.bhp    += (result.bhp    - simState.bhp)    * s;
        simState.efficiency = result.efficiency;
        simState.Hsi_final  = result.Hsi_final;
        simState.Qmax_final = result.Qmax_final;
        simState.bhpDesign  = result.bhpDesign;

        // Amperaje con spike de arranque
        let targetAmps = result.amps;
        if (simState.startupTimer > 0) {
            const progress = simState.startupTimer / CONFIG.STARTUP_IGNORE_TIME;
            const spikeFactor = 1 + (CONFIG.STARTUP_SPIKE_FACTOR - 1) * progress;
            targetAmps *= spikeFactor;
        }
        simState.amps += (targetAmps - simState.amps) * s;

        // Temperatura del motor — transición más lenta
        simState.motorTemp += (result.motorTemp - simState.motorTemp) * ts;

        // Detectar gas lock
        simState.gasLocked = simState.gvf > CONFIG.GAS_LOCK_THRESHOLD;

        // Niveles de fluido objetivo
        const levels = Physics.calcFluidLevels(
            simState.pip, simState.pdp, simState.liqSG, simState.pumpSG
        );
        simState.casingLevelTarget = levels.casingLevel;
        simState.tubingLevelTarget = levels.tubingLevel;

        // Acumulador para promedio BPD en superficie
        simState.bpdAccum += simState.blpd * dt;
        simState.bpdCount += dt;
        if (simState.bpdCount > 0) {
            simState.avgBPD = simState.bpdAccum / simState.bpdCount;
        }

        // Chequeo de trips (ignorar durante startup spike)
        if (simState.startupTimer <= 0) {
            this._checkTrips(dt);
        }
    },

    /**
     * Actualización cuando la bomba está apagada
     * @private
     */
    _updateStopped(dt) {
        // Decaimiento dt-aware: tasa 5/s (rápido) para amps/blpd/head
        const decayRate = 5.0;
        const decay = 1 - Math.exp(-decayRate * dt);

        // Tasa lenta para temperatura y PIP (equilibrio térmico/hidráulico)
        const slowRate = 0.5;
        const slow = 1 - Math.exp(-slowRate * dt);

        simState.amps  -= simState.amps  * decay;
        simState.blpd  -= simState.blpd  * decay;
        simState.head  -= simState.head  * decay;
        simState.hp    -= simState.hp    * decay;
        simState.bhp   -= simState.bhp   * decay;

        // Temperatura vuelve a la estática
        simState.motorTemp += (CONFIG.STATIC_TEMP - simState.motorTemp) * slow;

        // FTP vuelve al base
        simState.ftp += (CONFIG.FTP_BASE - simState.ftp) * slow;

        // GVF se disipa
        simState.gvf -= simState.gvf * decay;
        simState.gasLocked = false;

        // PIP vuelve al SBHP (equilibrio estático)
        simState.pip    += (simState.sbhp     - simState.pip)    * slow;
        simState.pumpSG += (simState.liqSG    - simState.pumpSG) * slow;

        // Niveles de fluido — comportamiento según check valve
        const staticLevel = CONFIG.PUMP_DEPTH -
            (simState.sbhp * CONFIG.PSI_TO_FT_WATER / simState.liqSG);
        const safeStaticLevel = Math.max(0, staticLevel);

        if (simState.checkValve) {
            // CON check valve: casing vuelve al estático, tubing mantiene nivel
            simState.casingLevelTarget = safeStaticLevel;
            // El tubing no se vacía (la válvula evita reflujo)
        } else {
            // SIN check valve: ambos niveles se equilibran al estático
            simState.casingLevelTarget = safeStaticLevel;
            simState.tubingLevelTarget += (safeStaticLevel - simState.tubingLevelTarget) * 0.01;
        }

        // PDP cae
        simState.pdp *= decay;
    },

    /**
     * Verificar condiciones de trip (OL y UL)
     * @private
     */
    _checkTrips(dt) {
        const { amps, ol, ul } = simState;

        // OL = 200 significa ignorar overload (sin trip)
        if (ol < 200 && amps > ol) {
            simState.tripTimer += dt;
            if (simState.tripTimer >= CONFIG.TRIP_DELAY) {
                this.tripPump('OL');
            }
        } else if (amps < ul && amps > 0.5) {
            // Solo trip por UL si hay algo de corriente (bomba efectivamente corriendo)
            simState.tripTimer += dt;
            if (simState.tripTimer >= CONFIG.TRIP_DELAY) {
                this.tripPump('UL');
            }
        } else {
            // Condición normal — resetear acumulador
            simState.tripTimer = 0;
        }
    },

    /**
     * Agregar valores actuales al historial para el Ammeter Chart
     * @private
     */
    _pushHistory() {
        const h = simState.history;
        const max = CONFIG.HISTORY_MAX_POINTS;

        h.amps.push(simState.amps);
        h.hz.push(simState.hz);
        h.motorTemp.push(simState.motorTemp);
        h.blpd.push(simState.blpd);
        h.ftp.push(simState.ftp);
        h.pdp.push(simState.pdp);
        h.pip.push(simState.pip);
        h.gvf.push(simState.gvf * 100); // Guardar en porcentaje

        // Limitar tamaño
        const keys = Object.keys(h);
        for (let i = 0; i < keys.length; i++) {
            if (h[keys[i]].length > max) {
                h[keys[i]].shift();
            }
        }
    },

    // =====================================================================
    // CONTROL DE LA BOMBA
    // =====================================================================

    /** Encender la bomba (con spike de arranque) */
    startPump() {
        simState.running = true;
        simState.tripped = false;
        simState.tripType = null;
        simState.tripTimer = 0;
        simState.startupTimer = CONFIG.STARTUP_IGNORE_TIME;
        // Resetear promedio BPD
        simState.bpdAccum = 0;
        simState.bpdCount = 0;
        simState.avgBPD = 0;
    },

    /** Apagar la bomba manualmente */
    stopPump() {
        simState.running = false;
        simState.tripped = false;
        simState.tripType = null;
        simState.tripTimer = 0;
    },

    /**
     * Trip automático de la bomba
     * @param {string} type - 'OL' (overload) o 'UL' (underload)
     */
    tripPump(type) {
        simState.running = false;
        simState.tripped = true;
        simState.tripType = type;
        simState.tripTimer = 0;
        if (type === 'UL') {
            simState.ulRestartTimer = CONFIG.UL_RESTART_DELAY;
        }
    },

    /** Toggle encendido/apagado con manejo de trip OL */
    togglePump() {
        if (simState.tripped && simState.tripType === 'OL') {
            // Para trip OL, se necesita clic manual para reiniciar
            this.startPump();
        } else if (simState.running) {
            this.stopPump();
        } else {
            this.startPump();
        }
    },

    // =====================================================================
    // GESTIÓN DE CASOS
    // =====================================================================

    /**
     * Cargar un caso preconfigurado
     * @param {string} caseName - Nombre del caso (key de CASES)
     */
    loadCase(caseName) {
        const caseData = CASES[caseName];
        if (!caseData) return;

        // Apagar bomba primero
        this.stopPump();

        // Cargar todos los parámetros del caso
        const paramKeys = ['hz', 'ol', 'ul', 'pumpWear', 'sepEff', 'sbhp',
                          'pi', 'glr', 'visc', 'liqSG', 'choke',
                          'catalogHead', 'catalogRate'];
        for (let i = 0; i < paramKeys.length; i++) {
            const key = paramKeys[i];
            if (caseData[key] !== undefined) {
                simState[key] = caseData[key];
            }
        }

        simState.currentCase = caseName;
        simState.currentCaseIndex = CASE_NAMES.indexOf(caseName);

        // Resetear variables calculadas
        simState.blpd = 0;
        simState.head = 0;
        simState.pip = simState.sbhp;
        simState.pdp = 0;
        simState.ftp = CONFIG.FTP_BASE;
        simState.gvf = 0;
        simState.pumpSG = simState.liqSG;
        simState.hp = 0;
        simState.bhp = 0;
        simState.amps = 0;
        simState.motorTemp = CONFIG.STATIC_TEMP;
        simState.gasLocked = false;
        simState.avgBPD = 0;
        simState.bpdAccum = 0;
        simState.bpdCount = 0;

        // Resetear niveles al equilibrio estático
        const staticLevel = CONFIG.PUMP_DEPTH -
            (simState.sbhp * CONFIG.PSI_TO_FT_WATER / simState.liqSG);
        const safeLevel = Math.max(0, staticLevel);
        simState.casingLevel = safeLevel;
        simState.tubingLevel = CONFIG.PUMP_DEPTH; // Tubing vacío al arranque
        simState.casingLevelTarget = safeLevel;
        simState.tubingLevelTarget = CONFIG.PUMP_DEPTH;

        // Limpiar historial
        const hKeys = Object.keys(simState.history);
        for (let i = 0; i < hKeys.length; i++) {
            simState.history[hKeys[i]] = [];
        }
    },

    /** Resetear al caso base */
    reset() {
        this.loadCase('Base Case');
    },

    /** Navegar al caso anterior */
    prevCase() {
        let idx = simState.currentCaseIndex - 1;
        if (idx < 0) idx = CASE_NAMES.length - 1;
        this.loadCase(CASE_NAMES[idx]);
    },

    /** Navegar al caso siguiente */
    nextCase() {
        let idx = simState.currentCaseIndex + 1;
        if (idx >= CASE_NAMES.length) idx = 0;
        this.loadCase(CASE_NAMES[idx]);
    }
};
