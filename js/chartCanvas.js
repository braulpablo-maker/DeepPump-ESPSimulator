/**
 * DeepPump ESP Simulator — Ammeter Chart (Canvas 2D)
 * 3 canvas separados con escalado inteligente que prioriza la
 * visibilidad de los datos sin perder el contexto de los límites de seguridad.
 *
 * Mejoras:
 * - Autoescalado basado en datos reales (no dominado por OL/UL)
 * - Eje Y con ticks "nice" y labels legibles a la izquierda
 * - Indicadores de OL/UL en borde cuando están fuera de rango
 * - Rango mínimo para evitar zoom excesivo en señales planas
 * - Labels de serie con valor actual en tiempo real
 */

const ChartRenderer = {

    SERIES: {
        amps:      { color: '#1a5fb4', label: 'AMP',  unit: 'A'   },
        hz:        { color: '#ff8c00', label: 'HZ',   unit: 'Hz'  },
        ol:        { color: '#ff3333', label: 'OL',   unit: 'A'   },
        ul:        { color: '#ffaa00', label: 'UL',   unit: 'A'   },
        motorTemp: { color: '#00bcd4', label: 'MWT',  unit: '°F'  },
        blpd:      { color: '#e69516', label: 'BLPD', unit: 'BPD' },
        ftp:       { color: '#2e7d32', label: 'FTP',  unit: 'psi' },
        pip:       { color: '#7b1fa2', label: 'PIP',  unit: 'psi' }
    },

    // Rangos mínimos por tipo de chart para evitar zoom excesivo
    MIN_RANGES: {
        amp:   20,    // Al menos 20A de rango visible
        prod:  50,    // Al menos 50 unidades (°F o BLPD)
        press: 100    // Al menos 100 psi de rango visible
    },

    /**
     * Renderiza los 3 gráficos en sus respectivos canvas
     */
    render(ampCtx, prodCtx, pressCtx, state) {
        this._renderChart(ampCtx, state, ['amps', 'hz'], 'amp', true);

        if (state.chartMultiCurve) {
            this._renderChart(prodCtx, state, ['motorTemp', 'blpd'], 'prod', false);
            this._renderChart(pressCtx, state, ['ftp', 'pip'], 'press', false);
        } else {
            this._clearChart(prodCtx);
            this._clearChart(pressCtx);
        }
    },

    _clearChart(ctx) {
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    },

    _renderChart(ctx, state, seriesKeys, chartType, drawTripLines) {
        const W = ctx.canvas.width;
        const H = ctx.canvas.height;

        // Márgenes más amplios para el eje Y a la izquierda
        const m = { left: 40, right: 8, top: 4, bottom: 4 };
        const plotX = m.left;
        const plotY = m.top;
        const plotW = W - m.left - m.right;
        const plotH = H - m.top - m.bottom;

        // Fondo
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, W, H);

        // Borde del área de plot
        ctx.strokeStyle = '#ddd';
        ctx.lineWidth = 1;
        ctx.strokeRect(plotX, plotY, plotW, plotH);

        // ── Calcular rango del eje Y basado en datos reales ──
        const { minVal, maxVal } = this._computeRange(state, seriesKeys, chartType, drawTripLines);

        // ── Cuadrícula con ticks nice ──
        const ticks = this._computeNiceTicks(minVal, maxVal, 4);
        this._drawGridAndTicks(ctx, plotX, plotY, plotW, plotH, minVal, maxVal, ticks);

        // ── Líneas de OL/UL (chart de amperaje) ──
        if (drawTripLines) {
            this._drawTripLines(ctx, state, plotX, plotY, plotW, plotH, minVal, maxVal);
        }

        // ── Dibujar series con labels de valor actual ──
        for (let i = 0; i < seriesKeys.length; i++) {
            const key = seriesKeys[i];
            const data = state.history[key];
            if (!data || data.length < 2) continue;
            const series = this.SERIES[key];
            this._drawSeries(ctx, data, series.color, plotX, plotY, plotW, plotH, minVal, maxVal);

            // Label con valor actual al final de la línea
            const lastVal = data[data.length - 1];
            this._drawCurrentValueLabel(ctx, lastVal, series, plotX, plotY, plotW, plotH, minVal, maxVal, i);
        }
    },

    /**
     * Calcular rango min/max inteligente basado en datos reales.
     * - Chart AMP: escala por pasos fijos (0-50, 0-100, 0-150, 0-200)
     * - Otros charts: autoescalado con nice ticks
     */
    _computeRange(state, seriesKeys, chartType, drawTripLines) {
        let dataMin = Infinity;
        let dataMax = -Infinity;
        let hasData = false;

        for (const key of seriesKeys) {
            const data = state.history[key];
            if (!data) continue;
            for (let v of data) {
                if (v > dataMax) dataMax = v;
                if (v < dataMin) dataMin = v;
                hasData = true;
            }
        }

        if (!hasData) {
            dataMin = 0;
            dataMax = 10;
        }

        let minVal = 0;
        let maxVal;

        if (drawTripLines) {
            // ── CHART AMP: escala por pasos fijos de 50 ──
            // Considerar también OL y UL para decidir el paso
            const ol = state.ol || 200;
            const ul = state.ul || 0;
            const peakVal = Math.max(dataMax, ul);
            // Incluir OL si está habilitado y es razonable
            const relevantMax = (ol < 200) ? Math.max(peakVal, ol) : peakVal;

            // Pasos: 50, 100, 150, 200...
            const step = 50;
            maxVal = Math.max(step, Math.ceil(relevantMax / step) * step);
        } else {
            // ── OTROS CHARTS: autoescalado dinámico ──
            maxVal = Math.max(dataMax, 1);

            // Rango mínimo para evitar zoom excesivo
            const minRange = this.MIN_RANGES[chartType] || 10;
            if (maxVal - minVal < minRange) {
                maxVal = minVal + minRange;
            }

            // Padding superior del 12%
            maxVal *= 1.12;
        }

        return { minVal, maxVal };
    },

    /**
     * Generar ticks "nice" para el eje Y
     */
    _computeNiceTicks(minVal, maxVal, targetCount) {
        const range = maxVal - minVal;
        if (range <= 0) return [0];

        const roughStep = range / targetCount;
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)));
        const residual = roughStep / magnitude;

        let niceStep;
        if (residual <= 1.5) niceStep = 1 * magnitude;
        else if (residual <= 3) niceStep = 2 * magnitude;
        else if (residual <= 7) niceStep = 5 * magnitude;
        else niceStep = 10 * magnitude;

        const ticks = [];
        const start = Math.ceil(minVal / niceStep) * niceStep;
        for (let v = start; v <= maxVal; v += niceStep) {
            ticks.push(Math.round(v * 1000) / 1000); // evitar errores de float
        }
        return ticks;
    },

    /**
     * Cuadrícula y etiquetas del eje Y a la izquierda
     */
    _drawGridAndTicks(ctx, x, y, w, h, minVal, maxVal, ticks) {
        const range = maxVal - minVal;
        if (range <= 0) return;

        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (const val of ticks) {
            const frac = (val - minVal) / range;
            const yy = y + h - frac * h;

            // Línea de cuadrícula
            ctx.strokeStyle = '#e8e8e8';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, yy);
            ctx.lineTo(x + w, yy);
            ctx.stroke();

            // Label del tick
            ctx.fillStyle = '#888';
            let text;
            if (val >= 10000) text = (val / 1000).toFixed(0) + 'k';
            else if (val >= 1000) text = (val / 1000).toFixed(1) + 'k';
            else text = Math.round(val).toString();
            ctx.fillText(text, x - 4, yy);
        }

        // Label "0" en la base si no está en los ticks
        if (ticks.length === 0 || ticks[0] > minVal + range * 0.05) {
            const yBase = y + h;
            ctx.fillStyle = '#aaa';
            ctx.fillText('0', x - 4, yBase - 3);
        }

        // Líneas de cuadrícula verticales (cada 10%)
        ctx.strokeStyle = '#f0f0f0';
        ctx.lineWidth = 0.5;
        for (let i = 1; i < 10; i++) {
            const xx = x + (i / 10) * w;
            ctx.beginPath();
            ctx.moveTo(xx, y);
            ctx.lineTo(xx, y + h);
            ctx.stroke();
        }
    },

    /**
     * Líneas de trip OL/UL con indicadores inteligentes
     * Si la línea está dentro del rango visible, se dibuja normalmente.
     * Si está fuera (ej. OL muy alto), se muestra un indicador en el borde superior.
     */
    _drawTripLines(ctx, state, pX, pY, pW, pH, minVal, maxVal) {
        const range = maxVal - minVal;
        if (range <= 0) return;

        ctx.setLineDash([4, 2]);
        ctx.lineWidth = 1.5;

        // ── OL ──
        if (state.ol < 200) {
            const olFrac = (state.ol - minVal) / range;

            if (olFrac >= 0 && olFrac <= 1) {
                // OL visible dentro del rango → dibujar línea completa
                const y = pY + pH - olFrac * pH;
                ctx.strokeStyle = '#ff3333';
                ctx.beginPath(); ctx.moveTo(pX, y); ctx.lineTo(pX + pW, y); ctx.stroke();
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 9px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`OL ${state.ol}A`, pX + 2, y - 2);
            } else if (olFrac > 1) {
                // OL fuera de rango (arriba) → indicador en el borde superior
                ctx.fillStyle = '#ff3333';
                ctx.font = 'bold 8px Inter, sans-serif';
                ctx.textAlign = 'right';
                ctx.textBaseline = 'top';
                ctx.fillText(`↑ OL ${state.ol}A`, pX + pW - 2, pY + 2);
            }
        }

        // ── UL ──
        const ulFrac = (state.ul - minVal) / range;
        if (ulFrac >= 0 && ulFrac <= 1) {
            const yUL = pY + pH - ulFrac * pH;
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

    /**
     * Dibujar una serie de datos
     */
    _drawSeries(ctx, data, color, pX, pY, pW, pH, minVal, maxVal) {
        const n = data.length;
        const range = maxVal - minVal;
        if (range <= 0) return;

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        const maxPts = CONFIG.HISTORY_MAX_POINTS;
        for (let i = 0; i < n; i++) {
            const x = pX + (i / (maxPts - 1)) * pW;
            const val = Math.max(0, data[i]);
            const frac = (val - minVal) / range;
            const y = pY + pH - frac * pH;
            const yc = Math.max(pY, Math.min(pY + pH, y));
            if (i === 0) ctx.moveTo(x, yc); else ctx.lineTo(x, yc);
        }
        ctx.stroke();
    },

    /**
     * Label del valor actual al final de cada serie
     * (aparece como badge coloreado al extremo derecho de la línea)
     */
    _drawCurrentValueLabel(ctx, value, series, pX, pY, pW, pH, minVal, maxVal, index) {
        const range = maxVal - minVal;
        if (range <= 0 || value === undefined || value === null) return;

        const frac = (Math.max(0, value) - minVal) / range;
        const yPos = pY + pH - frac * pH;
        const xPos = pX + pW;

        // Formatear valor
        let text;
        if (value >= 10000) text = (value / 1000).toFixed(1) + 'k';
        else if (value >= 100) text = Math.round(value).toString();
        else if (value >= 10) text = value.toFixed(1);
        else text = value.toFixed(2);

        // Evitar que los labels se superpongan (offset vertical basado en index)
        const yOffset = 0;
        const yFinal = Math.max(pY + 6, Math.min(pY + pH - 4, yPos + yOffset));

        // Fondo del badge
        ctx.font = 'bold 8px Inter, sans-serif';
        const textWidth = ctx.measureText(text).width;
        const badgeW = textWidth + 6;
        const badgeH = 12;
        const badgeX = xPos - badgeW - 1;
        const badgeY = yFinal - badgeH / 2;

        ctx.fillStyle = series.color;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.globalAlpha = 1.0;

        // Texto del badge
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, xPos - 4, yFinal);
    }
};
