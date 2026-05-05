/**
 * Funciones para renderizar componentes de la interfaz de usuario.
 */
const Renderers = {
    /**
     * Actualiza el breadcrumb (migas de pan) de navegación.
     * @param {string} path - Ruta actual.
     */
    updateBreadcrumb(path) {
        const breadcrumb = document.getElementById('breadcrumb');
        if (!breadcrumb) return;

        breadcrumb.innerHTML = '<span onclick="navigateTo(\'\')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-home"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" /></svg></span>';

        if (path) {
            const parts = path.split('/').filter(p => p);
            let currentPathAccumulator = '';

            parts.forEach(part => {
                currentPathAccumulator += (currentPathAccumulator ? '/' : '') + part;
                const pathCopy = currentPathAccumulator;
                breadcrumb.innerHTML += ` / <span style="cursor: pointer; max-width: 150px; overflow: hidden; text-overflow: ellipsis;" onclick="navigateTo('${pathCopy}')">${part}</span>`;
            });
        }
    },

    /**
     * Renderiza la lista de archivos en el contenedor principal.
     * @param {Array} files - Lista de objetos de archivo.
     */
    renderFiles(files) {
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
            this.updateSelectionButtons();
            return;
        }
        const isMobile = window.innerWidth < 768;

        // Fila inicial con checkbox para seleccionar todos
        fileList.innerHTML = `
            <div class="file-item">
                <input type="checkbox" class="file-checkbox" id="checkbox-all" onchange="toggleSelectAll(this)">
                <label for="checkbox-all" class="checkbox-label"><div class="file-icon"></div></label>
                <div class="file-info">
                    <div class="file-name" style="font-weight: 600;"></div>
                    <div class="file-meta"></div>
                </div>
                <div class="file-actions"></div>
            </div>
        `;

        fileList.innerHTML += files.map(file => {
            const isFolder = file.type === 'folder';
            const icon = isFolder ?
                '<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="#FFE36C" class="icon icon-tabler icons-tabler-filled icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>' :
                getFileIcon(file.name);
            const size = isFolder ? '' : formatBytes(file.size);
            const date = new Date(file.modified).toLocaleDateString('es-ES');

            const escPath = escapeJS(file.path);
            const escName = escapeJS(file.name);
            const escId = escapeJS(file.id);
            const attrPath = escapeHTML(file.path);
            const attrType = escapeHTML(file.type);

            return `
                <div class="file-item" onclick="${isFolder ? `navigateTo('${escPath}')` : `previewFile('${escPath}', '${escName}')`}">
                    <input onchange="updateSelectionButtons()" type="checkbox" id="checkbox-${attrPath}" class="file-checkbox" data-type="${attrType}" data-path="${attrPath}" onclick="event.stopPropagation();">
                    <label for="checkbox-${attrPath}" class="checkbox-label">
                        <div class="file-icon">${icon}</div>
                    </label>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${size}${size ? ' • ' : ''}${date}</div>
                    </div>
                    <div class="file-actions">
                        <button class="icon-btn" onclick="event.stopPropagation(); showPermissionsModal('${escId}', '${escName}')" title="Permisos">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></svg>
                            ${isMobile ? '' : '<p>Permisos</p>'}
                        </button>
                        <button class="icon-btn" onclick="event.stopPropagation(); showRenameModal('${escPath}', '${escName}')" title="Renombrar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#4284efff" class="icon icon-tabler icons-tabler-filled icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a1 1 0 0 1 -1 1h-1a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1 -1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3h1a1 1 0 0 1 1 1" /><path d="M14.596 5.011l4.392 4.392l-6.28 6.303a1 1 0 0 1 -.708 .294h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 .294 -.708zm6.496 -2.103a3.097 3.097 0 0 1 .165 4.203l-.164 .18l-.693 .694l-4.387 -4.387l.695 -.69a3.1 3.1 0 0 1 4.384 0" /></svg>
                            ${isMobile ? '' : '<p>Renombrar</p>'}
                        </button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteFile('${escPath}', '${escName}')" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ff5555ff" class="icon icon-tabler icons-tabler-filled icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" /><path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" /></svg>
                            ${isMobile ? '' : '<p>Eliminar</p>'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.updateSelectionButtons();
    },

    /**
     * Actualiza el estado de los botones de selección masiva.
     */
    updateSelectionButtons() {
        const btnDeleteSelected = document.getElementById('btn-deleteSelectedFiles');
        const btnDownloadSelected = document.getElementById('btn-downloadSelectedFiles');
        const checkboxes = document.querySelectorAll('.file-checkbox');
        const checkedCount = document.querySelectorAll('.file-checkbox:checked').length;
        const totalCount = checkboxes.length;

        if (btnDeleteSelected) {
            btnDeleteSelected.style.display = checkedCount > 0 ? 'inline-flex' : 'none';
        }

        if (checkedCount > 0) {
            const selectedCheckboxes = document.querySelectorAll('.file-checkbox:checked');
            const hasFolder = Array.from(selectedCheckboxes).some(cb => cb.dataset.type === 'folder');

            if (btnDownloadSelected) {
                btnDownloadSelected.style.display = !hasFolder ? 'inline-flex' : 'none';
            }
        } else if (btnDownloadSelected) {
            btnDownloadSelected.style.display = 'none';
        }

        const checkboxAll = document.getElementById('checkbox-all');
        if (checkboxAll) {
            checkboxAll.checked = (totalCount > 0 && checkedCount === totalCount);
            checkboxAll.indeterminate = (checkedCount > 0 && checkedCount < totalCount);
        }
    }
};
window.Renderers = Renderers;
window.updateBreadcrumb = Renderers.updateBreadcrumb;
window.renderFiles = Renderers.renderFiles;
window.updateSelectionButtons = Renderers.updateSelectionButtons;
