/**
 * DeepPump ESP Simulator — Entry Point y Game Loop Principal
 * Inicializa la aplicación, configura los canvas, y ejecuta
 * el loop de simulación a 60fps con actualización de física controlada.
 */

const App = {

    // Referencias a los contextos de canvas
    wellCtx: null,
    ampCtx: null,
    prodCtx: null,
    pressCtx: null,
    curveCtx: null,

    // Control del game loop
    _lastTime: 0,
    _running: true,

    /**
     * Inicialización de la aplicación
     */
    init() {
        // Obtener contextos de los canvas
        this.wellCtx = document.getElementById('well-canvas').getContext('2d');
        this.ampCtx = document.getElementById('chart-amp').getContext('2d');
        this.prodCtx = document.getElementById('chart-prod').getContext('2d');
        this.pressCtx = document.getElementById('chart-press').getContext('2d');
        this.curveCtx = document.getElementById('pump-curve-canvas').getContext('2d');

        // Cargar el caso base
        SimEngine.loadCase('Base Case');

        // Inicializar controles de UI
        Controls.init();

        // Arrancar el game loop
        this._lastTime = performance.now();
        requestAnimationFrame((t) => this._gameLoop(t));

        console.log('DeepPump ESP Simulator — Inicializado correctamente');
    },

    /**
     * Game loop principal
     * Ejecuta a 60fps para animaciones suaves, con control de velocidad
     * de simulación separado.
     * @param {number} timestamp - Timestamp del frame actual (ms)
     */
    _gameLoop(timestamp) {
        if (!this._running) return;

        // Calcular delta time (con cap para evitar saltos grandes)
        const dt = Math.min((timestamp - this._lastTime) / 1000, 0.1);
        this._lastTime = timestamp;

        // Actualizar la física (dt multiplicado por la velocidad de simulación)
        const simDt = dt * simState.simSpeed;
        SimEngine.update(simDt);

        // Renderizar todos los componentes
        this._render();

        // Solicitar siguiente frame
        requestAnimationFrame((t) => this._gameLoop(t));
    },

    /**
     * Renderizar todos los componentes visuales
     */
    _render() {
        // 1. Visualización del pozo
        WellRenderer.render(this.wellCtx, simState);

        // 2. Ammeter Charts (historial dividido en 3)
        ChartRenderer.render(this.ampCtx, this.prodCtx, this.pressCtx, simState);

        // 3. Curva de bomba
        PumpCurveRenderer.render(this.curveCtx, simState);

        // 4. Actualizar displays numéricos del DOM
        Controls.updateDisplays();
    }
};

// =========================================================================
// INICIAR LA APLICACIÓN CUANDO EL DOM ESTÉ LISTO
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
