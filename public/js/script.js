const API_URL = '/api';

let currentPath = '';
let currentRenameItem = null;
let currentPreviewPath = null;
let currentPermissionFileId = null;
let currentFolderData = { id: null, name: "" };

let isLoadingFiles = false;
async function loadFiles(path = '') {
    if (isLoadingFiles) return;
    isLoadingFiles = true;
    try {
        const response = await axios.get(`${API_URL}/files?path=${encodeURIComponent(path)}`);
        const data = response.data;

        currentPath = data.currentPath;
        currentFolderData = { id: data.currentFolderId, name: data.currentFolderName };
        updateBreadcrumb(currentPath);
        renderFiles(data.files);
        updateFolderPermissionButton();
    } catch (error) {
        if (error.response && error.response.status === 401) {
            location.href = '/login';
        }
    } finally {
        isLoadingFiles = false;
    }
}

// Búsqueda al presionar Enter
document.getElementById('searchInput')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchFiles();
    }
});

async function searchFiles() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value.trim();

    if (!query) {
        await loadFiles(currentPath);
        return;
    }

    try {
        const response = await axios.get(`${API_URL}/search?q=${encodeURIComponent(query)}`);
        const data = response.data;
        renderFiles(data);
    } catch (error) {
        location.href = '/error?code=' + error.response.status + '&message=' + error.response.data.error;
    }
}

searchFiles();

function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    breadcrumb.innerHTML = '<span onclick="navigateTo(\'\')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-home"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" /></svg></span>';

    if (path) {
        const parts = path.split('/').filter(p => p);
        let currentPath = '';

        parts.forEach(part => {
            currentPath += (currentPath ? '/' : '') + part;
            const pathCopy = currentPath;
            breadcrumb.innerHTML += ` / <span style="cursor: pointer; max-width: 150px; overflow: hidden; text-overflow: ellipsis;" onclick="navigateTo('${pathCopy}')">${part}</span>`;
        });
    }
}

function renderFiles(files) {
    const fileList = document.getElementById('fileList');

    if (!fileList) return;

    if (files.length === 0) {
        fileList.innerHTML = `
                    <div class="upload-area" id="uploadArea" onclick="document.getElementById('fileInput')?.click()">
                        <div class="upload-icon">📤</div>
                        <div class="upload-text">Arrastra archivos aquí o haz clic para seleccionar</div>
                        <div class="upload-hint">Esta carpeta está vacía. Puedes subir múltiples archivos a la vez</div>
                    </div>
                `;
        updateSelectionButtons();
        return;
    }

    const isMobile = window.innerWidth < 768;
    //agregar fila al inicio con checkbox para seleccionar todos o deseleccionar todos
    fileList.innerHTML = '<div class="file-item"><input type="checkbox" class="file-checkbox" id="checkbox-all" onchange="toggleSelectAll(this)"> <label for="checkbox-all" class="checkbox-label"><div class="file-icon"></div></label> <div class="file-info"> <div class="file-name" style="font-weight: 600;"></div> <div class="file-meta"></div> </div> <div class="file-actions"></div> </div>';
    fileList.innerHTML += files.map(file => {
        const isFolder = file.type === 'folder';
        const icon = isFolder ? '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="#FFE36C" class="icon icon-tabler icons-tabler-filled icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>' : getFileIcon(file.name);
        const size = isFolder ? '' : formatBytes(file.size);
        const date = new Date(file.modified).toLocaleDateString('es-ES');

        return `
                    <div class="file-item" onclick="${isFolder ? `navigateTo('${file.path}')` : `previewFile('${file.path}', '${file.name}')`}">
                        <input type="checkbox" id="checkbox-${file.path}" class="file-checkbox" data-path="${file.path}" onclick="event.stopPropagation();">
                        <label for="checkbox-${file.path}" class="checkbox-label">
                            <div class="file-icon">${icon}</div>
                        </label>
                        <div class="file-info">
                            <div class="file-name">${file.name}</div>
                            <div class="file-meta">${size}${size ? ' • ' : ''}${date}</div>
                        </div>
                        <div class="file-actions">
                            <button class="icon-btn" onclick="event.stopPropagation(); showPermissionsModal('${file.id}', '${file.name}')" title="Permisos">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></svg>
                                ${isMobile ? '' : '<p style="color: #22c55e;">Permisos</p>'}
                            </button>
                            <button class="icon-btn" onclick="event.stopPropagation(); showRenameModal('${file.path}', '${file.name}')" title="Renombrar">
                                ${isMobile ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#4284efff" class="icon icon-tabler icons-tabler-filled icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a1 1 0 0 1 -1 1h-1a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1 -1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3h1a1 1 0 0 1 1 1" /><path d="M14.596 5.011l4.392 4.392l-6.28 6.303a1 1 0 0 1 -.708 .294h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 .294 -.708zm6.496 -2.103a3.097 3.097 0 0 1 .165 4.203l-.164 .18l-.693 .694l-4.387 -4.387l.695 -.69a3.1 3.1 0 0 1 4.384 0" /></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#4284efff" class="icon icon-tabler icons-tabler-filled icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a1 1 0 0 1 -1 1h-1a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1 -1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3h1a1 1 0 0 1 1 1" /><path d="M14.596 5.011l4.392 4.392l-6.28 6.303a1 1 0 0 1 -.708 .294h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 .294 -.708zm6.496 -2.103a3.097 3.097 0 0 1 .165 4.203l-.164 .18l-.693 .694l-4.387 -4.387l.695 -.69a3.1 3.1 0 0 1 4.384 0" /></svg> <p>Renombrar</p>'}
                            </button>
                            <button class="icon-btn" onclick="event.stopPropagation(); deleteFile('${file.path}', '${file.name}')" title="Eliminar">
                                ${isMobile ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ff5555ff" class="icon icon-tabler icons-tabler-filled icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" /><path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" /></svg>' : '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ff5555ff" class="icon icon-tabler icons-tabler-filled icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" /><path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" /></svg> <p>Eliminar</p>'}
                            </button>
                        </div>
                    </div>
                `;
    }).join('');

    updateSelectionButtons();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function navigateTo(path) {
    loadFiles(path);
}

function handleFileClick(path, type) {
    if (type === 'folder') {
        navigateTo(path);
    }
}

// Manejo de doble tap en móviles
let lastTap = 0;
function handleTouchEnd(event, path, type) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;

    if (tapLength < 500 && tapLength > 0) {
        event.preventDefault();
        handleFileClick(path, type);
    }
    lastTap = currentTime;
}

async function createFolder() {
    const name = document.getElementById('folderNameInput').value.trim();
    if (!name) {
        showToast('Por favor ingresa un nombre', 'warning');
        return;
    }

    try {
        const response = await axios.post(`${API_URL}/folder`, {
            path: currentPath,
            name
        });

        const data = response.data;
        if (data.success) {
            closeModal('createFolderModal');
            document.getElementById('folderNameInput').value = '';
            loadFiles(currentPath);
        } else {
            showToast(data.error, 'error');
        }
    } catch (error) {
        showToast('Error al crear carpeta', 'error');
    }
}

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

    progressEl.classList.add('active');
    progressList.innerHTML = '';

    let completed = 0;
    const total = files.length;

    fileCount.textContent = `${completed}/${total}`;

    // Crear elementos de progreso para cada archivo
    files.forEach((file, index) => {
        const progressItem = document.createElement('div');
        progressItem.className = 'progress-item';
        progressItem.id = `progress-${index}`;
        progressItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <span>${file.name} (${formatBytes(file.size)})</span>
                        <span class="progress-percent">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                `;
        progressList.appendChild(progressItem);
    });

    // Subir todos los archivos en una sola petición
    try {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('files', file);
        });

        const response = await axios.post(`${API_URL}/upload?path=${encodeURIComponent(currentPath)}`, formData, {
            onUploadProgress: (progressEvent) => {
                const percent = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                files.forEach((_, i) => {
                    const progressFill = document.querySelector(`#progress-${i} .progress-fill`);
                    const progressText = document.querySelector(`#progress-${i} .progress-percent`);
                    if (progressFill) progressFill.style.width = percent + '%';
                    if (progressText) progressText.textContent = percent + '%';
                });
            }
        });

        const data = response.data;

        if (data.success) {
            // Marcar todos como completados
            files.forEach((_, index) => {
                const progressFill = document.querySelector(`#progress-${index} .progress-fill`);
                if (progressFill) progressFill.style.width = '100%';
            });
            completed = total;
            fileCount.textContent = `${completed}/${total}`;

            showToast(data.message, 'success');
        } else {
            // Marcar todos como error
            files.forEach((_, index) => {
                const progressFill = document.querySelector(`#progress-${index} .progress-fill`);
                if (progressFill) {
                    progressFill.style.background = '#dc3545';
                    progressFill.style.width = '100%';
                }
            });
        }
    } catch (error) {
        // Marcar todos como error
        files.forEach((_, index) => {
            const progressFill = document.querySelector(`#progress-${index} .progress-fill`);
            if (progressFill) {
                progressFill.style.background = '#dc3545';
                progressFill.style.width = '100%';
            }
        });
        console.error('Error al subir archivos:', error);
    }

    // Ocultar progreso y recargar después de 2 segundos
    setTimeout(() => {
        progressEl.classList.remove('active');
        loadFiles(currentPath);
    }, 2000);
}

// Configurar drag and drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    if (!uploadArea) return;

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('drag-over');
        }, false);
    });

    uploadArea.addEventListener('drop', handleDrop, false);
}

// Listeners globales que solo se deben registrar una vez
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.body.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files);

    if (files.length > 0) {
        uploadFilesProcess(files);
    }
}

function showRenameModal(path, currentName) {
    currentRenameItem = path;
    document.getElementById('renameInput').value = currentName;
    document.getElementById('renameModal').classList.add('active');
}

async function confirmRename() {
    const newName = document.getElementById('renameInput').value.trim();
    if (!newName) {
        showToast('Por favor ingresa un nombre', 'warning');
        return;
    }

    try {
        await axios.put(`${API_URL}/rename`, {
            oldPath: currentRenameItem,
            newName
        });
        closeModal('renameModal');
        loadFiles(currentPath);
    } catch (error) {
        console.error(error);
    }
}

async function deleteFile(path, name) {
    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

    try {
        await axios.delete(`${API_URL}/delete`, {
            data: { path: path }
        });
        loadFiles(currentPath);
    } catch (error) {
        console.error('Error al eliminar:', error);
    }
}

async function previewFile(path, name) {
    currentPreviewPath = path;
    const ext = name.split('.').pop().toLowerCase();
    const previewContent = document.getElementById('previewContent');
    const previewTitle = document.getElementById('previewTitle');
    const modal = document.getElementById('previewModal');

    previewTitle.innerHTML = getFileIcon(ext) + ' ' + name;
    previewContent.innerHTML = '<p>Cargando...</p>';

    // Limpiar clases previas de tipo de archivo
    modal.classList.remove('preview-pdf', 'preview-image', 'preview-text', 'preview-video', 'preview-audio');
    modal.classList.add('active');

    // Scroll al inicio del modal
    modal.scrollTop = 0;

    try {
        const textExts = ['txt', 'md', 'json', 'js', 'css', 'html', 'xml', 'csv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
        const videoExts = ['mp4', 'webm', 'ogg'];
        const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
        const pdfExts = ['pdf'];

        if (textExts.includes(ext)) {
            modal.classList.add('preview-text');
            const response = await fetch(`${API_URL}/file-content?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            previewContent.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
        } else if (imageExts.includes(ext)) {
            modal.classList.add('preview-image');
            previewContent.innerHTML = `<img src="${API_URL}/file-content?path=${encodeURIComponent(path)}" alt="${name}" loading="lazy">`;
        } else if (videoExts.includes(ext)) {
            modal.classList.add('preview-video');
            previewContent.innerHTML = `<video controls preload="metadata"><source src="${API_URL}/file-content?path=${encodeURIComponent(path)}" type="video/${ext}"></video>`;
        } else if (audioExts.includes(ext)) {
            modal.classList.add('preview-audio');
            previewContent.innerHTML = `<audio controls preload="metadata"><source src="${API_URL}/file-content?path=${encodeURIComponent(path)}" type="audio/${ext}"></audio>`;
        } else if (pdfExts.includes(ext)) {
            modal.classList.add('preview-pdf');
            previewContent.innerHTML = `<iframe src="${API_URL}/file-content?path=${encodeURIComponent(path)}" type="application/pdf" class="pdfViewer"></iframe>`;
        } else {
            previewContent.innerHTML = '<p>Vista previa no disponible para este tipo de archivo. Puedes descargarlo.</p>';
        }
    } catch (error) {
        console.error('Error al cargar vista previa:', error);
        previewContent.innerHTML = '<p>Error al cargar la vista previa</p>';
    }
}

//
async function getStorage() {
    try {
        const response = await axios.get(`${API_URL}/getstorage`);
        const data = response.data;

        const format = (bytes) => {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        document.getElementById('storageLimit').textContent = format(data.totalStorage);
        document.getElementById('storageUsed').textContent = format(data.usedStorage);
        document.getElementById('storageAvailable').textContent = format(data.availableStorage);

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


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showCreateFolderModal() {
    document.getElementById('createFolderModal').classList.add('active');
}



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
        // Solo administradores o si estamos en una carpeta con ID válido
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
        const response = await axios.get(`${API_URL}/permissions/file/${fileId}`);
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-trash">
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
        await axios.post(`${API_URL}/permissions/grant`, {
            fileId: currentPermissionFileId,
            targetUserId,
            access
        });
        document.getElementById('targetUserId').value = '';
        await loadPermissions(currentPermissionFileId);
    } catch (error) {
        showToast('Error: ' + (error.response?.data?.error || 'No se pudo otorgar el permiso'), 'error');
    }
}

async function revokePermission(permissionId) {
    if (!confirm('¿Revocar este permiso?')) return;
    try {
        await axios.delete(`${API_URL}/permissions/revoke/${permissionId}`);
        await loadPermissions(currentPermissionFileId);
    } catch (error) {
        console.error(error);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
    // Limpiar clases de tipo de archivo si es el modal de preview
    if (modalId === 'previewModal') {
        modal.classList.remove('preview-pdf', 'preview-image', 'preview-text', 'preview-video', 'preview-audio');
    }
    const audio = document.querySelector('audio');
    const video = document.querySelector('video');
    if (audio) audio.pause();
    if (video) video.pause();
}

// Cerrar modal al tocar fuera (mejorado para móvil)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        const audio = document.querySelector('audio');
        const video = document.querySelector('video');
        if (audio) audio.pause();
        if (video) video.pause();
    }
});

// Prevenir zoom en inputs en iOS
document.addEventListener('touchstart', function () { }, { passive: true });

// Inicialización dependiendo de la vista
if (document.getElementById('fileList')) {
    loadFiles();
    setupDragAndDrop();
    getStorage();
}

// Re-renderizar en cambio de tamaño para ajustar botones móviles
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (document.getElementById('fileList')) loadFiles(currentPath);
    }, 250);
});


//eliminar los archivos con el checkbox seleccionado
async function deleteSelectedFiles() {
    const checkboxes = document.querySelectorAll('.file-checkbox:checked');
    const paths = Array.from(checkboxes).map(checkbox => checkbox.dataset.path);
    if (paths.length === 0) {
        showToast('No se han seleccionado archivos', 'error');
        return;
    }
    if (confirm(`¿Estás seguro de que quieres eliminar ${paths.length} archivos?`)) {
        try {
            await Promise.all(paths.map(path => axios.delete(`${API_URL}/delete`, { data: { path } })));

            const btn = document.getElementById('btn-deleteSelectedFiles');
            if (btn) btn.style.display = 'none';

            await loadFiles(currentPath);
        } catch (error) {
            console.error('Error al eliminar archivos:', error);
            await loadFiles(currentPath);
        }
    }
}

const btnDeleteSelectFiles = document.getElementById('btn-deleteSelectedFiles');

function updateSelectionButtons() {
    const totalCount = document.querySelectorAll('.file-checkbox').length;
    const checkedCount = document.querySelectorAll('.file-checkbox:checked').length;

    if (btnDeleteSelectFiles) {
        btnDeleteSelectFiles.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
    }

    const checkboxAll = document.getElementById('checkbox-all');
    if (checkboxAll) {
        checkboxAll.checked = (totalCount > 0 && checkedCount === totalCount);
        checkboxAll.indeterminate = (checkedCount > 0 && checkedCount < totalCount);
    }
}

// Inicializar estado oculto
updateSelectionButtons();

function toggleSelectAll(element) {
    const isChecked = element.checked;
    const checkboxes = document.querySelectorAll('.file-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });
    updateSelectionButtons();
}

// Delegación de eventos para capturar el cambio en los checkboxes dinámicos
document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('file-checkbox')) {
        updateSelectionButtons();
    }
});

//recargar lista de archivos de la ruta actual con F5
document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
        e.preventDefault();
        console.log("Lista actualizada:" + currentPath)
        loadFiles(currentPath);
    }
});

function refreshpath() {
    console.log("Lista actualizada:" + currentPath)
    loadFiles(currentPath);
}