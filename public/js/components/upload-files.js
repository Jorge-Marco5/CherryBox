/**
 * Gestión de Subida de Archivos e Historial en Memoria
 */

async function uploadFiles(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFilesProcess(Array.from(files));
    event.target.value = "";
}

/**
 * Verifica si la vista de subida de archivos ("uploads") está activa actualmente
 */
function isUploadsViewActive() {
    return (
        (window.TemplateManager && window.TemplateManager.currentView === "uploads") ||
        window.location.pathname === "/uploads" ||
        Boolean(document.getElementById("uploadManagerList"))
    );
}

/**
 * Notificación Toast interactiva para el progreso de subidas
 */
function updateUploadToast(activeCount, totalPercent, isCompleted = false) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    let toast = document.getElementById("active-upload-toast");

    if (activeCount > 0) {
        // Si estamos dentro de la vista de subidas, ocultar el toast flotante para no duplicar UI
        if (isUploadsViewActive()) {
            if (toast) toast.style.display = "none";
            return;
        }

        if (!toast) {
            toast = document.createElement("div");
            toast.id = "active-upload-toast";
            toast.className = "toast upload-toast info";
            toast.title = "Haz clic para ver el gestor de subidas";
            toast.onclick = () => {
                if (typeof renderUploadTemplate === "function") {
                    renderUploadTemplate();
                    toast.style.display = "none";
                }
            };
            container.appendChild(toast);
        } else {
            toast.style.display = "flex";
            toast.className = "toast upload-toast info";
            toast.classList.remove("fade-out");
        }

        toast.innerHTML = `
      <div class="upload-toast-header">
        <div class="upload-toast-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
            <path d="M9 15l3 -3l3 3" />
            <path d="M12 12l0 9" />
          </svg>
          <span>Subiendo ${activeCount} archivo(s)... (${totalPercent}%)</span>
        </div>
        <span class="upload-toast-cta"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-arrow-up-right"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M17 7l-10 10" /><path d="M8 7l9 0l0 9" /></svg></span>
      </div>
      <div class="progress-bar" style="width: 100%; height: 5px; margin-top: 6px;">
        <div class="progress-fill" style="width: ${totalPercent}%;"></div>
      </div>
    `;
    } else if (toast) {
        if (isCompleted && !isUploadsViewActive()) {
            toast.style.display = "flex";
            toast.className = "toast upload-toast success";
            toast.innerHTML = `
        <div class="upload-toast-header">
          <div class="upload-toast-title" style="color: var(--success, #22c55e);">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
              <path d="M5 12l5 5l10 -10" />
            </svg>
            <span>Subida finalizada</span>
          </div>
          <span class="upload-toast-cta">Ver historial ↗</span>
        </div>
      `;
            setTimeout(() => {
                if (toast && toast.parentNode) {
                    toast.classList.add("fade-out");
                    setTimeout(() => toast.remove(), 350);
                }
            }, 4500);
        } else {
            toast.classList.add("fade-out");
            setTimeout(() => toast.remove(), 350);
        }
    }
}

/**
 * Actualiza los indicadores globales: menú #indicador, barra global, toast y vista activa
 * @param {boolean} [isCompleted=false] - Si acaba de finalizar el lote de subidas
 * @param {boolean} [rebuildList=true] - Si debe reconstruir las tarjetas en #uploadManagerList
 */
function updateUploadIndicators(isCompleted = false, rebuildList = true) {
    activeUploads = uploadHistory.filter((u) => u.status === "uploading" || u.status === "pending");

    const indicador = document.getElementById("indicador");
    if (indicador) {
        if (activeUploads.length > 0) {
            indicador.textContent = activeUploads.length;
            indicador.style.display = "flex";
            indicador.style.alignItems = "center";
            indicador.style.justifyContent = "center";
        } else {
            indicador.style.display = "none";
        }
    }

    // Progreso global
    const activeOnly = activeUploads;
    let totalBytes = activeOnly.reduce((acc, u) => acc + (u.size || 0), 0);
    let totalLoaded = activeOnly.reduce((acc, u) => acc + (u.loaded || 0), 0);
    let overallPercent = totalBytes > 0 ? Math.min(100, Math.round((totalLoaded / totalBytes) * 100)) : 0;

    updateUploadToast(activeOnly.length, overallPercent, isCompleted);

    // Si estamos en la vista de subida, actualizar encabezados/barras o reconstruir la lista completa
    if (isUploadsViewActive()) {
        if (rebuildList) {
            renderUploadManagerView();
        } else {
            updateUploadHeaderControls();
        }
    }
}

/**
 * Actualiza únicamente los controles de cabecera y progreso global en la vista de subidas
 * sin reconstruir el DOM de las tarjetas (evita perder eventos click durante onUploadProgress)
 */
function updateUploadHeaderControls() {
    const historyBadge = document.getElementById("uploadHistoryBadge");
    if (historyBadge) historyBadge.textContent = uploadHistory.length;

    const btnCancelAll = document.getElementById("btnCancelAllUploads");
    const btnClear = document.getElementById("btnClearUploadHistory");
    const globalProgress = document.getElementById("uploadGlobalProgressContainer");
    const globalText = document.getElementById("uploadGlobalText");
    const globalPercent = document.getElementById("uploadGlobalPercent");
    const globalFill = document.getElementById("uploadGlobalProgressFill");
    const totalSpeed = document.getElementById("uploadTotalSpeed");

    const active = uploadHistory.filter((u) => u.status === "uploading" || u.status === "pending");
    const finished = uploadHistory.filter((u) => u.status === "completed" || u.status === "cancelled" || u.status === "error");

    if (btnCancelAll) btnCancelAll.style.display = active.length > 0 ? "inline-flex" : "none";
    if (btnClear) btnClear.style.display = finished.length > 0 ? "inline-flex" : "none";

    if (active.length > 0) {
        if (globalProgress) globalProgress.style.display = "block";
        let activeTotal = active.reduce((acc, u) => acc + (u.size || 0), 0);
        let activeLoaded = active.reduce((acc, u) => acc + (u.loaded || 0), 0);
        let pct = activeTotal > 0 ? Math.min(100, Math.round((activeLoaded / activeTotal) * 100)) : 0;
        if (globalText) globalText.textContent = `Subiendo ${active.length} archivo(s)...`;
        if (globalPercent) globalPercent.textContent = `${pct}%`;
        if (globalFill) globalFill.style.width = `${pct}%`;
    } else {
        if (globalProgress) globalProgress.style.display = "none";
        if (totalSpeed) totalSpeed.textContent = "";
    }
}

/**
 * Actualiza el DOM de una tarjeta individual de subida en tiempo real (estado, badge, barra y botón cancelar)
 */
function updateSingleUploadItemDOM(item) {
    const card = document.getElementById(`upload-item-${item.id}`);
    if (!card) {
        if (isUploadsViewActive()) {
            renderUploadManagerView();
        }
        return;
    }

    card.className = `upload-manager-item ${item.status}`;

    let statusLabel = "En cola";
    let badgeClass = "pending";
    const isProgressActive = item.status === "uploading" || item.status === "pending";

    if (item.status === "uploading") {
        statusLabel = `${item.percent}%`;
        badgeClass = "uploading";
    } else if (item.status === "completed") {
        statusLabel = "Completado";
        badgeClass = "completed";
    } else if (item.status === "cancelled") {
        statusLabel = "Cancelado";
        badgeClass = "cancelled";
    } else if (item.status === "error") {
        statusLabel = item.error ? `Error: ${item.error}` : "Error";
        badgeClass = "error";
    }

    const badge = document.getElementById(`badge-${item.id}`);
    if (badge) {
        badge.className = `upload-status-badge ${badgeClass}`;
        badge.textContent = statusLabel;
    }

    const fill = document.getElementById(`fill-${item.id}`);
    if (fill) {
        fill.className = `progress-fill ${item.status}`;
        fill.style.width = `${item.percent}%`;
    }

    const cancelBtn = card.querySelector(".btn-cancel-single");
    if (!isProgressActive && cancelBtn) {
        cancelBtn.remove();
    }
}

/**
 * Renderiza la lista e historial de subidas en el template de subida de archivos
 */
function renderUploadManagerView() {
    const container = document.getElementById("uploadManagerList");
    if (!container) return;

    updateUploadHeaderControls();

    if (uploadHistory.length === 0) {
        container.innerHTML = `
      <div class="upload-empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
          <path d="M7 18a4.6 4.4 0 0 1 0 -9a5 4.5 0 0 1 11 2h1a3.5 3.5 0 0 1 0 7h-1" />
          <path d="M9 15l3 -3l3 3" />
          <path d="M12 12l0 9" />
        </svg>
        <p>No hay subidas recientes en esta sesión.</p>
      </div>
    `;
        return;
    }

    // Renderizado dinámico de la lista de cargas
    container.innerHTML = uploadHistory.map((item) => {
        let statusLabel = "En cola";
        let badgeClass = "pending";
        let isProgressActive = item.status === "uploading" || item.status === "pending";

        if (item.status === "uploading") {
            statusLabel = `${item.percent}%`;
            badgeClass = "uploading";
        } else if (item.status === "completed") {
            statusLabel = "Completado";
            badgeClass = "completed";
        } else if (item.status === "cancelled") {
            statusLabel = "Cancelado";
            badgeClass = "cancelled";
        } else if (item.status === "error") {
            statusLabel = item.error ? `Error: ${item.error}` : "Error";
            badgeClass = "error";
        }

        const cancelBtnHtml = isProgressActive
            ? `<button class="btn-cancel-single" onclick="cancelUpload('${item.id}')" title="Cancelar esta subida">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
        </button>`
            : "";

        const safeName = typeof escapeHTML === "function" ? escapeHTML(item.name) : item.name;
        const safeStatus = typeof escapeHTML === "function" ? escapeHTML(statusLabel) : statusLabel;

        return `
      <div class="upload-manager-item ${item.status}" id="upload-item-${item.id}">
        <div class="upload-item-header">
          <div class="upload-item-info">
            ${getFileIcon(item.name)}
            <div style="display:flex; flex-direction:column;min-width: 0; flex: 1; gap:5px;">
              <div class="upload-item-name" title="${safeName}">${safeName}</div>
              <div class="upload-item-meta">
                <span>${formatBytes(item.size)}</span>
                <span> • Carpeta: ${item.folder ? '/' + decodeURI(item.folder) : '/ (Raíz)'}</span>
              </div>
            </div>
          </div>
          <div class="upload-item-actions">
            <span class="upload-status-badge ${badgeClass}" id="badge-${item.id}">${safeStatus}</span>
            ${cancelBtnHtml}
          </div>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${item.status}" id="fill-${item.id}" style="width: ${item.percent}%;"></div>
        </div>
      </div>
    `;
    }).join("");
}

async function uploadFilesProcess(files) {
    const fileArray = Array.from(files || []);
    if (fileArray.length === 0) return;

    try {
        const settings = await axios.get("/api/getSettings");
        const maxFileSizeMB = settings.data.maxFileSize;
        const maxFiles = settings.data.maxFiles;

        if (fileArray.length > maxFiles) {
            showToast(`Se permiten subir hasta ${maxFiles} archivos por subida`, "error");
            return;
        }

        for (let file of fileArray) {
            if (file.size / (1024 * 1024) > maxFileSizeMB) {
                showToast(`El archivo "${file.name}" excede el límite de tamaño (${formatBytes(file.size)}). Tamaño maximo por archivo ${maxFileSizeMB} MB`, "error");
                return;
            }
        }
    } catch (err) {
        showToast("Error al verificar límites de subida", "error");
        return;
    }

    const targetFolder = currentPath;
    const newItems = fileArray.map((file, index) => {
        const item = {
            id: "upl-" + Date.now() + "-" + index + "-" + Math.random().toString(36).substring(2, 6),
            file: file,
            name: file.name,
            size: file.size,
            status: "pending",
            loaded: 0,
            percent: 0,
            controller: new AbortController(),
            folder: targetFolder,
            error: null,
            timestamp: Date.now()
        };
        uploadHistory.unshift(item);
        return item;
    });

    // Renderizar las nuevas tarjetas inmediatamente en la vista (si está activa) y actualizar indicadores
    updateUploadIndicators(false, true);

    const startTime = Date.now();
    const CONCURRENCY_LIMIT = 3;
    let currentIndex = 0;

    const updateProgressState = (item, event) => {
        if (item.status === "cancelled") return;
        const total = event.total || item.size || 0;
        item.loaded = Math.min(event.loaded, total || event.loaded);
        item.percent = total > 0 ? Math.min(100, Math.round((event.loaded / total) * 100)) : 0;

        // Actualización directa del DOM de la tarjeta sin reconstruir toda la lista
        updateSingleUploadItemDOM(item);

        const timeElapsed = (Date.now() - startTime) / 1000;
        if (timeElapsed > 0) {
            const active = uploadHistory.filter((u) => u.status === "uploading");
            const totalLoaded = active.reduce((acc, u) => acc + u.loaded, 0);
            const speedEl = document.getElementById("uploadTotalSpeed");
            if (speedEl) speedEl.textContent = `${formatBytes(totalLoaded / timeElapsed)}/s`;
        }

        updateUploadIndicators(false, false);
    };

    const startNextUpload = async () => {
        if (currentIndex >= newItems.length) return;
        const item = newItems[currentIndex++];
        if (item.status === "cancelled") {
            updateSingleUploadItemDOM(item);
            updateUploadIndicators(false, false);
            return startNextUpload();
        }

        item.status = "uploading";
        updateSingleUploadItemDOM(item);
        updateUploadIndicators(false, false);

        try {
            const formData = new FormData();
            formData.append("files", item.file);
            const response = await axios.post(`${API_URL}/upload?path=${encodePath(item.folder)}`, formData, {
                signal: item.controller.signal,
                onUploadProgress: (event) => updateProgressState(item, event)
            });
            if (response.data && response.data.success) {
                item.status = "completed";
                item.loaded = item.size;
                item.percent = 100;
            } else {
                throw new Error(response.data?.error || "Error desconocido en el servidor");
            }
        } catch (error) {
            const isCancelled =
                item.status === "cancelled" ||
                axios.isCancel(error) ||
                error?.code === "ERR_CANCELED" ||
                error?.name === "CanceledError" ||
                error?.name === "AbortError";

            if (isCancelled) {
                item.status = "cancelled";
                item.error = null;
            } else {
                item.status = "error";
                item.error = error.response?.data?.error || error.message || "Error al subir archivo";
                showToast(`Error al subir ${item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name}: ${item.error}`, "error");
            }
        } finally {
            updateSingleUploadItemDOM(item);
            updateUploadIndicators(false, false);
            await startNextUpload();
        }
    };

    const initialPool = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, newItems.length); i++) {
        initialPool.push(startNextUpload());
    }
    await Promise.all(initialPool);

    // Al finalizar todas las subidas de este lote
    const hasActive = uploadHistory.some((u) => u.status === "uploading" || u.status === "pending");
    if (!hasActive) {
        const anyCompleted = newItems.some((u) => u.status === "completed");
        updateUploadIndicators(anyCompleted, true);
        getStorage();
        if (window.TemplateManager && window.TemplateManager.currentView === "files") {
            filesManager.loadFiles(currentPath);
        }
    }
}

function cancelUpload(id) {
    const item = uploadHistory.find((u) => u.id === id);
    if (item && (item.status === "uploading" || item.status === "pending")) {
        item.status = "cancelled";
        item.controller.abort();
        updateSingleUploadItemDOM(item);
        updateUploadIndicators(false, false);
    }
}

function cancelAllUploads() {
    uploadHistory.forEach((u) => {
        if (u.status === "uploading" || u.status === "pending") {
            u.status = "cancelled";
            u.controller.abort();
            updateSingleUploadItemDOM(u);
        }
    });
    updateUploadIndicators(false, true);
}

function clearUploadHistory() {
    uploadHistory = uploadHistory.filter((u) => u.status === "uploading" || u.status === "pending");
    updateUploadIndicators(false, true);
}