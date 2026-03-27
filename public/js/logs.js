document.addEventListener('DOMContentLoaded', async () => {
    const logsContainer = document.getElementById('logs');
    const logTypeSelect = document.getElementById('logTypeSelect');
    let autoScroll = true;

    // Si el usuario hace scroll hacia arriba, detenemos el autoscroll
    logsContainer.addEventListener('scroll', () => {
        const isAtBottom = logsContainer.scrollHeight - logsContainer.scrollTop <= logsContainer.clientHeight + 10;
        autoScroll = isAtBottom;
    });

    async function updateLogs() {
        try {
            const logType = logTypeSelect.value;
            const endpoint = logType === 'error' ? '/api/getErrorLogs' : '/api/getLogs';

            const response = await axios.get(endpoint);

            // Reemplazar contenido en lugar de ir sumando para evitar duplicados infinitos
            logsContainer.innerHTML = '';

            const codeContainer = document.createElement('code');
            // Usamos 'language-log' para logs generales o 'language-bash'/'language-plaintext' si preferimos
            codeContainer.className = 'language-log hljs';

            // Limpieza de secuencias ANSI y caracteres especiales
            const rawLogs = response.data.logs || '';
            const cleanLogs = rawLogs
                .replace(/\u001b\[[0-9;]*m/g, '') // Eliminar secuencias ANSI de color de forma robusta
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');

            codeContainer.innerHTML = cleanLogs;

            logsContainer.appendChild(codeContainer);

            // Aplicar highlight.js específicamente a este bloque
            if (typeof hljs !== 'undefined') {
                hljs.highlightElement(codeContainer);
            }

            // Auto-scroll al final
            if (autoScroll) {
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Error al obtener logs:', error);
            codeContainer.innerHTML = 'Error al obtener logs';
        }
    }

    // Actualizar inmediatamente al cambiar el tipo de log
    logTypeSelect.addEventListener('change', () => {
        updateLogs();
    });

    updateLogs();

    // Actualizar logs cada 5 segundos
    setInterval(updateLogs, 5000);
});