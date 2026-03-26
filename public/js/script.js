const API_URL = '/api';

// Interceptor global para redirección si no hay sesión
axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response && error.response.status === 401 && window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

let currentPath = '';
let currentRenameItem = null;
let currentPreviewPath = null;

async function loadFiles(path = '') {
    try {
        const response = await axios.get(`${API_URL}/files?path=${encodeURIComponent(path)}`);
        const data = response.data;

        currentPath = data.currentPath;
        updateBreadcrumb(currentPath);
        renderFiles(data.files);
    } catch (error) {
        location.href = '/error?code=' + error.response.status + '&message=' + error.response.data.error;
    }
}

async function searchFiles() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput?.value.trim();

    //busqueda instantanea al escribir
    searchInput.addEventListener('input', searchFiles);

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
    breadcrumb.innerHTML = '<span onclick="navigateTo(\'\')">🏠 Inicio</span>';

    if (path) {
        const parts = path.split('/').filter(p => p);
        let currentPath = '';

        parts.forEach(part => {
            currentPath += (currentPath ? '/' : '') + part;
            const pathCopy = currentPath;
            breadcrumb.innerHTML += ` / <span onclick="navigateTo('${pathCopy}')">${part}</span>`;
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
        if (typeof setupDragAndDrop === 'function') setupDragAndDrop();
        return;
    }

    const isMobile = window.innerWidth < 768;
    fileList.innerHTML = files.map(file => {
        const isFolder = file.type === 'folder';
        const icon = isFolder ? '📁' : getFileIcon(file.name);
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
                            <button class="icon-btn" onclick="event.stopPropagation(); showRenameModal('${file.path}', '${file.name}')" title="Renombrar">
                                ${isMobile ? '✏️' : '✏️ Renombrar'}
                            </button>
                            <button class="icon-btn" onclick="event.stopPropagation(); deleteFile('${file.path}', '${file.name}')" title="Eliminar">
                                ${isMobile ? '🗑️' : '🗑️ Eliminar'}
                            </button>
                        </div>
                    </div>
                `;
    }).join('');
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const icons = {
        'txt': '📄', 'md': '📄', 'pdf': '📕',
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
        'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
        'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵',
        'zip': '📦', 'rar': '📦', '7z': '📦',
        'js': '📜', 'html': '📜', 'css': '📜', 'json': '📜'
    };
    return icons[ext] || '📄';
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
        alert('Por favor ingresa un nombre');
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
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error al crear carpeta');
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

            console.log('Archivos subidos exitosamente:', data.files);
        } else {
            // Marcar todos como error
            files.forEach((_, index) => {
                const progressFill = document.querySelector(`#progress-${index} .progress-fill`);
                if (progressFill) {
                    progressFill.style.background = '#dc3545';
                    progressFill.style.width = '100%';
                }
            });
            console.error('Error al subir archivos:', data.error);
            alert('Error al subir archivos: ' + data.error);
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
        alert('Error de conexión al subir archivos');
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

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

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
        alert('Por favor ingresa un nombre');
        return;
    }

    try {
        const response = await axios.put(`${API_URL}/rename`, {
            oldPath: currentRenameItem,
            newName
        });

        const data = response.data;
        if (data.success) {
            closeModal('renameModal');
            loadFiles(currentPath);
        } else {
            alert('Error: ' + data.error);
        }
    } catch (error) {
        alert('Error al renombrar');
    }
}

async function deleteFile(path, name) {
    if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

    try {
        console.log('Eliminando:', path);

        const response = await axios.delete(`${API_URL}/delete`, {
            data: { path: path }
        });

        const data = response.data;

        if (data.success) {
            console.log('Eliminado exitosamente');
            loadFiles(currentPath);
        } else {
            console.error('Error del servidor:', data.error);
            alert('Error al eliminar: ' + data.error);
        }
    } catch (error) {
        console.error('Error al eliminar:', error);
        alert('Error de conexión al eliminar el archivo');
    }
}

async function previewFile(path, name) {
    currentPreviewPath = path;
    const ext = name.split('.').pop().toLowerCase();
    const previewContent = document.getElementById('previewContent');
    const previewTitle = document.getElementById('previewTitle');
    const modal = document.getElementById('previewModal');

    previewTitle.textContent = name;
    previewContent.innerHTML = '<p>Cargando...</p>';
    modal.classList.add('active');

    // Scroll al inicio del modal
    modal.scrollTop = 0;

    try {
        const textExts = ['txt', 'md', 'json', 'js', 'css', 'html', 'xml', 'csv'];
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'];
        const videoExts = ['mp4', 'webm', 'ogg'];
        const audioExts = ['mp3', 'wav', 'ogg', 'm4a'];
        const pdfExts = ['pdf'];

        if (textExts.includes(ext)) {
            const response = await fetch(`${API_URL}/file-content?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            previewContent.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
        } else if (imageExts.includes(ext)) {
            previewContent.innerHTML = `<img src="${API_URL}/file-content?path=${encodeURIComponent(path)}" alt="${name}" loading="lazy">`;
        } else if (videoExts.includes(ext)) {
            previewContent.innerHTML = `<video controls preload="metadata"><source src="${API_URL}/file-content?path=${encodeURIComponent(path)}"></video>`;
        } else if (audioExts.includes(ext)) {
            previewContent.innerHTML = `<audio controls preload="metadata"><source src="${API_URL}/file-content?path=${encodeURIComponent(path)}"></audio>`;
        } else if (pdfExts.includes(ext)) {
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



function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    const audio = document.querySelector('audio');
    const video = document.querySelector('video');
    if (audio) audio.pause();
    if (video) video.pause();
}

// Cerrar modal al tocar fuera (mejorado para móvil)
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
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

// Manejo de formulario de Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await axios.post('/api/auth/login', { email, password });
            window.location.href = '/';
        } catch (error) {
            alert(error.response?.data?.error || 'Error al iniciar sesión');
        }
    });
}

// Manejo de formulario de Registro
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('passwordConfirm').value;

        if (password !== passwordConfirm) {
            alert('Las contraseñas no coinciden');
            return;
        }

        try {
            const res = await axios.post('/api/auth/register', { email, password });
            alert(res.data.message || 'Usuario registrado exitosamente');
            registerForm.reset();
        } catch (error) {
            alert(error.response?.data?.error || 'Error al registrar usuario');
        }
    });
}

async function logout() {
    try {
        await axios.post('/api/auth/logout');
        window.location.href = '/login';
    } catch (error) {
        alert(error.response?.data?.error || 'Error al cerrar sesión');
    }
}