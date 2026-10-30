const API_URL = "/api";

document.addEventListener("DOMContentLoaded", () => {
    const formSettings = document.getElementById("form-settings");
    const baseDir = document.getElementById("baseDir");
    const limitStorage = document.getElementById("limitStorage");
    const maxFileSize = document.getElementById("maxFileSize");
    const maxFiles = document.getElementById("maxFiles");
    const btnSync = document.getElementById("btn-sync");
    const btnAnalyze = document.getElementById("btn-analyze");
    const readOnlyBanner = document.getElementById("read-only-banner");
    const superadminWarning = document.getElementById("superadmin-warning");

    let hasWritePermission = false;

    async function getSettings() {
        try {
            const response = await axios.get(`${API_URL}/getSettings`);
            const data = response.data;

            limitStorage.value = data.limitStorage ?? "";
            baseDir.value = data.baseDir ?? "";
            maxFileSize.value = data.maxFileSize ?? "";
            maxFiles.value = data.maxFiles ?? "";

            hasWritePermission = !!data.permission;

            if (!hasWritePermission) {
                // Modo solo lectura para ADMIN (no SuperAdmin)
                baseDir.disabled = true;
                limitStorage.disabled = true;
                maxFileSize.disabled = true;
                maxFiles.disabled = true;

                // Ocultar todos los botones de guardado individual de los formularios
                const submitButtons = document.querySelectorAll("#form-settings button[type='submit']");
                submitButtons.forEach((btn) => (btn.style.display = "none"));

                // Deshabilitar y atenuar botones de acciones críticas
                if (btnSync) {
                    btnSync.disabled = true;
                    btnSync.style.opacity = "0.5";
                    btnSync.style.cursor = "not-allowed";
                    btnSync.title = "Acción restringida: solo disponible para Superadministrador";
                }

                if (btnAnalyze) {
                    btnAnalyze.disabled = true;
                    btnAnalyze.style.opacity = "0.5";
                    btnAnalyze.style.cursor = "not-allowed";
                    btnAnalyze.title = "Acción restringida: solo disponible para Superadministrador";
                }

                // Mostrar banner de solo lectura y ocultar advertencia de modificación
                if (readOnlyBanner) readOnlyBanner.style.display = "flex";
                if (superadminWarning) superadminWarning.style.display = "none";
            } else {
                // Modo Superadministrador con permisos de escritura
                baseDir.disabled = false;
                limitStorage.disabled = false;
                maxFileSize.disabled = false;
                maxFiles.disabled = false;

                const submitButtons = document.querySelectorAll("#form-settings button[type='submit']");
                submitButtons.forEach((btn) => (btn.style.display = "inline-flex"));

                if (btnSync) {
                    btnSync.disabled = false;
                    btnSync.style.opacity = "1";
                    btnSync.style.cursor = "pointer";
                    btnSync.title = "";
                }

                if (btnAnalyze) {
                    btnAnalyze.disabled = false;
                    btnAnalyze.style.opacity = "1";
                    btnAnalyze.style.cursor = "pointer";
                    btnAnalyze.title = "";
                }

                if (readOnlyBanner) readOnlyBanner.style.display = "none";
                if (superadminWarning) superadminWarning.style.display = "flex";
            }
        } catch (error) {
            console.error("Error al cargar ajustes:", error);
            if (error.response && error.response.status === 403) {
                // Si un usuario con rol USER o sin permisos intenta acceder a la sección
                formSettings.innerHTML = `
                <div style="text-align: center; padding: 50px; color: #ff4d4d;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock-off"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M15 11h2a2 2 0 0 1 2 2v2m0 4a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2h4" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-3m.712 -3.277a3.5 3.5 0 0 1 6.288 2.277v3" /><path d="M3 3l18 18" /></svg>
                    <h2 style="margin-top: 20px;">Acceso Denegado</h2>
                    <p style="color: #888;">Esta sección está restringida únicamente a personal administrativo.</p>
                    <a href="/" class="btn btn-primary" style="display: inline-block; margin-top: 15px; padding: 8px 16px; border-radius: 6px; background-color: var(--primary, #d2042d); color: white; text-decoration: none;">Volver al Inicio</a>
                </div>
                `;
            } else if (error.response && error.response.status === 401) {
                window.location.href = "/login";
            } else {
                showToast(error.response?.data?.error || "Error al obtener la configuración", "error");
            }
        }
    }

    getSettings();

    // Formularios con verificación preventiva de permisos
    const formBaseDir = document.getElementById("form-base-dir");
    const formLimitStorage = document.getElementById("form-limit-storage");
    const formMaxFileSize = document.getElementById("form-max-file-size");
    const formMaxFiles = document.getElementById("form-max-files");

    if (formBaseDir) {
        formBaseDir.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!hasWritePermission) {
                showToast("Acción denegada: Solo el Superadministrador puede modificar ajustes", "error");
                return;
            }
            try {
                await axios.post(`${API_URL}/setSettings`, {
                    setting: "BASE_DIR",
                    value: baseDir.value,
                }, { silent: true });
                showToast("Directorio base actualizado exitosamente", "info");
            } catch (error) {
                showToast(error.response?.data?.error || "Error al cambiar la configuración", "error");
            }
        });
    }

    if (formLimitStorage) {
        formLimitStorage.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!hasWritePermission) {
                showToast("Acción denegada: Solo el Superadministrador puede modificar ajustes", "error");
                return;
            }
            try {
                await axios.post(`${API_URL}/setSettings`, {
                    setting: "LIMIT_STORAGE",
                    value: limitStorage.value,
                }, { silent: true });
                showToast("Límite de almacenamiento actualizado exitosamente", "info");
            } catch (error) {
                showToast(error.response?.data?.error || "Error al cambiar la configuración", "error");
            }
        });
    }

    if (formMaxFileSize) {
        formMaxFileSize.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!hasWritePermission) {
                showToast("Acción denegada: Solo el Superadministrador puede modificar ajustes", "error");
                return;
            }
            try {
                await axios.post(`${API_URL}/setSettings`, {
                    setting: "MAX_FILE_SIZE",
                    value: maxFileSize.value,
                }, { silent: true });
                showToast("Tamaño máximo de archivo actualizado exitosamente", "info");
            } catch (error) {
                showToast(error.response?.data?.error || "Error al cambiar la configuración", "error");
            }
        });
    }

    if (formMaxFiles) {
        formMaxFiles.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!hasWritePermission) {
                showToast("Acción denegada: Solo el Superadministrador puede modificar ajustes", "error");
                return;
            }
            try {
                await axios.post(`${API_URL}/setSettings`, {
                    setting: "MAX_FILES",
                    value: maxFiles.value,
                }, { silent: true });
                showToast("Número máximo de archivos actualizado exitosamente", "info");
            } catch (error) {
                showToast(error.response?.data?.error || "Error al cambiar la configuración", "error");
            }
        });
    }

    async function syncFiles() {
        if (!hasWritePermission) {
            showToast("Acción denegada: Solo el Superadministrador puede sincronizar archivos", "error");
            return;
        }
        const btn = document.getElementById("btn-sync");
        const originalContent = btn.innerHTML;
        if (!confirm("Se sincronizarán todos los archivos en la BD, reseteo de permisos y etiquetas. No puedes deshacer esta acción. ¿Continuar?")) {
            return;
        }
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="loader"></span> Sincronizando...';
            const response = await axios.post(`${API_URL}/sync`, {}, { silent: true });
            showToast(response.data.message, "success");
        } catch (error) {
            showToast(error.response?.data?.error || "Error en la sincronización", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }

    async function analyzeFiles() {
        if (!hasWritePermission) {
            showToast("Acción denegada: Solo el Superadministrador puede analizar archivos", "error");
            return;
        }
        const btn = document.getElementById("btn-analyze");
        const originalContent = btn.innerHTML;
        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="loader"></span> Analizando...';
            const response = await axios.post(`${API_URL}/analyzeFiles`, {}, { silent: true });
            showToast(response.data.message, "info");
        } catch (error) {
            showToast(error.response?.data?.error || "Error en el análisis", "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    }

    window.syncFiles = syncFiles;
    window.analyzeFiles = analyzeFiles;
});
