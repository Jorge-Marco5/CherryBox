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
            const rawLogs = response.data.logs || '';

            // Reemplazar contenido por completo para evitar saltos raros
            logsContainer.innerHTML = '';

            const lines = rawLogs.split('\n').filter(line => line.trim() !== '');

            lines.forEach(line => {
                const logLine = document.createElement('div');
                logLine.className = 'log-line';

                // Detección de nivel y limpieza
                let level = 'info';
                let icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';

                if (line.toLowerCase().includes('error')) {
                    level = 'error';
                    logLine.classList.add('log-line-error');
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
                } else if (line.toLowerCase().includes('warn')) {
                    level = 'warn';
                    logLine.classList.add('log-line-warn');
                    icon = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
                }

                // Parsear timestamp si existe (formato: YYYY-MM-DD HH:mm:ss)
                const timestampMatch = line.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
                const timestamp = timestampMatch ? timestampMatch[0] : '';
                const message = timestamp ? line.replace(timestamp, '').trim() : line;

                // Limpieza de secuencias ANSI y caracteres especiales
                const cleanMessage = message
                    .replace(/\u001b\[[0-9;]*m/g, '') // Eliminar secuencias ANSI de color de forma robusta
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                logLine.innerHTML = `
                    <span class="log-icon level-${level}">${icon}</span>
                    <span class="log-timestamp">${timestamp}</span>
                    <span class="log-level level-${level}">${level}</span>
                    <span class="log-message">${cleanMessage}</span>
                `;

                logsContainer.appendChild(logLine);
            });

            // Auto-scroll al final
            if (autoScroll) {
                logsContainer.scrollTop = logsContainer.scrollHeight;
            }
        } catch (error) {
            console.error('Error al obtener logs:', error);
            if (error.response && error.response.status === 403) {
                logsContainer.parentElement.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #ff4d4d; background: #1a1a1a; border-radius: 15px; border: 1px solid #333;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v2m0 4v.01m-6.938 4h13.876c1.1 0 1.938-.838 1.938-1.938V6.938c0-1.1-.838-1.938-1.938-1.938H5.062C3.962 5 3.125 5.838 3.125 6.938v10.124c0 1.1.838 1.938 1.938 1.938zM3 3l18 18"/></svg>
                    <h2 style="margin-top: 20px; color: #fff;">Acceso Restringido</h2>
                    <p style="color: #888;">Solo los administradores pueden ver los logs del sistema.</p>
                </div>
                `;
            } else if (error.response && error.response.status === 401) {
                window.location.href = '/login';
            } else {
                logsContainer.innerHTML = '<div class="log-line log-line-error"><span class="log-message">Error al obtener logs</span></div>';
            }
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