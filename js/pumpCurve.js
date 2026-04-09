/**
 * DeepPump ESP Simulator — Curva de Bomba (Canvas 2D)
 * Dibuja el gráfico Head vs Rate mostrando:
 * - Curva de catálogo NOMINAL (gris punteado) a frecuencia base (50 Hz)
 * - Curva de catálogo AJUSTADA (azul) al Hz actual, sin desgaste ni viscosidad
 * - Curva de operación REAL (roja) con todos los ajustes aplicados
 * - Zona eficiente (dos puntos negros sobre la curva azul)
 * - Punto de operación actual (naranja brillante)
 * - Handles arrastrables para cambiar CatalogHead y CatalogRate
 */

const PumpCurveRenderer = {

    _dragging: null,
    _handleSize: 10,

    render(ctx, state) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        const m = { left: 50, right: 20, top: 18, bottom: 38 };
        const plotX = m.left;
        const plotY = m.top;
        const plotW = W - m.left - m.right;
        const plotH = H - m.top - m.bottom;

        // Fondo blanco limpio
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        // ── Curva 1: Catálogo base (50 Hz sin ajustes) — para escala
        const Hsi_base = state.catalogHead;
        const Qmax_base = state.catalogRate;

        // ── Curva 2: Catálogo ajustado al Hz actual (sin wear/visc) — azul
        const { Hsi_adj: Hsi_hz, Qmax_adj: Qmax_hz } = Physics.applyAffinityLaws(
            state.catalogHead, state.catalogRate, state.hz, CONFIG.BASE_FREQ
        );

        // ── Curva 3: Operación real (con wear + visc al Hz actual) — roja
        const Hsi_op = state.Hsi_final;
        const Qmax_op = state.Qmax_final;

        // ── Escala: el máximo de todas las curvas + margen
        const maxQ = Math.max(Qmax_base, Qmax_hz, Qmax_op || 0) * 1.18;
        const maxH = Math.max(Hsi_base, Hsi_hz, Hsi_op || 0) * 1.18;

        const qToX = (q) => plotX + (q / maxQ) * plotW;
        const hToY = (h) => plotY + plotH - (h / maxH) * plotH;
        const xToQ = (x) => ((x - plotX) / plotW) * maxQ;
        const yToH = (y) => ((plotY + plotH - y) / plotH) * maxH;

        // 1. Cuadrícula y ejes
        this._drawGrid(ctx, plotX, plotY, plotW, plotH, maxQ, maxH);

        // 2. Curva nominal catálogo (50 Hz) — gris punteado, solo referencia
        ctx.setLineDash([5, 5]);
        this._drawCurve(ctx, Hsi_base, Qmax_base, qToX, hToY, '#aaaaaa', 1.5);
        ctx.setLineDash([]);
        // Label "catalog"
        if (Qmax_base > 0 && Hsi_base > 0) {
            const lblX = qToX(Qmax_base * 0.07);
            const lblY = hToY(Hsi_base * 0.97);
            ctx.fillStyle = '#aaa';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`@ ${CONFIG.BASE_FREQ}Hz`, lblX, lblY + 2);
        }

        // 3. Curva ajustada al Hz actual (azul)
        if (Hsi_hz > 0 && Qmax_hz > 0) {
            this._drawCurve(ctx, Hsi_hz, Qmax_hz, qToX, hToY, '#2255cc', 2.5);
            // Marcadores de zona eficiente sobre la curva azul
            this._drawEfficiencyZone(ctx, Hsi_hz, Qmax_hz, qToX, hToY);
            // Label "@Hz"
            const lblX = qToX(Qmax_hz * 0.07);
            const lblY = hToY(Hsi_hz * 0.97);
            ctx.fillStyle = '#2255cc';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`@ ${Math.round(state.hz)}Hz`, lblX, lblY + 2);
        }

        // 4. Curva de operación real (roja) — solo si difiere de la azul
        const hasDegradation = state.pumpWear > 0 || state.visc > 1.0;
        if (hasDegradation && Hsi_op > 0 && Qmax_op > 0) {
            this._drawCurve(ctx, Hsi_op, Qmax_op, qToX, hToY, '#cc2222', 2);
            // Label "actual"
            const lblX = qToX(Qmax_op * 0.07);
            const lblY = hToY(Hsi_op * 0.97);
            ctx.fillStyle = '#cc2222';
            ctx.font = '9px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText('actual', lblX, lblY + 2);
        } else if (!hasDegradation && Hsi_op > 0 && Qmax_op > 0) {
            // Sin degradación: la curva azul ya es la de operación,
            // solo necesitamos la curva de referencia para el sistema
            // Dibujamos la curva del sistema (cabeza requerida)
            this._drawSystemCurve(ctx, state, qToX, hToY, plotX, plotY, plotW, plotH, maxQ, maxH);
        }

        // 5. Punto de operación
        if (state.running || state.blpd > 0) {
            this._drawOperatingPoint(ctx, state, qToX, hToY);
        }

        // 6. Ejes con labels
        this._drawAxes(ctx, plotX, plotY, plotW, plotH, maxQ, maxH);

        // 7. Leyenda
        this._drawLegend(ctx, plotX, plotY, state, hasDegradation);

        // 8. Handles arrastrables
        this._drawHandles(ctx, plotX, plotY, plotW, plotH);

        this._plotDims = { plotX, plotY, plotW, plotH, maxQ, maxH, xToQ, yToH };
    },

    _drawGrid(ctx, x, y, w, h, maxQ, maxH) {
        ctx.strokeStyle = '#ebebeb';
        ctx.lineWidth = 0.5;

        const qStep = this._niceStep(maxQ, 6);
        const hStep = this._niceStep(maxH, 5);

        ctx.fillStyle = '#888';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let q = qStep; q < maxQ; q += qStep) {
            const xx = x + (q / maxQ) * w;
            ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke();
            ctx.fillText(Math.round(q), xx, y + h + 4);
        }

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let hh = hStep; hh < maxH; hh += hStep) {
            const yy = y + h - (hh / maxH) * h;
            ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
            ctx.fillText(Math.round(hh), x - 4, yy);
        }
    },

    _drawCurve(ctx, Hsi, Qmax, qToX, hToY, color, lineWidth) {
        const pts = Physics.generateCurvePoints(Hsi, Qmax, 80);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const x = qToX(pts[i].q);
            const y = hToY(pts[i].h);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    },

    /** Curva del sistema (Head requerida vs Q) */
    _drawSystemCurve(ctx, state, qToX, hToY, plotX, plotY, plotW, plotH, maxQ, maxH) {
        const pts = [];
        const steps = 50;
        for (let i = 0; i <= steps; i++) {
            const Q = (i / steps) * maxQ;
            if (Q <= 0) continue;
            const pip = Math.max(0, state.sbhp - Q / Math.max(0.01, state.pi));
            const ftp = CONFIG.FTP_BASE;
            const systemHead = (CONFIG.PUMP_DEPTH * state.liqSG / CONFIG.PSI_TO_FT_WATER + ftp - pip)
                               * CONFIG.PSI_TO_FT_WATER / state.liqSG;
            if (systemHead > 0 && systemHead < maxH * 1.5) {
                pts.push({ q: Q, h: systemHead });
            }
        }
        if (pts.length < 2) return;

        ctx.strokeStyle = '#229944';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
            const x = qToX(pts[i].q);
            const y = hToY(pts[i].h);
            const yc = Math.max(plotY, Math.min(plotY + plotH, y));
            if (i === 0) ctx.moveTo(x, yc); else ctx.lineTo(x, yc);
        }
        ctx.stroke();
        ctx.setLineDash([]);
    },

    _drawEfficiencyZone(ctx, Hsi, Qmax, qToX, hToY) {
        const qLow  = Qmax * CONFIG.EFFICIENT_ZONE_LOW;
        const qHigh = Qmax * CONFIG.EFFICIENT_ZONE_HIGH;
        const hLow  = Physics.pumpCurveHead(qLow,  Hsi, Qmax);
        const hHigh = Physics.pumpCurveHead(qHigh, Hsi, Qmax);

        ctx.fillStyle = '#111';
        [{ q: qLow, h: hLow }, { q: qHigh, h: hHigh }].forEach(pt => {
            ctx.beginPath();
            ctx.arc(qToX(pt.q), hToY(pt.h), 5, 0, Math.PI * 2);
            ctx.fill();
        });
    },

    _drawOperatingPoint(ctx, state, qToX, hToY) {
        if (state.blpd <= 0 && state.head <= 0) return;
        const x = qToX(state.blpd);
        const y = hToY(state.head);

        // Halo pulsante (intensidad según si está corriendo)
        const alpha = state.running ? 0.35 : 0.15;
        ctx.fillStyle = `rgba(255, 100, 0, ${alpha})`;
        ctx.beginPath(); ctx.arc(x, y, 12, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = state.running ? '#ff6600' : '#cc8844';
        ctx.strokeStyle = '#aa3300';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();

        // Crosshaire suave
        ctx.strokeStyle = 'rgba(255,100,0,0.4)';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x, y - 14); ctx.lineTo(x, y + 14);
        ctx.moveTo(x - 14, y); ctx.lineTo(x + 14, y);
        ctx.stroke();
    },

    _drawAxes(ctx, x, y, w, h, maxQ, maxH) {
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x, y + h); ctx.lineTo(x + w, y + h);
        ctx.stroke();

        ctx.fillStyle = '#444';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Rate (BLPD)', x + w / 2, y + h + 22);

        ctx.save();
        ctx.translate(11, y + h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Head (ft)', 0, 0);
        ctx.restore();
    },

    _drawLegend(ctx, plotX, plotY, state, hasDegradation) {
        const items = [
            { color: '#aaaaaa', dash: true,  label: `${CONFIG.BASE_FREQ}Hz catalog` },
            { color: '#2255cc', dash: false, label: `${Math.round(state.hz)}Hz adjusted` },
        ];
        if (hasDegradation) {
            items.push({ color: '#cc2222', dash: false, label: 'actual (worn/visc)' });
        }
        items.push({ color: '#229944', dash: true, label: 'system curve' });

        let lx = plotX + 8;
        let ly = plotY + 4;
        ctx.font = '8.5px Inter, sans-serif';
        ctx.textBaseline = 'middle';

        items.forEach(item => {
            ctx.strokeStyle = item.color;
            ctx.lineWidth = 1.5;
            if (item.dash) ctx.setLineDash([4, 3]);
            ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#555';
            ctx.textAlign = 'left';
            ctx.fillText(item.label, lx + 21, ly);
            ly += 14;
        });
    },

    _drawHandles(ctx, plotX, plotY, plotW, plotH) {
        const hs = this._handleSize;
        ctx.fillStyle = '#aaaaaa';
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;

        // Handle Head (arriba-izquierda)
        ctx.fillRect(plotX - hs - 2, plotY - hs / 2, hs, hs);
        ctx.strokeRect(plotX - hs - 2, plotY - hs / 2, hs, hs);
        // Triángulo indicador dentro del handle
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(plotX - hs/2 - 2, plotY - hs/2 + 2);
        ctx.lineTo(plotX - hs/2 - 2, plotY + hs/2 - 2);
        ctx.lineTo(plotX - 2, plotY);
        ctx.fill();
        this._headHandleRect = { x: plotX - hs - 2, y: plotY - hs / 2, w: hs, h: hs };

        // Handle Rate (abajo-derecha)
        ctx.fillStyle = '#aaaaaa';
        ctx.fillRect(plotX + plotW + 2, plotY + plotH - hs / 2, hs, hs);
        ctx.strokeRect(plotX + plotW + 2, plotY + plotH - hs / 2, hs, hs);
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(plotX + plotW + 4, plotY + plotH - hs/2 + 2);
        ctx.lineTo(plotX + plotW + 4, plotY + plotH + hs/2 - 2);
        ctx.lineTo(plotX + plotW + hs + 2, plotY + plotH);
        ctx.fill();
        this._rateHandleRect = { x: plotX + plotW + 2, y: plotY + plotH - hs / 2, w: hs, h: hs };
    },

    _niceStep(maxVal, targetDivisions) {
        if (maxVal <= 0) return 1;
        const rough = maxVal / targetDivisions;
        const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
        const residual = rough / magnitude;
        let nice;
        if (residual <= 1.5) nice = 1;
        else if (residual <= 3) nice = 2;
        else if (residual <= 7) nice = 5;
        else nice = 10;
        return nice * magnitude;
    },

    hitTestHandle(mx, my) {
        const margin = 8;
        if (this._headHandleRect) {
            const r = this._headHandleRect;
            if (mx >= r.x - margin && mx <= r.x + r.w + margin &&
                my >= r.y - margin && my <= r.y + r.h + margin) return 'head';
        }
        if (this._rateHandleRect) {
            const r = this._rateHandleRect;
            if (mx >= r.x - margin && mx <= r.x + r.w + margin &&
                my >= r.y - margin && my <= r.y + r.h + margin) return 'rate';
        }
        return null;
    },

    dragHandle(handleType, mx, my) {
        if (!this._plotDims) return;
        const { plotX, plotY, plotW, plotH, maxQ, maxH } = this._plotDims;
        const ranges = CONFIG.RANGES;

        if (handleType === 'head') {
            const h = ((plotY + plotH - my) / plotH) * maxH;
            const ratio = simState.hz > 0 ? CONFIG.BASE_FREQ / simState.hz : 1;
            const catalogH = h * ratio * ratio;
            simState.catalogHead = Math.max(ranges.catalogHead.min,
                Math.min(ranges.catalogHead.max, Math.round(catalogH / 100) * 100));
        } else if (handleType === 'rate') {
            const q = ((mx - plotX) / plotW) * maxQ;
            const ratio = simState.hz > 0 ? CONFIG.BASE_FREQ / simState.hz : 1;
            const catalogQ = q * ratio;
            simState.catalogRate = Math.max(ranges.catalogRate.min,
                Math.min(ranges.catalogRate.max, Math.round(catalogQ / 100) * 100));
        }
    }
};
