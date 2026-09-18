const mainContainer = document.getElementById("main-container");

/**
 * Carga los archivos de una ruta específica.
 */
async function loadFiles(path = "") {
  if (isLoadingFiles) return;
  isLoadingFiles = true;
  try {
    const response = await FileService.getFiles(path);
    const data = response.data;

    currentPath = data.currentPath;
    currentFolderData = { id: data.currentFolderId, name: data.currentFolderName };

    Renderers.updateBreadcrumb(currentPath);
    if (containsOnlyOneMusicFile(data.files)) {
      document.getElementById("btn-music-player").style.display = "inline-flex";
    } else {
      document.getElementById("btn-music-player").style.display = "none";
    }
    getStorage();

    Renderers.renderFiles(data.files);
    Renderers.renderImages();
    updateFolderPermissionButton();
  } catch (error) {
    showToast("Ha ocurrido un error al iniciar: " + error.message, "danger");
    if (error.response && error.response.status === 401) {
      location.href = "/login";
    }
  } finally {
    isLoadingFiles = false;
  }
}

/**
 * Manejador del formulario de búsqueda mediante delegación de eventos.
 * Esto asegura que la búsqueda funcione tras cambiar de plantilla/vista sin perder el listener.
 */
document.addEventListener("submit", (e) => {
  if (e.target && (e.target.id === "search-form" || e.target.closest("#search-form"))) {
    e.preventDefault();
    searchFiles();
  }
});

async function searchFiles() {
  const searchInput = document.getElementById("searchInput");
  const query = searchInput?.value.trim();

  if (query == "") {
    loadFiles("");
  }

  try {
    const response = await FileService.searchFiles(query);
    Renderers.renderFiles(response.data);
    isLoadingFiles = false;
  } catch (error) {
    alert("Error al buscar archivos: " + error.message);
    location.href = "/error?code=" + error.response.status + "&message=" + error.response.data.error;
  }
}

function navigateTo(path) {
  loadFiles(path);
}

function refreshpath() {
  showToast("Carpeta actualizada", "info");
  loadFiles(currentPath);
}

/**
 * Crea una nueva carpeta.
 */
const createFolderForm = document.getElementById("create-folder-form");
createFolderForm.addEventListener("submit", (e) => {
  e.preventDefault();
  createFolder();
});

async function createFolder() {
  const name = document.getElementById("folderNameInput").value.trim();
  const color = document.getElementById("folderColorInput").value;

  if (!name) {
    showToast("Por favor ingresa un nombre", "warning");
    return;
  }

  try {
    const response = await FileService.createFolder(currentPath, name, color);
    if (response.data.success) {
      UILogic.closeModal(currentModalActive);
      document.getElementById("folderNameInput").value = "";
      loadFiles(currentPath);
    } else {
      showToast(response.data.error, "error");
    }
  } catch (error) {
    showToast("Error al crear carpeta", "error");
  }
}

/**
 * Confirma el renombrado de un archivo.
 */
const renameForm = document.getElementById("rename-file-form");
renameForm.addEventListener("submit", (e) => {
  e.preventDefault();
  confirmRename();
});

async function confirmRename() {
  const newName = document.getElementById("renameInput").value.trim();
  const newColor = document.getElementById("renameColorInput").value;

  if (!newName) {
    showToast("Por favor ingresa un nombre", "warning");
    return;
  }

  try {
    await FileService.rename(currentRenameItem, newName, newColor);
    UILogic.closeModal(currentModalActive);
    loadFiles(currentPath);
  } catch (error) {
    console.error(error);
  }
}


const formShareTime = document.getElementById("form-share-time");
if (formShareTime) {
  formShareTime.addEventListener("submit", async (e) => {
    e.preventDefault();
    const timeShare = document.getElementById("selectTimeShare").value;
    const inputPathShare = document.getElementById("inputPathShare");
    inputPathShare.value = "";
    if (!timeShare) {
      showToast("Por favor selecciona un tiempo límite", "warning");
      return;
    }
    try {
      const res = await FileService.createShareLink(currentRenameItem, timeShare);
      inputPathShare.value = res.data.url;
    } catch (error) {
      console.error(error);
      showToast("Error al crear enlace", "error");
    }
  });
}

/**
 * Elimina un archivo o carpeta.
 */
async function deleteFile(path, name) {
  if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

  try {
    await FileService.delete(path);
    loadFiles(currentPath);
  } catch (error) {
    console.error("Error al eliminar:", error);
  }
}

/**
 * Elimina los archivos seleccionados mediante checkbox.
 */
async function deleteSelectedFiles() {
  const checkboxes = document.querySelectorAll(".file-checkbox:checked");
  const paths = Array.from(checkboxes).map((checkbox) => checkbox.dataset.path);

  if (paths.length === 0) {
    showToast("No se han seleccionado archivos", "error");
    return;
  } else if (paths.length >= 10) {
    showToast("No se pueden eliminar más de 10 archivos a la vez", "error");
    return;
  }

  if (confirm(`¿Estás seguro de que quieres eliminar ${paths.length} archivos?`)) {
    try {
      await Promise.all(paths.map((path) => FileService.delete(path)));
      document.getElementById("btn-deleteSelectedFiles").style.display = "none";
      await loadFiles(currentPath);
    } catch (error) {
      console.error("Error al eliminar archivos:", error);
      await loadFiles(currentPath);
    }
  }
}

/**
 * Descarga los archivos seleccionados mediante checkbox.
 */
async function downloadSelectedFiles() {
  const checkboxes = document.querySelectorAll(".file-checkbox:checked");
  const paths = Array.from(checkboxes)
    .filter((cb) => cb.id !== "checkbox-all")
    .map((cb) => cb.dataset.path);

  if (paths.length === 0) {
    showToast("No se han seleccionado archivos", "error");
    return;
  } else if (paths.length === 1) {
    downloadFile(paths[0]);
    return;
  }

  try {
    showToast("Preparando descarga...", "info");
    const response = await FileService.downloadMultiple(paths);

    // Crear un objeto URL para el blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;

    // Nombre del archivo con timestamp
    const timestamp = new Date().getTime();
    link.setAttribute("download", `cherrybox_download_${timestamp}.zip`);

    document.body.appendChild(link);
    link.click();

    // Limpieza
    link.remove();
    window.URL.revokeObjectURL(url);

    document.getElementById("btn-downloadSelectedFiles").style.display = "none";
    showToast("Descarga iniciada", "success");

    // Deseleccionar todo
    const checkboxAll = document.getElementById("checkbox-all");
    if (checkboxAll) checkboxAll.checked = false;
    document.querySelectorAll(".file-checkbox").forEach((cb) => (cb.checked = false));
    Renderers.updateSelectionButtons();
  } catch (error) {
    console.error("Error al descargar:", error);

    // Si el error viene de un blob, hay que leerlo como texto
    if (error.response && error.response.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const errData = JSON.parse(reader.result);
          showToast(errData.error || "Error al descargar archivos", "error");
        } catch {
          showToast("Error al descargar archivos", "error");
        }
      };
      reader.readAsText(error.response.data);
    } else {
      showToast(error.response?.data?.error || "Error en el servidor al procesar la descarga", "error");
    }
  }
}

/**
 * Obtiene y actualiza la información de almacenamiento.
 */
async function getStorage() {
  try {
    const response = await FileService.getStorage();
    const data = response.data;

    document.getElementById("storageLimit").textContent = formatBytes(data.totalStorage);
    document.getElementById("storageUsed").textContent = formatBytes(data.usedStorage);
    document.getElementById("storageAvailable").textContent = formatBytes(data.availableStorage);

    const barFill = document.querySelector(".bar-storage-fill");
    const percentage = (data.usedStorage / data.totalStorage) * 100;
    if (barFill && data.totalStorage > 0) {
      barFill.style.width = `${Math.min(percentage, 100)}%`;
      barFill.style.backgroundColor = percentage < 50 ? "#22c55e" : percentage < 80 ? "#f59e0b" : "#ef4444";
    }
  } catch (error) {
    console.error("Error al obtener el límite de almacenamiento:", error);
  }
}

function downloadFile(path) {
  window.open(`${API_URL}/download?path=${encodePath(path)}`, "_blank");
}

/**
 * Gestión de Permisos
 */

function showCurrentFolderPermissions() {
  if (currentFolderData.id) {
    showPermissionsModal(currentFolderData.id, currentFolderData.name || "Carpeta Actual");
  } else {
    showToast("No se puede gestionar los permisos de esta carpeta en este momento.", "error");
  }
}

function updateFolderPermissionButton() {
  const btn = document.getElementById("btn-folderPermissions");
  if (btn) {
    const user = JSON.parse(localStorage.getItem("user"));
    const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPERADMIN");
    btn.style.display = currentFolderData.id || isAdmin ? "inline-flex" : "none";
  }
}

async function showPermissionsModal(fileId, fileName) {
  currentPermissionFileId = fileId;
  currentModalActive = "permissionsModal";
  document.getElementById("permFileName").textContent = fileName;
  document.getElementById(currentModalActive).classList.add("active");
  await loadPermissions(fileId);
}

async function loadPermissions(fileId) {
  const list = document.getElementById("permissionsList");
  list.innerHTML = "<p>Cargando permisos...</p>";
  try {
    const response = await PermissionService.getFilePermissions(fileId);
    const perms = response.data;

    if (perms.length === 0) {
      list.innerHTML =
        '<p style="color: #666; text-align: center; padding: 20px;">No hay permisos adicionales otorgados.</p>';
    } else {
      list.innerHTML = perms
        .map(
          (p) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: 500;">${p.user.email}</div>
                        <div style="font-size: 0.8rem; color: #666;">Acceso: ${p.access}</div>
                    </div>
                    <button class="btn btn-danger" style="padding: 5px;" onclick="revokePermission('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M4 7l16 0" /><path d="M10 11l0 6" /><path d="M14 11l0 6" /><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" /><path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
                        </svg>
                    </button>
                </div>
            `,
        )
        .join("");
    }
  } catch (error) {
    list.innerHTML = '<p style="color: #ff5555;">Error al cargar permisos.</p>';
  }
}

const permissionsForm = document.getElementById("permissions-form");

permissionsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await grantPermission();
});

async function grantPermission() {
  const targetUserId = document.getElementById("targetUserId").value.trim();
  const access = document.getElementById("accessLevel").value;

  if (!targetUserId) return showToast("Ingresa un ID de usuario o Email", "warning");

  try {
    await PermissionService.grantPermission(currentPermissionFileId, targetUserId, access);
    document.getElementById("targetUserId").value = "";
    await loadPermissions(currentPermissionFileId);
  } catch (error) {
    showToast("Error: " + (error.response?.data?.error || "No se pudo otorgar el permiso"), "error");
  }
}

async function revokePermission(permissionId) {
  if (!confirm("¿Revocar este permiso?")) return;
  try {
    await PermissionService.revokePermission(permissionId);
    await loadPermissions(currentPermissionFileId);
  } catch (error) {
    console.error(error);
  }
}

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
 * Notificación Toast interactiva para el progreso de subidas
 */
function updateUploadToast(activeCount, totalPercent, isCompleted = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  let toast = document.getElementById("active-upload-toast");

  if (activeCount > 0) {
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
    if (isCompleted) {
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
 * Actualiza los indicadores globales: menú #indicador, toast y vista activa
 */
function updateUploadIndicators(isCompleted = false) {
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
  const activeOnly = uploadHistory.filter((u) => u.status === "uploading" || u.status === "pending");
  let totalBytes = activeOnly.reduce((acc, u) => acc + (u.size || 0), 0);
  let totalLoaded = activeOnly.reduce((acc, u) => acc + (u.loaded || 0), 0);
  let overallPercent = totalBytes > 0 ? Math.min(100, Math.round((totalLoaded / totalBytes) * 100)) : 0;

  updateUploadToast(activeOnly.length, overallPercent, isCompleted);

  // Si estamos en la vista de subida, refrescar la lista
  if (urlPath === "/uploads") {
    renderUploadManagerView();
  }
}

/**
 * Renderiza la lista e historial de subidas en el template de subida de archivos
 */
function renderUploadManagerView() {
  const container = document.getElementById("uploadManagerList");
  if (!container) return;

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
    let pct = activeTotal > 0 ? Math.round((activeLoaded / activeTotal) * 100) : 0;
    if (globalText) globalText.textContent = `Subiendo ${active.length} archivo(s)...`;
    if (globalPercent) globalPercent.textContent = `${pct}%`;
    if (globalFill) globalFill.style.width = `${pct}%`;
  } else {
    if (globalProgress) globalProgress.style.display = "none";
    if (totalSpeed) totalSpeed.textContent = "";
  }

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

    return `
      <div class="upload-manager-item ${item.status}" id="upload-item-${item.id}">
        <div class="upload-item-header">
          <div class="upload-item-info">
            ${getFileIcon(item.name)}
            <div style="display:flex; flex-direction:column;min-width: 0; flex: 1; gap:5px;">
              <div class="upload-item-name" title="${item.name}">${item.name}</div>
              <div class="upload-item-meta">
                <span>${formatBytes(item.size)}</span>
                <span> • Carpeta: ${item.folder ? '/' + decodeURI(item.folder) : '/ (Raíz)'}</span>
              </div>
            </div>
          </div>
          <div class="upload-item-actions">
            <span class="upload-status-badge ${badgeClass}" id="badge-${item.id}">${statusLabel}</span>
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
  if (!files || files.length === 0) return;

  const settings = await axios.get("/api/getSettings");
  const maxFileSizeMB = settings.data.maxFileSize;
  const maxFiles = settings.data.maxFiles;

  if (files.length > maxFiles) {
    showToast(`Se permiten subir hasta ${maxFiles} archivos por subida`, "error");
    return;
  }

  for (let file of files) {
    if (file.size / (1024 * 1024) > maxFileSizeMB) {
      showToast(`El archivo "${file.name}" excede el límite de tamaño (${formatBytes(file.size)}). Tamaño maximo por archivo ${maxFileSizeMB} MB`, "error");
      return;
    }
  }

  const targetFolder = currentPath;
  const newItems = files.map((file, index) => {
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

  updateUploadIndicators();

  const startTime = Date.now();
  const CONCURRENCY_LIMIT = 3;
  let currentIndex = 0;

  const updateProgressState = (item, event) => {
    item.loaded = event.loaded;
    item.percent = event.total > 0 ? Math.round((event.loaded / event.total) * 100) : 0;

    // Actualización directa del DOM si estamos en la vista de subidas para máximo rendimiento
    const fill = document.getElementById(`fill-${item.id}`);
    const badge = document.getElementById(`badge-${item.id}`);
    if (fill) fill.style.width = `${item.percent}%`;
    if (badge) badge.textContent = `${item.percent}%`;

    const timeElapsed = (Date.now() - startTime) / 1000;
    if (timeElapsed > 0) {
      const active = uploadHistory.filter((u) => u.status === "uploading");
      const totalLoaded = active.reduce((acc, u) => acc + u.loaded, 0);
      const speedEl = document.getElementById("uploadTotalSpeed");
      if (speedEl) speedEl.textContent = `${formatBytes(totalLoaded / timeElapsed)}/s`;
    }

    updateUploadIndicators();
  };

  const startNextUpload = async () => {
    if (currentIndex >= newItems.length) return;
    const item = newItems[currentIndex++];
    if (item.status === "cancelled") return startNextUpload();

    item.status = "uploading";
    updateUploadIndicators();

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
      item.status = axios.isCancel(error) ? "cancelled" : "error";
      item.error = error.response?.data?.error || error.message || "Error al subir archivo";
      if (!axios.isCancel(error)) {
        showToast(`Error al subir ${item.name.length > 15 ? item.name.substring(0, 15) + "..." : item.name}: ${item.error}`, "error");
      }
    } finally {
      updateUploadIndicators();
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
    updateUploadIndicators(true);
    getStorage();
    if (window.TemplateManager && window.TemplateManager.currentView === "files") {
      loadFiles(currentPath);
    }
  }
}

function cancelUpload(id) {
  const item = uploadHistory.find((u) => u.id === id);
  if (item && (item.status === "uploading" || item.status === "pending")) {
    item.controller.abort();
    item.status = "cancelled";
    updateUploadIndicators();
  }
}

function cancelAllUploads() {
  uploadHistory.forEach((u) => {
    if (u.status === "uploading" || u.status === "pending") {
      u.controller.abort();
      u.status = "cancelled";
    }
  });
  updateUploadIndicators();
}

function clearUploadHistory() {
  uploadHistory = uploadHistory.filter((u) => u.status === "uploading" || u.status === "pending");
  updateUploadIndicators();
  if (window.TemplateManager && window.TemplateManager.currentView === "upload") {
    renderUploadManagerView();
  }
}

/**
 * Listeners y Configuración Inicial
 */

function toggleSelectAll(element) {
  const isChecked = element.checked;
  document.querySelectorAll(".file-checkbox").forEach((cb) => (cb.checked = isChecked));
  Renderers.updateSelectionButtons();
}

document.addEventListener("change", (e) => {
  if (e.target?.classList.contains("file-checkbox")) {
    Renderers.updateSelectionButtons();
  }
});

document.addEventListener("keypress", (e) => {
  if (e.target.id === "searchInput" && e.key === "Enter") {
    searchFiles();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "F5") {
    e.preventDefault();
    refreshpath();
  }

  if (e.key === "Escape") {
    UILogic.closeModal(currentModalActive);
  }
});

document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) UILogic.closeModal(e.target.id);
});

async function copyToClipboard(input) {
  const copy = document.getElementById(input);
  copy.select();
  await navigator.clipboard.writeText(copy.value);
  showToast("Copiado", "success");
}

// Exponer funciones globales necesarias
window.loadFiles = loadFiles;
window.searchFiles = searchFiles;
window.navigateTo = navigateTo;
window.refreshpath = refreshpath;
window.createFolder = createFolder;
window.confirmRename = confirmRename;
window.deleteFile = deleteFile;
window.deleteSelectedFiles = deleteSelectedFiles;
window.downloadFile = downloadFile;
window.toggleSelectAll = toggleSelectAll;
window.uploadFiles = uploadFiles;
window.uploadFilesProcess = uploadFilesProcess;
window.cancelUpload = cancelUpload;
window.cancelAllUploads = cancelAllUploads;
window.clearUploadHistory = clearUploadHistory;
window.renderUploadManagerView = renderUploadManagerView;
window.showPermissionsModal = showPermissionsModal;
window.revokePermission = revokePermission;
window.grantPermission = grantPermission;
window.showCurrentFolderPermissions = showCurrentFolderPermissions;

// Inicialización de la vista principal con TemplateManager
if (window.TemplateManager) {
  if (urlPath === "/") {
    TemplateManager.render("files");
  } else {
    TemplateManager.render(urlPath.replace("/", ""));
  }
} else if (document.getElementById("fileList")) {
  loadFiles();
  UILogic.setupDragAndDrop();
  getStorage();
}