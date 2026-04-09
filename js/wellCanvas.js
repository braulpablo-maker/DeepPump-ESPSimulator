/**
 * DeepPump ESP Simulator — Renderizado del Pozo (Canvas 2D)
 * Dibuja la representación esquemática del pozo petrolero:
 * casing, tubing, fluidos animados, bomba ESP, check-valve, y escala de profundidad.
 */

const WellRenderer = {

    // Constantes de dibujo
    MARGIN_LEFT: 55,        // Margen izquierdo para escala de profundidad
    MARGIN_RIGHT: 15,
    MARGIN_TOP: 40,         // Espacio para cabezal de pozo
    MARGIN_BOTTOM: 10,
    CASING_WIDTH: 110,      // Ancho del casing (px)
    TUBING_WIDTH: 26,       // Ancho del tubing (px)
    PUMP_HEIGHT: 30,        // Alto del bloque de bomba (px)
    CV_HEIGHT: 14,          // Alto de la check-valve (px)
    CV_GAP: 4,              // Espacio entre bomba y check-valve (px)

    // Variables internas para animación de ondas
    _wavePhase: 0,

    /**
     * Renderizar la visualización completa del pozo
     * @param {CanvasRenderingContext2D} ctx
     * @param {object} state - simState
     */
    render(ctx, state) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        // Limpiar canvas
        ctx.clearRect(0, 0, W, H);

        // Área de dibujo del pozo
        const drawTop = this.MARGIN_TOP;
        const drawBottom = H - this.MARGIN_BOTTOM;
        const drawHeight = drawBottom - drawTop;
        const centerX = this.MARGIN_LEFT + (W - this.MARGIN_LEFT - this.MARGIN_RIGHT) / 2;

        // Función para convertir ft a píxeles Y
        const ftToY = (ft) => drawTop + (ft / CONFIG.PUMP_DEPTH) * drawHeight;

        // Animar fase de ondas
        this._wavePhase += 0.08;

        // 1. Fondo degradado del terreno
        this._drawBackground(ctx, W, H, drawTop);

        // 2. Escala de profundidad
        this._drawDepthScale(ctx, ftToY, drawTop, drawHeight);

        // 3. Casing (exterior)
        this._drawCasing(ctx, centerX, ftToY, drawTop, drawBottom);

        // 4. Fluido en el casing (annular)
        this._drawCasingFluid(ctx, centerX, ftToY, state);

        // 5. Tubing (interior)
        this._drawTubing(ctx, centerX, ftToY, drawTop, drawBottom);

        // 6. Fluido en el tubing
        this._drawTubingFluid(ctx, centerX, ftToY, state);

        // 7. Bomba ESP
        this._drawPump(ctx, centerX, ftToY, state);

        // 8. Check-valve
        this._drawCheckValve(ctx, centerX, ftToY, state);

        // 9. Cabezal de pozo (wellhead)
        this._drawWellhead(ctx, centerX, drawTop, state);
    },

    /** Fondo con degradado de profundidad */
    _drawBackground(ctx, W, H, drawTop) {
        // Cielo / superficie
        ctx.fillStyle = '#5a7a9a';
        ctx.fillRect(0, 0, W, drawTop);

        // Terreno (gradiente de marrón a gris oscuro)
        const grad = ctx.createLinearGradient(0, drawTop, 0, H);
        grad.addColorStop(0, '#8B7355');
        grad.addColorStop(0.05, '#6B5B45');
        grad.addColorStop(0.3, '#4a4040');
        grad.addColorStop(1, '#2a2525');
        ctx.fillStyle = grad;
        ctx.fillRect(0, drawTop, W, H - drawTop);

        // Línea del suelo
        ctx.strokeStyle = '#5a4a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, drawTop);
        ctx.lineTo(W, drawTop);
        ctx.stroke();
    },

    /** Escala de profundidad con marcas cada 1000 ft */
    _drawDepthScale(ctx, ftToY, drawTop, drawHeight) {
        ctx.fillStyle = '#ccc';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let ft = 0; ft <= CONFIG.PUMP_DEPTH; ft += 1000) {
            const y = ftToY(ft);
            // Marca horizontal
            ctx.beginPath();
            ctx.moveTo(this.MARGIN_LEFT - 8, y);
            ctx.lineTo(this.MARGIN_LEFT - 2, y);
            ctx.stroke();
            // Label
            ctx.fillText(ft + "'", this.MARGIN_LEFT - 10, y);
        }
    },

    /** Casing (rectángulo exterior gris) */
    _drawCasing(ctx, cx, ftToY, drawTop, drawBottom) {
        const cw = this.CASING_WIDTH;
        const x = cx - cw / 2;

        // Pared del casing (gris metálico)
        const grad = ctx.createLinearGradient(x, 0, x + cw, 0);
        grad.addColorStop(0, '#777');
        grad.addColorStop(0.15, '#999');
        grad.addColorStop(0.5, '#aaa');
        grad.addColorStop(0.85, '#999');
        grad.addColorStop(1, '#777');
        ctx.fillStyle = grad;
        ctx.fillRect(x, drawTop, cw, drawBottom - drawTop);

        // Borde exterior
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, drawTop, cw, drawBottom - drawTop);

        // Interior del casing (más oscuro, dejando espacio para el tubing)
        const innerMargin = 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(x + innerMargin, drawTop, cw - innerMargin * 2, drawBottom - drawTop);
    },

    /** Fluido en el espacio anular del casing */
    _drawCasingFluid(ctx, cx, ftToY, state) {
        const casingLevel = state.casingLevel;
        const casingTop = ftToY(Math.max(0, casingLevel));
        const casingBottom = ftToY(CONFIG.PUMP_DEPTH);
        const fluidHeight = casingBottom - casingTop;

        if (fluidHeight <= 0) return;

        const cw = this.CASING_WIDTH;
        const innerMargin = 8;
        const tw = this.TUBING_WIDTH;
        const x1 = cx - cw / 2 + innerMargin;
        const x2 = cx - tw / 2 - 2;
        const x3 = cx + tw / 2 + 2;
        const x4 = cx + cw / 2 - innerMargin;

        // Color del fluido varía con GVF (más gas = verde más claro/grisáceo)
        const gvf = Math.min(1, state.gvf || 0);
        const g1 = `rgba(${Math.round(0 + gvf * 80)}, ${Math.round(136 + gvf * 40)}, ${Math.round(68 + gvf * 30)}, 0.55)`;
        const g2 = `rgba(${Math.round(0 + gvf * 70)}, ${Math.round(153 + gvf * 30)}, ${Math.round(85 + gvf * 20)}, 0.7)`;
        const g3 = `rgba(0, ${Math.round(102 + gvf * 20)}, ${Math.round(68 - gvf * 10)}, 0.85)`;

        const grad = ctx.createLinearGradient(0, casingTop, 0, casingBottom);
        grad.addColorStop(0, g1);
        grad.addColorStop(0.3, g2);
        grad.addColorStop(1, g3);
        ctx.fillStyle = grad;

        ctx.fillRect(x1, casingTop, x2 - x1, fluidHeight);
        ctx.fillRect(x3, casingTop, x4 - x3, fluidHeight);

        // Ondas en la superficie del fluido
        if (state.running) {
            this._drawWaves(ctx, x1, x2, casingTop);
            this._drawWaves(ctx, x3, x4, casingTop);
        }
    },

    /** Tubing (rectángulo interior) */
    _drawTubing(ctx, cx, ftToY, drawTop, drawBottom) {
        const tw = this.TUBING_WIDTH;
        const x = cx - tw / 2;

        // Pared del tubing (gris claro metálico)
        const grad = ctx.createLinearGradient(x, 0, x + tw, 0);
        grad.addColorStop(0, '#888');
        grad.addColorStop(0.5, '#bbb');
        grad.addColorStop(1, '#888');
        ctx.fillStyle = grad;
        ctx.fillRect(x, drawTop, tw, drawBottom - drawTop);

        // Interior del tubing
        const innerM = 4;
        ctx.fillStyle = '#222';
        ctx.fillRect(x + innerM, drawTop, tw - innerM * 2, drawBottom - drawTop);

        // Bordes
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, drawTop, tw, drawBottom - drawTop);
    },

    /** Fluido dentro del tubing */
    _drawTubingFluid(ctx, cx, ftToY, state) {
        const tubingLevel = state.tubingLevel;
        const tubingTop = ftToY(Math.max(0, tubingLevel));
        const tubingBottom = ftToY(CONFIG.PUMP_DEPTH);
        const fluidHeight = tubingBottom - tubingTop;

        if (fluidHeight <= 0) return;

        const tw = this.TUBING_WIDTH;
        const innerM = 4;
        const x = cx - tw / 2 + innerM;
        const w = tw - innerM * 2;

        // Color del fluido en el tubing — más claro si hay gas (mezcla)
        const gvf = Math.min(1, state.gvf || 0);
        const alpha1 = 0.65 + gvf * 0.1;
        const alpha2 = 0.8 + gvf * 0.05;
        const grad = ctx.createLinearGradient(0, tubingTop, 0, tubingBottom);
        grad.addColorStop(0, `rgba(${Math.round(30 + gvf * 50)}, ${Math.round(185 + gvf * 30)}, ${Math.round(120 - gvf * 30)}, ${alpha1})`);
        grad.addColorStop(1, `rgba(${Math.round(15 + gvf * 30)}, ${Math.round(130 + gvf * 20)}, ${Math.round(85 - gvf * 20)}, ${alpha2})`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, tubingTop, w, fluidHeight);

        // Ondas solo si hay produccón
        if (state.running && state.blpd > 50) {
            this._drawWaves(ctx, x, x + w, tubingTop);
        }
    },

    /** Bomba ESP (bloque rojo en el fondo del pozo) */
    _drawPump(ctx, cx, ftToY, state) {
        const pumpY = ftToY(CONFIG.PUMP_DEPTH) - this.PUMP_HEIGHT;
        const pumpW = this.CASING_WIDTH - 20;
        const x = cx - pumpW / 2;

        // Cuerpo de la bomba
        const grad = ctx.createLinearGradient(x, pumpY, x + pumpW, pumpY);
        grad.addColorStop(0, '#aa0000');
        grad.addColorStop(0.3, '#dd2222');
        grad.addColorStop(0.5, '#ee3333');
        grad.addColorStop(0.7, '#dd2222');
        grad.addColorStop(1, '#aa0000');
        ctx.fillStyle = grad;
        ctx.fillRect(x, pumpY, pumpW, this.PUMP_HEIGHT);

        // Borde de la bomba
        ctx.strokeStyle = '#880000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, pumpY, pumpW, this.PUMP_HEIGHT);

        // Indicador de funcionamiento (glow cuando encendida)
        if (state.running && !state.tripped) {
            ctx.shadowColor = '#ff4444';
            ctx.shadowBlur = 10;
            ctx.strokeStyle = '#ff6666';
            ctx.lineWidth = 1;
            ctx.strokeRect(x + 2, pumpY + 2, pumpW - 4, this.PUMP_HEIGHT - 4);
            ctx.shadowBlur = 0;
        }

        // Texto "ESP" y GVF visual
        // Si gas lock: texto naranja parpadeante
        if (state.gasLocked) {
            ctx.fillStyle = '#ff8800';
            ctx.font = 'bold 9px Inter, sans-serif';
        } else {
            ctx.fillStyle = '#ffcccc';
            ctx.font = 'bold 11px Inter, sans-serif';
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(state.gasLocked ? 'GAS LOCK' : 'ESP', cx, pumpY + this.PUMP_HEIGHT / 2);
    },

    /** Check-valve (rectángulo gris encima de la bomba) */
    _drawCheckValve(ctx, cx, ftToY, state) {
        const pumpTopY = ftToY(CONFIG.PUMP_DEPTH) - this.PUMP_HEIGHT;
        const cvY = pumpTopY - this.CV_GAP - this.CV_HEIGHT;
        const cvW = this.TUBING_WIDTH + 10;
        const x = cx - cvW / 2;

        // Color según si está instalada
        if (state.checkValve) {
            ctx.fillStyle = '#44aa66';
            ctx.strokeStyle = '#33cc55';
        } else {
            ctx.fillStyle = '#666';
            ctx.strokeStyle = '#888';
        }
        ctx.lineWidth = 2;
        ctx.fillRect(x, cvY, cvW, this.CV_HEIGHT);
        ctx.strokeRect(x, cvY, cvW, this.CV_HEIGHT);

        // Texto
        ctx.fillStyle = state.checkValve ? '#fff' : '#aaa';
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('CV', cx, cvY + this.CV_HEIGHT / 2);

        // Guardar posición para manejo de clic
        this._cvRect = { x, y: cvY, w: cvW, h: this.CV_HEIGHT };
    },

    /** Cabezal de pozo (wellhead) en la superficie */
    _drawWellhead(ctx, cx, drawTop, state) {
        const w = this.CASING_WIDTH + 30;
        const h = 30;
        const x = cx - w / 2;
        const y = drawTop - h;

        // Base del cabezal
        const grad = ctx.createLinearGradient(x, y, x + w, y);
        grad.addColorStop(0, '#666');
        grad.addColorStop(0.3, '#999');
        grad.addColorStop(0.5, '#aaa');
        grad.addColorStop(0.7, '#999');
        grad.addColorStop(1, '#666');
        ctx.fillStyle = grad;

        // Forma trapezoidal
        ctx.beginPath();
        ctx.moveTo(x + 10, y + h);
        ctx.lineTo(x, y + 5);
        ctx.lineTo(x + 5, y);
        ctx.lineTo(x + w - 5, y);
        ctx.lineTo(x + w, y + 5);
        ctx.lineTo(x + w - 10, y + h);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Indicador de producción (chorro verde si está produciendo)
        if (state.running && state.blpd > 50) {
            ctx.fillStyle = '#00aa55';
            ctx.shadowColor = '#00ff66';
            ctx.shadowBlur = 5;
            // Flechita de flujo a la derecha
            const arrowX = cx + w / 2 - 10;
            const arrowY = y + h / 2;
            ctx.beginPath();
            ctx.moveTo(arrowX, arrowY - 4);
            ctx.lineTo(arrowX + 15, arrowY);
            ctx.lineTo(arrowX, arrowY + 4);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    },

    /** Efecto de ondas en la superficie del fluido */
    _drawWaves(ctx, x1, x2, surfaceY) {
        const w = x2 - x1;
        if (w <= 2) return;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= w; i += 2) {
            const waveY = surfaceY + Math.sin(this._wavePhase + i * 0.3) * 1.5;
            if (i === 0) {
                ctx.moveTo(x1 + i, waveY);
            } else {
                ctx.lineTo(x1 + i, waveY);
            }
        }
        ctx.stroke();
    },

    /**
     * Verificar si un clic del mouse cae sobre la check-valve
     * @param {number} mx - Posición X del clic en el canvas
     * @param {number} my - Posición Y del clic en el canvas
     * @returns {boolean} true si el clic es sobre la check-valve
     */
    hitTestCheckValve(mx, my) {
        if (!this._cvRect) return false;
        const r = this._cvRect;
        return mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h;
    }
};
