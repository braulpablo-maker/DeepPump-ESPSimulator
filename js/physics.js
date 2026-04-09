/**
 * DeepPump ESP Simulator — Motor Físico
 * Implementación de todas las ecuaciones de la simulación ESP:
 * curva de bomba, leyes de afinidad, desgaste, viscosidad, IPR,
 * GVF, potencia, amperaje, temperatura del motor, niveles de fluido.
 *
 * Todas las funciones son puras (sin efectos secundarios).
 */

const Physics = {

    // =========================================================================
    // 1. CURVA DE BOMBA — modelo parabólico
    // H(Q) = H_shutin × (1 - (Q / Q_max)²)
    // =========================================================================

    /**
     * Calcula la cabeza de la bomba en la curva de catálogo
     * @param {number} Q - Tasa de flujo (BLPD)
     * @param {number} Hsi - Cabeza a flujo cero / shutin head (ft)
     * @param {number} Qmax - Tasa máxima a cabeza cero (BLPD)
     * @returns {number} Cabeza generada por la bomba (ft)
     */
    pumpCurveHead(Q, Hsi, Qmax) {
        if (Qmax <= 0) return 0;
        const x = Q / Qmax;
        if (x >= 1) return 0;
        return Math.max(0, Hsi * (1 - x * x));
    },

    // =========================================================================
    // 2. LEYES DE AFINIDAD
    // ratio = HZ_actual / HZ_base
    // Q_max se escala linealmente, H_shutin cuadráticamente
    // =========================================================================

    /**
     * Aplica leyes de afinidad para ajustar la curva a la frecuencia del VFD
     * @param {number} Hsi - Cabeza shutin del catálogo (a freq base)
     * @param {number} Qmax - Tasa máxima del catálogo (a freq base)
     * @param {number} hz - Frecuencia actual del VFD (Hz)
     * @param {number} hzBase - Frecuencia base del catálogo (Hz)
     * @returns {{ Hsi_adj: number, Qmax_adj: number }}
     */
    applyAffinityLaws(Hsi, Qmax, hz, hzBase) {
        if (hzBase <= 0) return { Hsi_adj: 0, Qmax_adj: 0 };
        const ratio = hz / hzBase;
        return {
            Hsi_adj: Hsi * ratio * ratio,     // Cabeza escala con ratio²
            Qmax_adj: Qmax * ratio              // Caudal escala linealmente
        };
    },

    // =========================================================================
    // 3. DESGASTE DE BOMBA (Pump Wear)
    // factor = 1 - wear/100; Q × factor, H × factor²
    // =========================================================================

    /**
     * Calcula los factores de corrección por desgaste
     * @param {number} wearPct - Porcentaje de desgaste (0-100)
     * @returns {{ factorQ: number, factorH: number }}
     */
    wearFactors(wearPct) {
        const f = Math.max(0, 1 - wearPct / 100);
        return {
            factorQ: f,        // Q se reduce linealmente
            factorH: f * f     // H se reduce cuadráticamente
        };
    },

    // =========================================================================
    // 4. CORRECCIÓN POR VISCOSIDAD
    // Basado en ANSI/HI 9.6.7 simplificado
    // =========================================================================

    /**
     * Calcula los factores de corrección por viscosidad
     * Viscosidad > 1 cp degrada Q, H y eficiencia
     * @param {number} visc - Viscosidad del fluido (cp)
     * @returns {{ CQ: number, CH: number, Ceff: number }}
     */
    viscosityFactors(visc) {
        if (visc <= 1.0) {
            return { CQ: 1.0, CH: 1.0, Ceff: 1.0 };
        }
        const lnV = Math.log(visc);
        const clamp = (v) => Math.max(0.3, Math.min(1.0, v));
        return {
            CQ:   clamp(1 - 0.05 * lnV),   // Factor de corrección de caudal
            CH:   clamp(1 - 0.04 * lnV),   // Factor de corrección de cabeza
            Ceff: clamp(1 - 0.08 * lnV)    // Factor de corrección de eficiencia
        };
    },

    // =========================================================================
    // 5. EFICIENCIA DE LA BOMBA
    // Modelo parabólico: η = η_max × 4 × x × (1-x), máximo en x=0.5 (BEP)
    // =========================================================================

    /**
     * Calcula la eficiencia de la bomba según la posición en la curva
     * @param {number} Q - Tasa de flujo actual (BLPD)
     * @param {number} Qmax - Tasa máxima de la curva ajustada (BLPD)
     * @param {number} effMax - Eficiencia máxima en el BEP
     * @returns {number} Eficiencia (mínimo 0.10 para evitar div/0)
     */
    pumpEfficiency(Q, Qmax, effMax) {
        if (Qmax <= 0 || Q <= 0) return 0.10;
        const x = Math.min(Q / Qmax, 0.999);
        const eff = effMax * 4 * x * (1 - x);
        return Math.max(0.10, eff);
    },

    // =========================================================================
    // 6. IPR DEL POZO — modelo lineal simplificado
    // BLPD = PI × (SBHP - PIP)
    // =========================================================================

    /**
     * Calcula la producción del pozo según la IPR lineal
     * @param {number} sbhp - Presión estática de fondo (psi)
     * @param {number} pi - Índice de productividad (BLPD/psi)
     * @param {number} pip - Presión de entrada de la bomba / FBHP (psi)
     * @returns {number} Producción en BLPD (mínimo 0)
     */
    calcIPR(sbhp, pi, pip) {
        return Math.max(0, pi * (sbhp - pip));
    },

    // =========================================================================
    // 7. FRACCIÓN DE VOLUMEN DE GAS (GVF)
    // =========================================================================

    /**
     * Calcula la GVF a la entrada de la bomba
     * gas_libre = GLR × (1 - PIP/SBHP) × BLPD × (14.7/PIP) × (1 - SepEff/100)
     * GVF = gas_libre / (gas_libre + BLPD)
     * @param {number} glr - Relación gas-líquido (scf/bbl)
     * @param {number} pip - Presión de entrada de la bomba (psi)
     * @param {number} sbhp - Presión estática de fondo (psi)
     * @param {number} blpd - Producción de líquido (BLPD)
     * @param {number} sepEff - Eficiencia del separador de gas (%)
     * @returns {number} GVF como fracción (0 a ~0.95)
     */
    calcGVF(glr, pip, sbhp, blpd, sepEff) {
        if (glr <= 0 || blpd <= 0 || pip <= 10 || sbhp <= 0) return 0;

        // Gas libre que sale de solución a la presión de entrada
        // Simplificación: gas_en_solucion se reduce proporcionalmente a la presión
        const gasFactor = Math.max(0, 1 - pip / sbhp);
        // Factor de volumen: gas se expande de condiciones de fondo a presión de entrada
        // Se divide por 5.61 para convertir scf a bbl (1 bbl = 5.61 ft³)
        const gasVol = glr * gasFactor * blpd * (14.7 / pip) / 5.61 * (1 - sepEff / 100);

        if (gasVol <= 0) return 0;

        // GVF = volumen_gas / (volumen_gas + volumen_líquido)
        const gvf = gasVol / (gasVol + blpd);
        return Math.min(0.95, Math.max(0, gvf));
    },

    // =========================================================================
    // 8. FLOWING TUBING PRESSURE (efecto del choke)
    // FTP = FTP_base + (1 - Choke/100)² × K × BLPD²
    // =========================================================================

    /**
     * Calcula la presión fluyente en superficie considerando el choke
     * @param {number} chokePct - Apertura del choke (0-100%)
     * @param {number} blpd - Producción (BLPD)
     * @returns {number} FTP en psi
     */
    calcFTP(chokePct, blpd) {
        // Choke completamente cerrado → bomba a punto cerrado (alta presión)
        if (chokePct <= 0) return 5000;
        // Fórmula de orificio: ΔP ∝ (1/Cd²) × Q²
        // Cd ∝ apertura del choke → ΔP = K × ((100/pct)² - 1) × (Q/Qref)²
        const Q_ref = 2800;
        const orificeFactor = Math.pow(100 / chokePct, 2) - 1;
        const qFactor = Math.pow(blpd / Q_ref, 2);
        const deltaP = CONFIG.CHOKE_K * orificeFactor * qFactor;
        return CONFIG.FTP_BASE + deltaP;
    },

    // =========================================================================
    // 9. POTENCIA Y AMPERAJE
    // =========================================================================

    /**
     * Calcula la potencia hidráulica requerida por la bomba
     * HP = (BLPD × Head × SG) / (136000 × eficiencia)
     * @param {number} blpd - Producción (BLPD)
     * @param {number} head - Cabeza (ft)
     * @param {number} sg - Gravedad específica de la mezcla
     * @param {number} eff - Eficiencia de la bomba
     * @returns {number} Potencia hidráulica en HP
     */
    calcHP(blpd, head, sg, eff) {
        if (eff <= 0) return 0;
        return (blpd * head * sg) / (136000 * eff);
    },

    /**
     * Calcula la potencia mecánica total (Brake Horse Power)
     * BHP = HP / (PF × η_motor) + pérdidas_cable
     * @param {number} hp - Potencia hidráulica (HP)
     * @returns {number} BHP total
     */
    calcBHP(hp) {
        return hp / CONFIG.POWER_FACTOR / CONFIG.MOTOR_EFF + CONFIG.CABLE_LOSSES;
    },

    /**
     * Calcula el amperaje del motor
     * Amps = (BHP × 746) / (√3 × V)
     * @param {number} bhp - Brake Horse Power
     * @returns {number} Amperaje del motor (A)
     */
    calcAmps(bhp) {
        return (bhp * 746) / (1.73 * CONFIG.MOTOR_VOLTAGE);
    },

    // =========================================================================
    // 10. TEMPERATURA DEL MOTOR
    // =========================================================================

    /**
     * Calcula la temperatura estimada del motor ESP
     * T = T_estática + ΔT_interno / factor_enfriamiento
     * @param {number} bhp - Potencia actual (BHP)
     * @param {number} bhpDesign - Potencia de diseño en BEP (BHP)
     * @param {number} blpd - Producción de líquido (BLPD)
     * @param {number} gvf - Fracción de volumen de gas (0-1)
     * @returns {number} Temperatura del motor en °F
     */
    calcMotorTemp(bhp, bhpDesign, blpd, gvf) {
        if (bhpDesign <= 0) bhpDesign = 100;

        // Factor de enfriamiento: depende del flujo de líquido pasando por el motor
        // Líquido enfría el motor; gas no enfría casi nada
        const coolingFactor = Math.max(0.1, (1 - gvf) * (blpd / 2000));

        // Incremento de temperatura por carga (modelo exponencial)
        const loadRatio = Math.max(0, bhp / bhpDesign);
        const deltaT = CONFIG.DELTA_T_FULL_LOAD * Math.pow(loadRatio, 1.2);

        return CONFIG.STATIC_TEMP + deltaT / coolingFactor;
    },

    // =========================================================================
    // 11. NIVELES DE FLUIDO EN EL POZO
    // =========================================================================

    /**
     * Calcula los niveles de fluido en casing y tubing
     * nivel = profundidad - (presión × 2.309 / SG) → ft desde superficie
     * @param {number} pip - Presión de entrada de la bomba (psi)
     * @param {number} pdp - Presión de descarga de la bomba (psi)
     * @param {number} liqSG - SG del líquido en el casing
     * @param {number} pumpSG - SG de la mezcla en el tubing
     * @returns {{ casingLevel: number, tubingLevel: number }} en ft desde superficie
     */
    calcFluidLevels(pip, pdp, liqSG, pumpSG) {
        const K = CONFIG.PSI_TO_FT_WATER;
        const depth = CONFIG.PUMP_DEPTH;

        // Nivel del casing: columna hidrostática = PIP × 2.309 / SG_líquido
        const casingColumn = pip * K / Math.max(0.5, liqSG);
        const casingLevel = Math.max(0, Math.min(depth, depth - casingColumn));

        // Nivel del tubing: columna hidrostática = PDP × 2.309 / SG_mezcla
        const tubingSG = Math.max(0.5, pumpSG);
        const tubingColumn = pdp * K / tubingSG;
        const tubingLevel = Math.max(0, Math.min(depth, depth - tubingColumn));

        return { casingLevel, tubingLevel };
    },

    // =========================================================================
    // 12. GRAVEDAD ESPECÍFICA DE LA MEZCLA (Pump SG)
    // =========================================================================

    /**
     * Calcula el SG de la mezcla líquido+gas en la bomba
     * @param {number} liqSG - SG del líquido
     * @param {number} gvf - Fracción de gas (0-1)
     * @returns {number} SG de la mezcla
     */
    calcPumpSG(liqSG, gvf) {
        // Gas tiene SG muy bajo (~0.001 relativo al agua)
        const gasSG = 0.001;
        return liqSG * (1 - gvf) + gasSG * gvf;
    },

    // =========================================================================
    // PUNTO DE OPERACIÓN — resolución por bisección
    // =========================================================================

    /**
     * Encuentra el punto de operación estable del sistema ESP.
     * Busca el caudal Q donde Head_bomba(Q) = Head_sistema(Q)
     * usando el método de bisección (30 iteraciones ≈ 1e-9 precisión).
     *
     * @param {object} p - Parámetros del estado actual
     * @returns {object} Resultado completo con todas las variables calculadas
     */
    findOperatingPoint(p) {
        const { hz, sbhp, pi, glr, sepEff, visc, liqSG, choke,
                pumpWear, catalogHead, catalogRate } = p;

        // --- Paso 1: Ajustar la curva de bomba ---

        // Leyes de afinidad (frecuencia)
        const { Hsi_adj, Qmax_adj } = this.applyAffinityLaws(
            catalogHead, catalogRate, hz, CONFIG.BASE_FREQ
        );

        // Desgaste
        const { factorQ: wQ, factorH: wH } = this.wearFactors(pumpWear);
        const Qmax_worn = Qmax_adj * wQ;
        const Hsi_worn = Hsi_adj * wH;

        // Viscosidad
        const { CQ, CH, Ceff } = this.viscosityFactors(visc);
        const Qmax_final = Qmax_worn * CQ;
        const Hsi_final = Hsi_worn * CH;

        // Bomba no operativa
        if (Qmax_final <= 0 || Hsi_final <= 0 || hz <= 0) {
            return this._zeroResult(sbhp, liqSG);
        }

        // --- Paso 2: Bisección para encontrar Q de equilibrio ---
        let Qlo = 0;
        let Qhi = Qmax_final * 1.05; // Margen extra
        let Q = Qmax_final * 0.4;    // Estimación inicial

        for (let i = 0; i < 30; i++) {
            // PIP desde la IPR del pozo
            const pip = Math.max(0, sbhp - Q / Math.max(0.01, pi));

            // FTP con efecto del choke
            const ftp = this.calcFTP(choke, Q);

            // GVF a la entrada de la bomba
            const gvf = this.calcGVF(glr, pip, sbhp, Q, sepEff);

            // SG de la mezcla en la bomba
            const pumpSG = this.calcPumpSG(liqSG, gvf);

            // Presión de descarga necesaria para elevar fluidos a superficie
            // El tubing por encima de la bomba contiene mayormente líquido,
            // así que usamos liqSG para la columna hidrostática del tubing
            const pdp = ftp + CONFIG.PUMP_DEPTH * liqSG / CONFIG.PSI_TO_FT_WATER;

            // Head requerida por el sistema (en pies de fluido)
            const headRequired = (pdp - pip) * CONFIG.PSI_TO_FT_WATER / Math.max(0.1, liqSG);

            // Head disponible de la bomba
            let headPump = this.pumpCurveHead(Q, Hsi_final, Qmax_final);

            // Degradación por gas en la bomba
            if (gvf > CONFIG.GAS_LOCK_THRESHOLD) {
                // Gas lock severo: la bomba pierde capacidad rápidamente
                headPump *= Math.max(0, 1 - (gvf - CONFIG.GAS_LOCK_THRESHOLD) * 5);
            } else if (gvf > 0.10) {
                // Degradación gradual por gas libre
                headPump *= (1 - gvf * 0.3);
            }

            // Bisección: si la bomba tiene más cabeza de la necesaria,
            // el caudal real es mayor (buscar a la derecha)
            if (headPump > headRequired) {
                Qlo = Q;
            } else {
                Qhi = Q;
            }
            Q = (Qlo + Qhi) / 2;
        }

        // --- Paso 3: Calcular resultado final con Q convergido ---
        const pip = Math.max(0, sbhp - Q / Math.max(0.01, pi));
        const ftp = this.calcFTP(choke, Q);
        const gvf = this.calcGVF(glr, pip, sbhp, Q, sepEff);
        const pumpSG = this.calcPumpSG(liqSG, gvf);
        const pdp = ftp + CONFIG.PUMP_DEPTH * liqSG / CONFIG.PSI_TO_FT_WATER;

        // Head final con degradación por gas
        let head = this.pumpCurveHead(Q, Hsi_final, Qmax_final);
        if (gvf > CONFIG.GAS_LOCK_THRESHOLD) {
            head *= Math.max(0, 1 - (gvf - CONFIG.GAS_LOCK_THRESHOLD) * 5);
        } else if (gvf > 0.10) {
            head *= (1 - gvf * 0.3);
        }

        // Eficiencia (con corrección de viscosidad)
        const effBase = this.pumpEfficiency(Q, Qmax_final, CONFIG.PUMP_EFF_MAX);
        const eff = Math.max(0.10, effBase * Ceff);

        // Potencia y amperaje
        const hp = this.calcHP(Q, head, pumpSG, eff);
        const bhp = this.calcBHP(hp);
        const amps = this.calcAmps(bhp);

        // BHP de diseño (en el BEP a la frecuencia actual, para cálculo de temperatura)
        const Qbep = Qmax_final * 0.5;
        const headBep = this.pumpCurveHead(Qbep, Hsi_final, Qmax_final);
        const effBep = Math.max(0.10, CONFIG.PUMP_EFF_MAX * Ceff);
        const hpBep = this.calcHP(Qbep, headBep, liqSG, effBep);
        const bhpDesign = this.calcBHP(hpBep);

        // Temperatura del motor
        const motorTemp = this.calcMotorTemp(bhp, bhpDesign, Q, gvf);

        return {
            blpd: Math.max(0, Q),
            head: Math.max(0, head),
            pip: Math.max(0, pip),
            pdp: Math.max(0, pdp),
            ftp: Math.max(0, ftp),
            gvf: Math.max(0, gvf),
            pumpSG: Math.max(0.01, pumpSG),
            hp: Math.max(0, hp),
            bhp: Math.max(0, bhp),
            amps: Math.max(0, amps),
            motorTemp: motorTemp,
            efficiency: eff,
            // Datos de la curva ajustada (para renderizado del gráfico)
            Hsi_final,
            Qmax_final,
            bhpDesign
        };
    },

    /**
     * Resultado con valores cero (bomba no operativa)
     * @private
     */
    _zeroResult(sbhp, liqSG) {
        return {
            blpd: 0, head: 0,
            pip: sbhp, pdp: 0,
            ftp: CONFIG.FTP_BASE,
            gvf: 0, pumpSG: liqSG,
            hp: 0, bhp: 0, amps: 0,
            motorTemp: CONFIG.STATIC_TEMP,
            efficiency: 0,
            Hsi_final: 0, Qmax_final: 0,
            bhpDesign: 100
        };
    },

    // =========================================================================
    // UTILIDADES PARA GRÁFICOS
    // =========================================================================

    /**
     * Genera puntos para dibujar una curva de bomba
     * @param {number} Hsi - Cabeza shutin (ft)
     * @param {number} Qmax - Tasa máxima (BLPD)
     * @param {number} numPoints - Cantidad de puntos a generar
     * @returns {Array<{q: number, h: number}>}
     */
    generateCurvePoints(Hsi, Qmax, numPoints) {
        numPoints = numPoints || 50;
        const points = [];
        for (let i = 0; i <= numPoints; i++) {
            const q = (i / numPoints) * Qmax;
            const h = this.pumpCurveHead(q, Hsi, Qmax);
            points.push({ q, h });
        }
        return points;
    }
};
