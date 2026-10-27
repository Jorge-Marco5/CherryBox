class FilesManager {
    /**
     * Carga los archivos de una ruta específica.
     */
    async loadFiles(path = "") {
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
            await this.getStorage();

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
     * Realiza una búsqueda de archivos según el texto ingresado.
     */
    async searchFiles() {
        const searchInput = document.getElementById("searchInput");
        const query = searchInput?.value.trim();

        if (query === "") {
            this.loadFiles("");
            return;
        }

        try {
            const response = await FileService.searchFiles(query);
            Renderers.renderFiles(response.data);
            isLoadingFiles = false;
        } catch (error) {
            alert("Error al buscar archivos: " + error.message);
            location.href = "/error?code=" + error.response?.status + "&message=" + error.response?.data?.error;
        }
    }

    /**
     * Crea una nueva carpeta.
     */
    async createFolder(name, color) {
        const folderName = name !== undefined ? name : document.getElementById("folderNameInput")?.value.trim();
        const folderColor = color !== undefined ? color : document.getElementById("folderColorInput")?.value;

        if (!folderName) {
            showToast("Por favor ingresa un nombre", "warning");
            return;
        }

        try {
            const response = await FileService.createFolder(currentPath, folderName, folderColor);
            if (response.data.success) {
                if (typeof UILogic !== "undefined" && UILogic.closeModal) {
                    UILogic.closeModal(currentModalActive);
                }
                const input = document.getElementById("folderNameInput");
                if (input) input.value = "";

                await this.loadFiles(currentPath);
            } else {
                showToast(response.data.error, "error");
            }
        } catch (error) {
            showToast("Error al crear carpeta", "error");
        }
    }

    /**
     * Confirma el renombrado de un archivo o carpeta.
     */
    async confirmRename(newName, newColor) {
        const name = newName !== undefined ? newName : document.getElementById("renameInput")?.value.trim();
        const color = newColor !== undefined ? newColor : document.getElementById("renameColorInput")?.value;

        if (!name) {
            showToast("Por favor ingresa un nombre", "warning");
            return;
        }

        try {
            await FileService.rename(currentRenameItem, name, color);
            if (typeof UILogic !== "undefined" && UILogic.closeModal) {
                UILogic.closeModal(currentModalActive);
            }

            await this.loadFiles(currentPath);
        } catch (error) {
            console.error("Error al renombrar:", error);
            showToast("Error al renombrar", "error");
        }
    }

    /**
     * Genera un enlace temporal de descarga/compartir.
     */
    async createShareLink(filePath, time) {
        const path = filePath !== undefined ? filePath : currentRenameItem;
        const timeShare = time !== undefined ? time : document.getElementById("selectTimeShare")?.value;
        const inputPathShare = document.getElementById("inputPathShare");
        if (inputPathShare) inputPathShare.value = "";

        if (!timeShare) {
            showToast("Por favor selecciona un tiempo límite", "warning");
            return null;
        }

        try {
            const res = await FileService.createShareLink(path, timeShare);
            if (inputPathShare) {
                inputPathShare.value = res.data.url;
            }
            return res.data.url;
        } catch (error) {
            console.error("Error al crear enlace compartido:", error);
            showToast("Error al crear enlace", "error");
            return null;
        }
    }

    /**
     * Elimina un archivo o carpeta específico.
     */
    async deleteFile(path, name) {
        if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return;

        try {
            await FileService.delete(path);
            await this.loadFiles(currentPath);
        } catch (error) {
            console.error("Error al eliminar:", error);
            showToast("Error al eliminar", "error");
        }
    }

    /**
     * Elimina los archivos seleccionados mediante checkbox.
     */
    async deleteSelectedFiles() {
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
                const btnDelete = document.getElementById("btn-deleteSelectedFiles");
                if (btnDelete) btnDelete.style.display = "none";
                await this.loadFiles(currentPath);
            } catch (error) {
                console.error("Error al eliminar archivos:", error);
                await this.loadFiles(currentPath);
            }
        }
    }

    /**
     * Descarga un archivo individual abriendo la URL de descarga.
     */
    downloadFile(path) {
        window.open(`${API_URL}/download?path=${encodePath(path)}`, "_blank");
    }

    /**
     * Descarga los archivos seleccionados empaquetados en un archivo ZIP.
     */
    async downloadSelectedFiles() {
        const checkboxes = document.querySelectorAll(".file-checkbox:checked");
        const paths = Array.from(checkboxes)
            .filter((cb) => cb.id !== "checkbox-all")
            .map((cb) => cb.dataset.path);

        if (paths.length === 0) {
            showToast("No se han seleccionado archivos", "error");
            return;
        } else if (paths.length === 1) {
            this.downloadFile(paths[0]);
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

            const btnDownload = document.getElementById("btn-downloadSelectedFiles");
            if (btnDownload) btnDownload.style.display = "none";
            showToast("Descarga iniciada", "success");

            // Deseleccionar todo
            const checkboxAll = document.getElementById("checkbox-all");
            if (checkboxAll) checkboxAll.checked = false;
            document.querySelectorAll(".file-checkbox").forEach((cb) => (cb.checked = false));
            if (typeof Renderers !== "undefined" && Renderers.updateSelectionButtons) {
                Renderers.updateSelectionButtons();
            }
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
    async getStorage() {
        try {
            const response = await FileService.getStorage();
            const data = response.data;

            const limitEl = document.getElementById("storageLimit");
            const usedEl = document.getElementById("storageUsed");
            const availEl = document.getElementById("storageAvailable");

            if (limitEl) limitEl.textContent = formatBytes(data.totalStorage);
            if (usedEl) usedEl.textContent = formatBytes(data.usedStorage);
            if (availEl) availEl.textContent = formatBytes(data.availableStorage);

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
}

const filesManager = new FilesManager();
window.filesManager = filesManager;