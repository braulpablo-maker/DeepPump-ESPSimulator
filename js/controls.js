/**
 * DeepPump ESP Simulator — Controles de Interfaz de Usuario
 * Event handlers para todos los botones, sliders, y elementos interactivos.
 * Incluye sistema de tooltip personalizado y actualización de displays con
 * colores de advertencia para temperatura y GVF.
 */

const Controls = {

    /**
     * Inicializar todos los event handlers del UI
     */
    init() {
        // Sistema de tooltips personalizado
        this._initTooltips();

        // Botón de encendido/apagado
        const btnPower = document.getElementById('btn-power');
        btnPower.addEventListener('click', () => {
            SimEngine.togglePump();
            this._updatePowerButton();
        });

        // Botones VFD: HZ, OL, UL
        const vfdBtns = document.querySelectorAll('.btn-vfd');
        vfdBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                simState.selectedVFDParam = btn.dataset.param;
                vfdBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._updateVFDSlider();
            });
        });

        // Slider VFD
        const vfdSlider = document.getElementById('vfd-slider');
        vfdSlider.addEventListener('input', () => {
            simState[simState.selectedVFDParam] = parseFloat(vfdSlider.value);
        });

        // Botones de parámetros
        const paramBtns = document.querySelectorAll('.btn-param');
        paramBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                simState.selectedParam = btn.dataset.param;
                paramBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._updateParamSlider();
                this._updateParamDisplay();
            });
        });

        // Slider de parámetros
        const paramSlider = document.getElementById('param-slider');
        paramSlider.addEventListener('input', () => {
            simState[simState.selectedParam] = parseFloat(paramSlider.value);
            this._updateParamDisplay();
        });

        // Slider de Choke
        document.getElementById('choke-slider').addEventListener('input', (e) => {
            simState.choke = parseFloat(e.target.value);
        });

        // Slider de velocidad
        document.getElementById('speed-slider').addEventListener('input', (e) => {
            simState.simSpeed = parseFloat(e.target.value);
            document.getElementById('speed-value').textContent =
                simState.simSpeed.toFixed(1) + 'x';
        });

        // Botones de casos
        document.getElementById('btn-prev-case').addEventListener('click', () => {
            SimEngine.prevCase();
            this._updateAllControls();
        });
        document.getElementById('btn-next-case').addEventListener('click', () => {
            SimEngine.nextCase();
            this._updateAllControls();
        });
        document.getElementById('btn-reset').addEventListener('click', () => {
            SimEngine.reset();
            this._updateAllControls();
        });

        // Click en canvas del pozo (check-valve)
        const wellCanvas = document.getElementById('well-canvas');
        wellCanvas.addEventListener('click', (e) => {
            const rect = wellCanvas.getBoundingClientRect();
            const scaleX = wellCanvas.width / rect.width;
            const scaleY = wellCanvas.height / rect.height;
            const mx = (e.clientX - rect.left) * scaleX;
            const my = (e.clientY - rect.top) * scaleY;
            if (WellRenderer.hitTestCheckValve(mx, my)) {
                simState.checkValve = !simState.checkValve;
            }
        });

        // Click en paneles de gráficos (si se quisiera restaurar la funcionalidad de toggle, pero ahora siempre están las 3 visibles)
        // Se omite para evitar error de null.

        // Mouse en pump curve canvas (arrastre de handles)
        const curveCanvas = document.getElementById('pump-curve-canvas');
        curveCanvas.addEventListener('mousedown', (e) => {
            const { mx, my } = this._canvasCoords(curveCanvas, e);
            const hit = PumpCurveRenderer.hitTestHandle(mx, my);
            if (hit) { PumpCurveRenderer._dragging = hit; e.preventDefault(); }
        });
        curveCanvas.addEventListener('mousemove', (e) => {
            if (!PumpCurveRenderer._dragging) return;
            const { mx, my } = this._canvasCoords(curveCanvas, e);
            PumpCurveRenderer.dragHandle(PumpCurveRenderer._dragging, mx, my);
        });
        const stopDrag = () => { PumpCurveRenderer._dragging = null; };
        curveCanvas.addEventListener('mouseup', stopDrag);
        curveCanvas.addEventListener('mouseleave', stopDrag);

        // Touch support para la curva
        curveCanvas.addEventListener('touchstart', (e) => {
            const t = e.touches[0];
            const { mx, my } = this._canvasCoords(curveCanvas, t);
            const hit = PumpCurveRenderer.hitTestHandle(mx, my);
            if (hit) { PumpCurveRenderer._dragging = hit; e.preventDefault(); }
        }, { passive: false });
        curveCanvas.addEventListener('touchmove', (e) => {
            if (!PumpCurveRenderer._dragging) return;
            const t = e.touches[0];
            const { mx, my } = this._canvasCoords(curveCanvas, t);
            PumpCurveRenderer.dragHandle(PumpCurveRenderer._dragging, mx, my);
            e.preventDefault();
        }, { passive: false });
        curveCanvas.addEventListener('touchend', stopDrag);

        this._updateAllControls();
    },

    // =====================================================================
    // SISTEMA DE TOOLTIPS
    // =====================================================================

    _initTooltips() {
        const tooltip = document.getElementById('custom-tooltip');
        let hideTimeout = null;

        const showTooltip = (el, e) => {
            const text = el.getAttribute('data-tooltip');
            if (!text) return;
            clearTimeout(hideTimeout);
            tooltip.textContent = text;
            tooltip.classList.add('show');
            this._positionTooltip(tooltip, e);
        };

        const moveTooltip = (e) => {
            if (!tooltip.classList.contains('show')) return;
            this._positionTooltip(tooltip, e);
        };

        const hideTooltip = () => {
            hideTimeout = setTimeout(() => {
                tooltip.classList.remove('show');
            }, 80);
        };

        // Delegación de eventos en el documento (abarca todos los elementos)
        document.addEventListener('mouseover', (e) => {
            const el = e.target.closest('[data-tooltip]');
            if (el) showTooltip(el, e);
        });
        document.addEventListener('mousemove', (e) => {
            const el = e.target.closest('[data-tooltip]');
            if (el) moveTooltip(e);
        });
        document.addEventListener('mouseout', (e) => {
            const related = e.relatedTarget;
            if (related && related.closest('[data-tooltip]')) return;
            hideTooltip();
        });
    },

    _positionTooltip(tooltip, e) {
        const margin = 14;
        const tw = tooltip.offsetWidth || 240;
        const th = tooltip.offsetHeight || 50;
        let x = e.clientX + margin;
        let y = e.clientY + margin;

        // Evitar salir de la pantalla por la derecha/abajo
        if (x + tw > window.innerWidth - 8)  x = e.clientX - tw - margin;
        if (y + th > window.innerHeight - 8) y = e.clientY - th - margin;

        tooltip.style.left = x + 'px';
        tooltip.style.top  = y + 'px';
    },

    // =====================================================================
    // UTILIDADES
    // =====================================================================

    /** Obtener coordenadas del mouse/touch en el espacio del canvas */
    _canvasCoords(canvas, e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            mx: (e.clientX - rect.left) * scaleX,
            my: (e.clientY - rect.top) * scaleY
        };
    },

    // =====================================================================
    // ACTUALIZACIÓN DE CONTROLES
    // =====================================================================

    _updateAllControls() {
        this._updatePowerButton();
        this._updateVFDSlider();
        this._updateParamSlider();
        this._updateParamDisplay();
        this._updateChokeSlider();
        this._updateCaseDisplay();
        this._updateSpeedSlider();
    },

    _updatePowerButton() {
        const btn = document.getElementById('btn-power');
        if (simState.running) {
            btn.classList.replace('off', 'on');
        } else {
            btn.classList.replace('on', 'off');
        }
    },

    _updateVFDSlider() {
        const param = simState.selectedVFDParam;
        const range = CONFIG.RANGES[param];
        if (!range) return;
        const slider = document.getElementById('vfd-slider');
        slider.min = range.min;
        slider.max = range.max;
        slider.step = range.step;
        slider.value = simState[param];
    },

    _updateParamSlider() {
        const param = simState.selectedParam;
        const range = CONFIG.RANGES[param];
        if (!range) return;
        const slider = document.getElementById('param-slider');
        slider.min = range.min;
        slider.max = range.max;
        slider.step = range.step;
        slider.value = simState[param];
    },

    _updateParamDisplay() {
        const param = simState.selectedParam;
        const range = CONFIG.RANGES[param];
        if (!range) return;
        document.getElementById('param-name').textContent = range.label;
        const val = simState[param];
        const formatted = (range.step < 1) ? val.toFixed(2) : Math.round(val);
        document.getElementById('param-value').textContent = formatted;
        // Unidad (si existe el elemento)
        const unitEl = document.getElementById('param-unit');
        if (unitEl) unitEl.textContent = range.unit || '';
    },

    _updateChokeSlider() {
        document.getElementById('choke-slider').value = simState.choke;
    },

    _updateCaseDisplay() {
        document.getElementById('case-display').textContent = simState.currentCase;
    },

    _updateSpeedSlider() {
        document.getElementById('speed-slider').value = simState.simSpeed;
        document.getElementById('speed-value').textContent =
            simState.simSpeed.toFixed(1) + 'x';
    },

    // =====================================================================
    // ACTUALIZACIÓN DE DISPLAYS (cada frame desde app.js)
    // =====================================================================

    updateDisplays() {
        const s = simState;

        // VFD display
        document.getElementById('vfd-hz').textContent   = Math.round(s.hz);
        document.getElementById('vfd-amps').textContent = s.amps.toFixed(1);

        // Sincronizar VFD slider si no está siendo arrastrado
        const vfdSlider = document.getElementById('vfd-slider');
        if (document.activeElement !== vfdSlider) {
            vfdSlider.value = s[s.selectedVFDParam];
        }

        // FTP
        document.getElementById('ftp-value').textContent = Math.round(s.ftp);

        // Choke / BPD
        document.getElementById('choke-value').textContent = Math.round(s.choke);
        document.getElementById('bpd-value').textContent   = Math.round(s.avgBPD);

        // Panel datos calculados
        document.getElementById('data-bhp').textContent   = Math.round(s.bhp);
        document.getElementById('data-blpd').textContent  = Math.round(s.blpd);
        document.getElementById('data-head').textContent  = Math.round(s.head);
        document.getElementById('data-pdp').textContent   = Math.round(s.pdp);
        document.getElementById('data-pip').textContent   = Math.round(s.pip);
        document.getElementById('data-pumpsg').textContent = s.pumpSG.toFixed(2);
        document.getElementById('data-gvf').textContent   = Math.round(s.gvf * 100);

        // Temperatura — clases de advertencia
        const tempEl = document.getElementById('data-temp');
        tempEl.textContent = Math.round(s.motorTemp);
        tempEl.className = 'data-value';
        if (s.motorTemp > 400) tempEl.classList.add('crit-temp');
        else if (s.motorTemp > 300) tempEl.classList.add('warn-temp');

        // GVF — clases de advertencia
        const gvfEl = document.getElementById('data-gvf');
        gvfEl.textContent = Math.round(s.gvf * 100);
        gvfEl.className = 'data-value';
        if (s.gvf > CONFIG.GAS_LOCK_THRESHOLD) gvfEl.classList.add('crit-gvf');
        else if (s.gvf > 0.40) gvfEl.classList.add('warn-gvf');

        // Param slider sincronización
        const paramSlider = document.getElementById('param-slider');
        if (document.activeElement !== paramSlider) {
            paramSlider.value = s[s.selectedParam];
        }
        this._updateParamDisplay();

        // Botón de encendido
        this._updatePowerButton();

        // Indicador de trip
        const tripEl = document.getElementById('trip-indicator');
        if (s.tripped && s.tripType === 'OL') {
            tripEl.textContent = 'TRIP OL';
            tripEl.className = 'trip-active';
        } else if (s.tripped && s.tripType === 'UL') {
            tripEl.textContent = 'TRIP UL';
            tripEl.className = 'trip-active';
        } else if (s.running) {
            tripEl.textContent = 'RUNNING';
            tripEl.className = 'trip-running';
        } else {
            tripEl.textContent = 'STOPPED';
            tripEl.className = 'trip-off';
        }

        // Indicador de gas lock
        const gasLockEl = document.getElementById('gas-lock-indicator');
        if (gasLockEl) {
            if (s.gasLocked) {
                gasLockEl.className = 'gas-lock-active';
            } else {
                gasLockEl.className = 'gas-lock-hidden';
            }
        }

        // Flash del display VFD durante trip
        const vfdDisplay = document.getElementById('vfd-display');
        if (s.tripped) {
            vfdDisplay.classList.add('trip-flash');
        } else {
            vfdDisplay.classList.remove('trip-flash');
        }

        // Actualizar case display
        this._updateCaseDisplay();
    }
};
