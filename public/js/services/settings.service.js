document.addEventListener("DOMContentLoaded", () => {
    const formSettings = document.getElementById("form-settings");
    const baseDir = document.getElementById("baseDir");
    const limitStorage = document.getElementById("limitStorage");
    const maxFileSize = document.getElementById("maxFileSize");
    const maxFiles = document.getElementById("maxFiles");
    const btnSave = document.getElementById("btn-save");
    const btnSync = document.getElementById("btn-sync");
    const btnAnalyze = document.getElementById("btn-analyze");

    async function getSettings() {
        try {
            const response = await axios.get("/api/getSettings");
            limitStorage.value = response.data.limitStorage;
            baseDir.value = response.data.baseDir;
            maxFileSize.value = response.data.maxFileSize;
            maxFiles.value = response.data.maxFiles;

            if (!response.data.permission) {
                // Modo lectura para administradores (no superadmins)
                baseDir.disabled = true;
                limitStorage.disabled = true;
                maxFileSize.disabled = true;
                maxFiles.disabled = true;
                if (btnSave) btnSave.style.display = "none";
                if (btnSync) btnSync.style.display = "none";
                if (btnAnalyze) btnAnalyze.style.display = "none";

                // Añadir mensaje informativo
                const infoMsg = document.createElement("p");
                infoMsg.className = "message-alert";
                infoMsg.style.background = "rgba(100, 100, 255, 0.1)";
                infoMsg.style.borderColor = "#6464ff";
                infoMsg.innerText = "Modo de solo lectura: Solo el Superadministrador puede modificar estos ajustes.";
                formSettings.prepend(infoMsg);
            }
        } catch (error) {
            console.error(error);
            if (error.response && error.response.status === 403) {
                formSettings.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #ff4d4d;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock-off"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 11h2a2 2 0 0 1 2 2v2m0 4a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2h4" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-3m.712 -3.277a3.5 3.5 0 0 1 6.288 2.277v3" /><path d="M3 3l18 18" /></svg>
                    <h2 style="margin-top: 20px;">Acceso Denegado</h2>
                    <p style="color: #888;">No tienes los permisos suficientes para ver esta información.</p>
                    <a href="/" class="btn btn-primary" style="display: inline-block; margin-top: 15px;">Volver al Inicio</a>
                </div>
                `;
            } else if (error.response && error.response.status === 401) {
                window.location.href = '/login';
            } else {
                showToast(error.response?.data?.error || "Error al obtener la configuración", 'error');
            }
        }
    }

    getSettings();

    const generalSettings = document.getElementById("general-settings");
    generalSettings.addEventListener("submit", async (e) => {
        e.preventDefault();
        try {

            // Guardar Límite de Almacenamiento
            await axios.post("/api/setSettings", {
                setting: "LIMIT_STORAGE",
                value: limitStorage.value
            }, { silent: true });

            // Guardar Directorio Base
            await axios.post("/api/setSettings", {
                setting: "BASE_DIR",
                value: baseDir.value
            }, { silent: true });

            // Guardar Límite de Tamaño de Archivo
            await axios.post("/api/setSettings", {
                setting: "MAX_FILE_SIZE",
                value: maxFileSize.value
            }, { silent: true });

            await axios.post("/api/setSettings", {
                setting: "MAX_FILES",
                value: maxFiles.value
            }, { silent: true });

            //mostramos solo una notificacion
            showToast("Configuración guardada exitosamente", 'info');
        } catch (error) {
            showToast(error.response?.data?.error || "Error al cambiar la configuración", 'error');
        }
    });
});

async function syncFiles() {
    const btn = document.getElementById("btn-sync");
    const originalContent = btn.innerHTML;
    if (!confirm("Se sincronizaran todos los archivos en la BD, reseteo de permisos y etiquetas, no puedes deshacer esta accion!, ¿Continuar?")) return;
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="loader"></span> Sincronizando...';
        const response = await axios.post("/api/sync", {}, { silent: true });
        showToast(response.data.message, 'success');
    } catch (error) {
        showToast(error.response?.data?.error || "Error en la sincronización", 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

async function analyzeFiles() {
    const btn = document.getElementById("btn-analyze");
    const originalContent = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="loader"></span> Analizando...';
        const response = await axios.post("/api/analyzeFiles", {}, { silent: true });
        showToast(response.data.message, 'info');
    } catch (error) {
        showToast(error.response?.data?.error || "Error en el análisis", 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}