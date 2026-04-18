const API_URL = '/api';

// Estado global
let currentPath = '';
let currentRenameItem = null;
let currentPreviewPath = null;
let currentPermissionFileId = null;
let currentFolderData = { id: null, name: "" };
let isLoadingFiles = false;
let activeUploads = [];

/**
 * Carga los archivos de una ruta específica.
 */
async function loadFiles(path = '') {
    if (isLoadingFiles) return;
    isLoadingFiles = true;
    try {
        const response = await FileService.getFiles(path);
        const data = response.data;

        currentPath = data.currentPath;
        currentFolderData = { id: data.currentFolderId, name: data.currentFolderName };

        Renderers.updateBreadcrumb(currentPath);
        if (containsOnlyOneMusicFile(data.files)) {
            document.getElementById('btn-music-player').style.display = 'inline-flex';
        } else {
            document.getElementById('btn-music-player').style.display = 'none';
        }
        Renderers.renderFiles(data.files);
        updateFolderPermissionButton();
    } catch (error) {
        if (error.response && error.response.status === 401) {
            location.href = '/login';
        }
    } finally {
        isLoadingFiles = false;
    }
}

/**
 * Busca archivos usando el campo de búsqueda.
 */
async function searchFiles() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value.trim();

    if (!query) {
        await loadFiles(currentPath);
        return;
    }

    try {
        const response = await FileService.searchFiles(query);
        Renderers.renderFiles(response.data);
    } catch (error) {
        location.href = '/error?code=' + error.response.status + '&message=' + error.response.data.error;
    }
}

function navigateTo(path) {
    loadFiles(path);
}

function refreshpath() {
    loadFiles(currentPath);
}

/**
 * Crea una nueva carpeta.
 */
async function createFolder() {
    const name = document.getElementById('folderNameInput').value.trim();
    if (!name) {
        showToast('Por favor ingresa un nombre', 'warning');
        return;
    }

    try {
        const response = await FileService.createFolder(currentPath, name);
        if (response.data.success) {
            UILogic.closeModal('createFolderModal');
            document.getElementById('folderNameInput').value = '';
            loadFiles(currentPath);
        } else {
            showToast(response.data.error, 'error');
        }
    } catch (error) {
        showToast('Error al crear carpeta', 'error');
    }
}

/**
 * Confirma el renombrado de un archivo.
 */
async function confirmRename() {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName) {
        showToast('Por favor ingresa un nombre', 'warning');
        return;
    }

    try {
        await FileService.rename(currentRenameItem, newName);
        UILogic.closeModal('renameModal');
        loadFiles(currentPath);
    } catch (error) {
        console.error(error);
    }
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
        console.error('Error al eliminar:', error);
    }
}

/**
 * Elimina los archivos seleccionados mediante checkbox.
 */
async function deleteSelectedFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    const paths = Array.from(checkboxes).map(checkbox => checkbox.dataset.path);

    if (paths.length === 0) {
        showToast('No se han seleccionado archivos', 'error');
        return;
    } else if (paths.length >= 10) {
        showToast('No se pueden eliminar más de 10 archivos a la vez', 'error');
        return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar ${paths.length} archivos?`)) {
        try {
            await Promise.all(paths.map(path => FileService.delete(path)));
            document.getElementById('btn-deleteSelectedFiles').style.display = 'none';
            await loadFiles(currentPath);
        } catch (error) {
            console.error('Error al eliminar archivos:', error);
            await loadFiles(currentPath);
        }
    }
}

/**
 * Descarga los archivos seleccionados mediante checkbox.
 */
async function downloadSelectedFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    const paths = Array.from(checkboxes)
        .filter(cb => cb.id !== 'checkbox-all')
        .map(cb => cb.dataset.path);

    if (paths.length === 0) {
        showToast('No se han seleccionado archivos', 'error');
        return;
    } else if (paths.length === 1) {
        downloadFile(paths[0])
        return;
    }

    try {
        showToast('Preparando descarga...', 'info');
        const response = await FileService.downloadMultiple(paths);

        // Crear un objeto URL para el blob
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;

        // Nombre del archivo con timestamp
        const timestamp = new Date().getTime();
        link.setAttribute('download', `cherrybox_download_${timestamp}.zip`);

        document.body.appendChild(link);
        link.click();

        // Limpieza
        link.remove();
        window.URL.revokeObjectURL(url);

        document.getElementById('btn-downloadSelectedFiles').style.display = 'none';
        showToast('Descarga iniciada', 'success');

        // Deseleccionar todo
        const checkboxAll = document.getElementById('checkbox-all');
        if (checkboxAll) checkboxAll.checked = false;
        document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = false);
        Renderers.updateSelectionButtons();

    } catch (error) {
        console.error('Error al descargar:', error);

        // Si el error viene de un blob, hay que leerlo como texto
        if (error.response && error.response.data instanceof Blob) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const errData = JSON.parse(reader.result);
                    showToast(errData.error || 'Error al descargar archivos', 'error');
                } catch {
                    showToast('Error al descargar archivos', 'error');
                }
            };
            reader.readAsText(error.response.data);
        } else {
            showToast(error.response?.data?.error || 'Error en el servidor al procesar la descarga', 'error');
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

        document.getElementById('storageLimit').textContent = formatBytes(data.totalStorage);
        document.getElementById('storageUsed').textContent = formatBytes(data.usedStorage);
        document.getElementById('storageAvailable').textContent = formatBytes(data.availableStorage);

        const barFill = document.querySelector('.bar-storage-fill');
        if (barFill && data.totalStorage > 0) {
            const percentage = (data.usedStorage / data.totalStorage) * 100;
            barFill.style.width = `${Math.min(percentage, 100)}%`;
            barFill.style.backgroundColor = percentage < 50 ? '#22c55e' : percentage < 80 ? '#f59e0b' : '#ef4444';
        }
    } catch (error) {
        console.error('Error al obtener el límite de almacenamiento:', error);
    }
}

function downloadFile(path) {
    window.open(`${API_URL}/download?path=${encodeURIComponent(path)}`, '_blank');
}

/**
 * Gestión de Permisos
 */

function showCurrentFolderPermissions() {
    if (currentFolderData.id) {
        showPermissionsModal(currentFolderData.id, currentFolderData.name || "Carpeta Actual");
    } else {
        showToast('No se puede gestionar los permisos de esta carpeta en este momento.', 'error');
    }
}

function updateFolderPermissionButton() {
    const btn = document.getElementById('btn-folderPermissions');
    if (btn) {
        const user = JSON.parse(localStorage.getItem('user'));
        const isAdmin = user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN');
        btn.style.display = (currentFolderData.id || isAdmin) ? 'inline-flex' : 'none';
    }
}

async function showPermissionsModal(fileId, fileName) {
    currentPermissionFileId = fileId;
    document.getElementById('permFileName').textContent = fileName;
    document.getElementById('permissionsModal').classList.add('active');
    await loadPermissions(fileId);
}

async function loadPermissions(fileId) {
    const list = document.getElementById('permissionsList');
    list.innerHTML = '<p>Cargando permisos...</p>';
    try {
        const response = await PermissionService.getFilePermissions(fileId);
        const perms = response.data;

        if (perms.length === 0) {
            list.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No hay permisos adicionales otorgados.</p>';
        } else {
            list.innerHTML = perms.map(p => `
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
            `).join('');
        }
    } catch (error) {
        list.innerHTML = '<p style="color: #ff5555;">Error al cargar permisos.</p>';
    }
}

async function grantPermission() {
    const targetUserId = document.getElementById('targetUserId').value.trim();
    const access = document.getElementById('accessLevel').value;

    if (!targetUserId) return showToast('Ingresa un ID de usuario o Email', 'warning');

    try {
        await PermissionService.grantPermission(currentPermissionFileId, targetUserId, access);
        document.getElementById('targetUserId').value = '';
        await loadPermissions(currentPermissionFileId);
    } catch (error) {
        showToast('Error: ' + (error.response?.data?.error || 'No se pudo otorgar el permiso'), 'error');
    }
}

async function revokePermission(permissionId) {
    if (!confirm('¿Revocar este permiso?')) return;
    try {
        await PermissionService.revokePermission(permissionId);
        await loadPermissions(currentPermissionFileId);
    } catch (error) {
        console.error(error);
    }
}

/**
 * Gestión de Subida de Archivos
 */

async function uploadFiles(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    await uploadFilesProcess(Array.from(files));
    event.target.value = '';
}

async function uploadFilesProcess(files) {
    const progressEl = document.getElementById('uploadProgress');
    const progressList = document.getElementById('progressList');
    const fileCount = document.getElementById('fileCount');
    const totalProgressFill = document.getElementById('totalProgressFill');
    const totalProgressText = document.getElementById('totalProgressText');
    const uploadSpeed = document.getElementById('uploadSpeed');

    progressEl.classList.add('active');
    progressList.innerHTML = '';
    activeUploads = [];

    const totalFiles = files.length;
    let completedCount = 0;
    let totalBytes = files.reduce((acc, file) => acc + file.size, 0);
    let startTime = Date.now();

    fileCount.textContent = `0/${totalFiles}`;
    totalProgressFill.style.width = '0%';
    totalProgressText.textContent = '0%';
    uploadSpeed.textContent = '0 KB/s';

    files.forEach((file, index) => {
        const controller = new AbortController();
        activeUploads.push({ file, controller, status: 'pending', loaded: 0 });

        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.id = `progress-${index}`;
        progressItem.innerHTML = `
            <div class="progress-item-header">
                <span class="progress-file-name" title="${file.name}">[${formatBytes(file.size)}]-${file.name}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="progress-percent">0%</span>
                    <button class="btn-cancel-single" onclick="cancelUpload(${index})" id="cancel-btn-${index}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M18 6l-12 12" /><path d="M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>
            <div class="progress-bar"><div class="progress-fill" style="width: 0%"></div></div>
        `;
        progressList.appendChild(progressItem);
    });

    const updateGlobalProgress = () => {
        let totalLoaded = activeUploads.reduce((acc, u) => acc + u.loaded, 0);
        const percent = totalBytes > 0 ? Math.round((totalLoaded / totalBytes) * 100) : 100;
        totalProgressFill.style.width = percent + '%';
        totalProgressText.textContent = percent + '%';

        const timeElapsed = (Date.now() - startTime) / 1000;
        if (timeElapsed > 0) {
            uploadSpeed.textContent = formatBytes(totalLoaded / timeElapsed) + '/s';
        }
        fileCount.textContent = `${completedCount}/${totalFiles}`;
    };

    const CONCURRENCY_LIMIT = 3;
    let currentIndex = 0;

    const startNextUpload = async () => {
        if (currentIndex >= totalFiles) return;
        const index = currentIndex++;
        const upload = activeUploads[index];
        const progressItem = document.getElementById(`progress-${index}`);
        const progressFill = progressItem.querySelector('.progress-fill');
        const progressText = progressItem.querySelector('.progress-percent');

        upload.status = 'uploading';

        try {
            const formData = new FormData();
            formData.append('files', upload.file);

            const response = await axios.post(`${API_URL}/upload?path=${encodeURIComponent(currentPath)}`, formData, {
                signal: upload.controller.signal,
                onUploadProgress: (event) => {
                    upload.loaded = event.loaded;
                    const percent = Math.round((event.loaded / event.total) * 100);
                    progressFill.style.width = percent + '%';
                    progressText.textContent = percent + '%';
                    updateGlobalProgress();
                }
            });

            if (response.data.success) {
                upload.status = 'completed';
                upload.loaded = upload.file.size;
                progressItem.classList.add('completed');
            } else {
                throw new Error(response.data.error || 'Error desconocido');
            }
        } catch (error) {
            upload.status = axios.isCancel(error) ? 'cancelled' : 'error';
            progressItem.classList.add(upload.status);
            progressText.textContent = upload.status === 'cancelled' ? 'Cancelado' : 'Error';
        } finally {
            const cancelBtn = document.getElementById(`cancel-btn-${index}`);
            if (cancelBtn) cancelBtn.style.display = 'none';
            completedCount++;
            updateGlobalProgress();
            await startNextUpload();
        }
    };

    const initialPool = [];
    for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, totalFiles); i++) {
        initialPool.push(startNextUpload());
    }
    await Promise.all(initialPool);

    setTimeout(() => {
        if (!activeUploads.some(u => u.status === 'uploading')) {
            progressEl.classList.remove('active');
            loadFiles(currentPath);
        }
    }, 2000);
}

function cancelUpload(index) {
    if (activeUploads[index] && activeUploads[index].status === 'uploading') {
        activeUploads[index].controller.abort();
    }
}

function cancelAllUploads() {
    activeUploads.forEach(u => (u.status === 'uploading' || u.status === 'pending') && u.controller.abort());
}

/**
 * Listeners y Configuración Inicial
 */

function toggleSelectAll(element) {
    const isChecked = element.checked;
    document.querySelectorAll('.file-checkbox').forEach(cb => cb.checked = isChecked);
    Renderers.updateSelectionButtons();
}

document.addEventListener('change', (e) => {
    if (e.target?.classList.contains('file-checkbox')) {
        Renderers.updateSelectionButtons();
    }
});

document.addEventListener('keypress', (e) => {
    if (e.target.id === 'searchInput' && e.key === 'Enter') {
        searchFiles();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
        e.preventDefault();
        loadFiles(currentPath);
    }
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        UILogic.closeModal(e.target.id);
    }
});

// Inicialización
if (document.getElementById('fileList')) {
    loadFiles();
    UILogic.setupDragAndDrop();
    getStorage();
}

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (document.getElementById('fileList')) loadFiles(currentPath);
    }, 250);
});

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
window.showPermissionsModal = showPermissionsModal;
window.revokePermission = revokePermission;
window.grantPermission = grantPermission;
window.showCurrentFolderPermissions = showCurrentFolderPermissions;