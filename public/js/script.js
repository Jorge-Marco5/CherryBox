
/**
 * Manejador del formulario de búsqueda mediante delegación de eventos.
 * Esto asegura que la búsqueda funcione tras cambiar de plantilla/vista sin perder el listener.
 */
document.addEventListener("submit", (e) => {
  if (e.target && (e.target.id === "search-form" || e.target.closest("#search-form"))) {
    e.preventDefault();

    filesManager.searchFiles();
  }
});

/**
 * Redirigir a alguna ruta dentro del explorador de archivos
 * @param {*} path 
 */
function navigateTo(path) {
  if (window.TemplateManager && window.TemplateManager.currentView !== "files") {
    return window.TemplateManager.render("files", { path });
  }
  return filesManager.loadFiles(path);
}

/**
 * Crea una nueva carpeta.
 */
const createFolderForm = document.getElementById("create-folder-form");
if (createFolderForm) {
  createFolderForm.addEventListener("submit", (e) => {
    e.preventDefault();
    createFolder();
  });
}


async function createFolder(name, color) {
  await filesManager.createFolder(name, color);
}

/**
 * Confirma el renombrado de un archivo.
 */
const renameForm = document.getElementById("rename-file-form");
if (renameForm) {
  renameForm.addEventListener("submit", (e) => {
    e.preventDefault();
    confirmRename();
  });
}

async function confirmRename(newName, newColor) {
  await filesManager.confirmRename(newName, newColor);
}

/**
 * Genera un enlace temporal de descarga/compartir.
 */
async function createShareLink(filePath, time) {
  return await filesManager.createShareLink(filePath, time);
}

/**
 * Elimina un archivo o carpeta.
 */
async function deleteFile(path, name) {
  await filesManager.deleteFile(path, name);
}

/**
 * Elimina los archivos seleccionados mediante checkbox.
 */
async function deleteSelectedFiles() {
  await filesManager.deleteSelectedFiles();
}

/**
 * Descarga los archivos seleccionados mediante checkbox.
 */
async function downloadSelectedFiles() {
  await filesManager.downloadSelectedFiles();
}

/**
 * Obtiene y actualiza la información de almacenamiento.
 */
async function getStorage() {
  await filesManager.getStorage();
}

function downloadFile(path) {
  filesManager.downloadFile(path);
}

/**
 * Gestión de Permisos
 */

/**
 * Ver los permisos de usuarios de una carpeta
 */
function showCurrentFolderPermissions() {
  if (currentFolderData.id) {
    showPermissionsModal(currentFolderData.id, currentFolderData.name || "Carpeta Actual");
  } else {
    showToast("No se puede gestionar los permisos de esta carpeta en este momento.", "error");
  }
}

/**
 * mostrar|ocultar boton para permisos del folder
 */
function updateFolderPermissionButton() {
  const btn = document.getElementById("btn-folderPermissions");
  if (btn) {
    const user = JSON.parse(localStorage.getItem("user"));
    const isAdmin = user && (user.role === "ADMIN" || user.role === "SUPERADMIN");
    btn.style.display = currentFolderData.id || isAdmin ? "inline-flex" : "none";
  }
}

/**
 * Mostrar el modal con usuarios y permisos
 * @param {*} fileId 
 * @param {*} fileName 
 */
async function showPermissionsModal(fileId, fileName) {
  currentPermissionFileId = fileId;
  currentModalActive = "permissionsModal";
  document.getElementById("permFileName").textContent = fileName;
  document.getElementById(currentModalActive).classList.add("active");
  document.body.classList.add("modal-open");
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
                    <button class="square danger" style="padding: 5px;" onclick="revokePermission('${p.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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

/**
 * Aplicar un permiso a un usuario sobre un archivo
 * @returns 
 */
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
 * Listeners y Configuración Inicial
 */

/**
 * Funcion para marcar como seleccionado todos los archivos de la carpeta
 * @param {*} element 
 */
function toggleSelectAll(element) {
  const isChecked = element.checked;
  document.querySelectorAll(".file-checkbox").forEach((cb) => (cb.checked = isChecked));
  Renderers.updateSelectionButtons();
}

/**
 * Marcar como seleeccionado un archivo de la carpeta
 */
document.addEventListener("change", (e) => {
  if (e.target?.classList.contains("file-checkbox")) {
    Renderers.updateSelectionButtons();
  }
});

/**
 * enter para lanzar busqueda
 */
document.addEventListener("keypress", (e) => {
  if (e.target.id === "searchInput" && e.key === "Enter") {

    filesManager.searchFiles();
  }
});

document.addEventListener("keydown", (e) => {
  /**
   * presiona F5 para actualizar la carpeta actual
   */
  if (e.key === "F5") {
    e.preventDefault();
    showToast("Carpeta actualizada", "info");
    filesManager.loadFiles(currentPath);
  }

  /**
   * Escape para el cierre del modal actual
   */
  if (e.key === "Escape") {
    UILogic.closeModal(currentModalActive);
  }
});

/**
 * Click afuera del modal para cerrar
 */
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) UILogic.closeModal(e.target.id);
});

/**
 * Funcion para copiar un texto
 * @param {*} input 
 */
async function copyToClipboard(text) {
  await navigator.clipboard.writeText(text);
  showToast("Copiado", "success");
}

// Exponer funciones globales necesarias
window.navigateTo = navigateTo;
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
window.updateUploadIndicators = updateUploadIndicators;
window.showPermissionsModal = showPermissionsModal;
window.revokePermission = revokePermission;
window.grantPermission = grantPermission;
window.createShareLink = createShareLink;
window.getStorage = getStorage;
window.showCurrentFolderPermissions = showCurrentFolderPermissions;

// Inicialización de la vista principal con TemplateManager
document.addEventListener('DOMContentLoaded', async () => {
  try {
    if (window.TemplateManager) {
      if (urlPath === "/") {
        TemplateManager.render("files");
      } else {
        TemplateManager.render(urlPath.replace("/", ""));
      }
    } else if (document.getElementById("fileList")) {
      await filesManager.loadFiles();
      await UILogic.setupDragAndDrop();
    }
  } catch (error) {
    showToast("Error al iniciar...", "warning");
    console.error(error);
  }
})