/**
 * Lógica de interfaz de usuario, modales y previsualización.
 */
const UILogic = {
    /**
     * Muestra el modal de renombrado.
     * @param {string} path - Ruta del archivo.
     * @param {string} currentName - Nombre actual.
     */
    showRenameModal(path, currentName) {
        currentRenameItem = path;
        const input = document.getElementById('renameInput');
        if (input) input.value = currentName;
        document.getElementById('renameModal')?.classList.add('active');
    },

    /**
     * Muestra el modal para crear carpeta.
     */
    showCreateFolderModal() {
        document.getElementById('createFolderModal')?.classList.add('active');
    },

    /**
     * Cierra un modal específico.
     * @param {string} modalId - ID del modal.
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        modal.classList.remove('active');

        if (modalId === 'previewModal') {
            modal.classList.remove('preview-pdf', 'preview-image', 'preview-text', 'preview-video', 'preview-audio');
            pauseMedia();
        }

        if (modalId === 'musicPlayerModal') {
            if (window.MusicPlayer) {
                window.MusicPlayer.pause();
            }
        }
    },

    /**
     * Maneja la previsualización de archivos.
     * @param {string} path - Ruta del archivo.
     * @param {string} name - Nombre del archivo.
     */
    async previewFile(path, name) {
        currentPreviewPath = path;
        const ext = name.split('.').pop().toLowerCase();
        const previewContent = document.getElementById('previewContent');
        const previewTitle = document.getElementById('previewTitle');
        const modal = document.getElementById('previewModal');

        if (!modal || !previewContent || !previewTitle) return;

        previewTitle.innerHTML = getFileIcon(ext) + ' ' + escapeHTML(name);
        previewContent.innerHTML = '<p>Cargando...</p>';

        modal.classList.remove('preview-pdf', 'preview-image', 'preview-text', 'preview-video', 'preview-audio');
        modal.classList.add('active');
        modal.scrollTop = 0;

        try {
            const contentUrl = `${API_URL}/file-content?path=${encodeURIComponent(path)}`;

            if (textExts.includes(ext)) {
                modal.classList.add('preview-text');
                const response = await FileService.getFileContent(path);
                const data = await response.json();
                previewContent.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
            } else if (imageExts.includes(ext)) {
                modal.classList.add('preview-image');
                previewContent.innerHTML = `<img src="${contentUrl}" alt="${name}" loading="lazy">`;
            } else if (videoExts.includes(ext)) {
                modal.classList.add('preview-video');
                previewContent.innerHTML = `<video controls preload="metadata"><source src="${contentUrl}" type="video/${ext}"></video>`;
            } else if (audioExts.includes(ext)) {
                modal.classList.add('preview-audio');
                previewContent.innerHTML = `<audio controls preload="metadata"><source src="${contentUrl}" type="audio/${ext}"></audio>`;
            } else if (pdfExts.includes(ext)) {
                modal.classList.add('preview-pdf');
                previewContent.innerHTML = `<iframe src="${contentUrl}" type="application/pdf" class="pdfViewer"></iframe>`;
            } else {
                previewContent.innerHTML = '<p>Vista previa no disponible para este tipo de archivo. Puedes descargarlo.</p>';
            }
        } catch (error) {
            console.error('Error al cargar vista previa:', error);
            previewContent.innerHTML = '<p>Error al cargar la vista previa</p>';
        }
    },

    /**
     * Configura el manejo de archivos arrastrados.
     */
    setupDragAndDrop() {
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

        uploadArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = Array.from(dt.files);
            if (files.length > 0) {
                window.uploadFilesProcess(files);
            }
        }, false);
    },

    async readyPlayerMusic() {
        const musicFiles = await getMusicFiles(currentPath);
        MusicPlayer.setPlaylist(musicFiles);

        const playlist = document.getElementById('playlist');
        playlist.innerHTML = '';

        musicFiles.forEach((file, index) => {
            const p = document.createElement('p');
            p.textContent = file.name;
            p.onclick = () => MusicPlayer.playTrack(index);
            playlist.appendChild(p);
        });

        document.getElementById('musicPlayerModal').classList.add('active');
    }


};

function pauseMedia() {
    const audio = document.querySelector('audio');
    const video = document.querySelector('video');
    if (audio) audio.pause();
    if (video) video.pause();
}

window.UILogic = UILogic;
window.showRenameModal = UILogic.showRenameModal;
window.showCreateFolderModal = UILogic.showCreateFolderModal;
window.closeModal = UILogic.closeModal;
window.previewFile = UILogic.previewFile;
window.setupDragAndDrop = UILogic.setupDragAndDrop;
window.readyPlayerMusic = UILogic.readyPlayerMusic;
