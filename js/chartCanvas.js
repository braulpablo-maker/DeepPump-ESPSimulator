/**
 * DeepPump ESP Simulator — Ammeter Chart (Canvas 2D)
 * Reescrito para usar 3 canvas separados que restauran el estilo anterior
 * pero evitan que la escala aplaste las variables de baja magnitud.
 */

const ChartRenderer = {

    SERIES: {
        amps:      { color: '#1a5fb4', label: 'AMP' },
        ol:        { color: '#ff3333', label: 'OL' },
        ul:        { color: '#ffaa00', label: 'UL' },
        motorTemp: { color: '#00bcd4', label: 'MWT' },
        blpd:      { color: '#fdd835', label: 'BLPD' },
        ftp:       { color: '#2e7d32', label: 'FTP' },
        pip:       { color: '#7b1fa2', label: 'PIP' }
    },

    /**
     * Renderiza los 3 gráficos en sus respectivos canvas
     */
    render(ampCtx, prodCtx, pressCtx, state) {
        if (!state.chartMultiCurve) {
            // Si está en modo solo-amp (click en chart), mostramos solo la curva de amp en el primer chart
            // y limpiamos los otros? O siempre mostramos todo pero solo AMP en el primero?
            // El usuario pidió volver al estilo anterior. Asumiremos que siempre mostramos
            // las 3 curvas de ampers en el gráfico superior.
        }

        this._renderChart(ampCtx, state, ['amps'], true); // true = draw OL/UL lines
        
        if (state.chartMultiCurve) {
            this._renderChart(prodCtx, state, ['motorTemp', 'blpd'], false);
            this._renderChart(pressCtx, state, ['ftp', 'pip'], false);
        } else {
            // Si no es multicurva, limpar
            this._clearChart(prodCtx);
            this._clearChart(pressCtx);
        }
    },

    _clearChart(ctx) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },

    _renderChart(ctx, state, seriesKeys, drawTripLines) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        const m = { left: 10, right: 10, top: 5, bottom: 5 };
        const plotX = m.left;
        const plotY = m.top;
        const plotW = W - m.left - m.right;
        const plotH = H - m.top - m.bottom;

        // Fondo original (claro)
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, W, H);

        // Borde
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(plotX, plotY, plotW, plotH);

        // Cuadrícula
        this._drawGrid(ctx, plotX, plotY, plotW, plotH);

        // Buscar max global del chart para autoescalado
        let maxVal = 1;

        if (drawTripLines) {
            // Para chartAmp, considerar el OL y UL si son razonables
            if (state.ol < 200) maxVal = Math.max(maxVal, state.ol * 1.1);
            maxVal = Math.max(maxVal, state.ul * 1.5);
            const amps = state.history['amps'];
            if (amps) {
                for (let v of amps) if (v > maxVal) maxVal = v;
            }
        } else {
            // Para otros charts
            for (const key of seriesKeys) {
                const data = state.history[key];
                if (!data) continue;
                for (let v of data) {
                    if (v > maxVal) maxVal = v;
                }
            }
        }
        
        const padMax = maxVal * 1.15; // 15% padding superior

        if (drawTripLines) {
            this._drawTripLines(ctx, state, plotX, plotY, plotW, plotH, padMax);
        }

        for (const key of seriesKeys) {
            const data = state.history[key];
            if (!data || data.length < 2) continue;
            this._drawSeries(ctx, data, this.SERIES[key].color, plotX, plotY, plotW, plotH, padMax);
        }
        
        // Eje Y simple a la derecha
        this._drawYAxis(ctx, plotX, plotY, plotW, plotH, padMax);
    },

    _drawGrid(ctx, x, y, w, h) {
        ctx.strokeStyle = '#e8e8e8';
        ctx.lineWidth = 0.5;
        // 3 horizontales
        for (let i = 1; i <= 3; i++) {
            const yy = y + (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke();
        }
        // 10 verticales
        for (let i = 1; i < 10; i++) {
            const xx = x + (i / 10) * w;
            ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke();
        }
    },

    _drawYAxis(ctx, x, y, w, h, maxVal) {
        ctx.fillStyle = '#999';
        ctx.font = '8px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        const marks = [0, 0.5, 1];
        for (const f of marks) {
            const val = maxVal * f;
            const yy = y + h - f * h;
            let text = val >= 1000 ? (val/1000).toFixed(1)+'k' : Math.round(val);
            if (f === 0) text = '0';
            ctx.fillText(text, x + w - 2, yy === y+h ? yy - 4 : yy + 2);
        }
    },

    _drawTripLines(ctx, state, pX, pY, pW, pH, maxVal) {
        ctx.setLineDash([4, 2]);
        ctx.lineWidth = 1.5;

        // OL
        if (state.ol < 200) {
            const y = pY + pH - (state.ol / maxVal) * pH;
            if (y >= pY && y <= pY + pH) {
                ctx.strokeStyle = '#ff3333';
                ctx.beginPath(); ctx.moveTo(pX, y); ctx.lineTo(pX + pW, y); ctx.stroke();
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 9px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`OL ${state.ol}A`, pX + 2, y - 2);
            }
        }

        // UL
        const yUL = pY + pH - (state.ul / maxVal) * pH;
        if (yUL >= pY && yUL <= pY + pH) {
            ctx.strokeStyle = '#ffaa00';
            ctx.beginPath(); ctx.moveTo(pX, yUL); ctx.lineTo(pX + pW, yUL); ctx.stroke();
            ctx.fillStyle = '#ffaa00';
            ctx.font = 'bold 9px Inter, sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`UL ${state.ul}A`, pX + 2, yUL + 2);
        }

        ctx.setLineDash([]);
    },

    _drawSeries(ctx, data, color, pX, pY, pW, pH, maxVal) {
        const n = data.length;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        const maxPts = CONFIG.HISTORY_MAX_POINTS;
        for (let i = 0; i < n; i++) {
            const x = pX + (i / (maxPts - 1)) * pW;
            const val = Math.max(0, data[i]);
            const y = pY + pH - (val / maxVal) * pH;
            const yc = Math.max(pY, Math.min(pY + pH, y));
            if (i === 0) ctx.moveTo(x, yc); else ctx.lineTo(x, yc);
        }
        ctx.stroke();
    }
};
