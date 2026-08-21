/**
 * Funciones para renderizar componentes de la interfaz de usuario.
 */
const Renderers = {

  mediaFiles: [],

  /**
   * Actualiza el breadcrumb (migas de pan) de navegación.
   * @param {string} path - Ruta actual.
   */
  updateBreadcrumb(path) {
    const breadcrumb = document.getElementById("breadcrumb");
    if (!breadcrumb) return;

    breadcrumb.innerHTML =
      '<span onclick="navigateTo(\'\')"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-home"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 12l-2 0l9 -9l9 9l-2 0" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7" /><path d="M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6" /></svg></span>';

    if (path) {
      const parts = path.split("/").filter((p) => p);
      let currentPathAccumulator = "";

      parts.forEach((part) => {
        currentPathAccumulator += (currentPathAccumulator ? "/" : "") + part;
        const pathCopy = currentPathAccumulator;
        breadcrumb.innerHTML += ` / <span style="cursor: pointer; max-width: 150px; overflow: hidden; text-overflow: ellipsis;" onclick="navigateTo('${pathCopy}')">${decodeURI(part)}</span>`;
      });
    }
  },

  /**
   * Renderiza la lista de archivos en el contenedor principal.
   * @param {Array} files - Lista de objetos de archivo.
   */
  renderFiles(files) {
    this.mediaFiles = [];
    const fileList = document.getElementById("fileList");
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
            <div class="file-item" style="position: sticky; top: 0; z-index: 10; background: #1E1E1E;">
                <input type="checkbox" class="file-checkbox" id="checkbox-all" onchange="toggleSelectAll(this)">
                <label for="checkbox-all" class="checkbox-label"><div class="file-icon"></div></label>
                <div class="file-info">
                    <div class="file-name" style="font-weight: 600;"></div>
                    <div class="file-meta"></div>
                </div>
                <div class="file-actions"></div>
            </div>
        `;

    fileList.innerHTML += files
      .map((file) => {
        const isFolder = file.type === "folder";
        const icon = isFolder
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 24 24" fill="${file.folder_color || "#FFE36C"}" class="icon icon-tabler icons-tabler-filled icon-tabler-folder"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M9 3a1 1 0 0 1 .608 .206l.1 .087l2.706 2.707h6.586a3 3 0 0 1 2.995 2.824l.005 .176v8a3 3 0 0 1 -2.824 2.995l-.176 .005h-14a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-11a3 3 0 0 1 2.824 -2.995l.176 -.005h4z" /></svg>`
          : getFileIcon(file.name);
        const size = isFolder ? "" : formatBytes(file.size);
        const date = new Date(file.modified).toLocaleDateString("es-ES");

        const escPath = encodePath(file.path);
        const escName = escapeJS(file.name);
        const folderColor = escapeJS(file.folder_color);
        const escId = escapeJS(file.id);
        const attrPath = escapeHTML(file.path);
        const attrType = escapeHTML(file.type);

        //Imagenes y videos se renderizan en el mansory
        if (this.isImageFile(escName, attrType) || this.isVideoFile(escName, attrType)) {
          this.mediaFiles.push(file);
          return ``;
        }

        return `
                <div class="file-item" onclick="${isFolder ? `navigateTo('${escPath}')` : `previewFile('${escPath}', '${escName}')`}">
                    <input onchange="updateSelectionButtons()" type="checkbox" id="checkbox-${attrPath}" class="file-checkbox" data-type="${attrType}" data-path="${attrPath}" onclick="event.stopPropagation();">
                    <label for="checkbox-${attrPath}" class="checkbox-label">
                        <div class="file-icon">${icon}</div>
                    </label>
                    <div class="file-info">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">${size}${size ? " • " : ""}${date}</div>
                    </div>
                    <div class="file-actions">
                        <button class="icon-btn" onclick="event.stopPropagation(); showPermissionsModal('${escId}', '${escName}')" title="Permisos">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></svg>
                            ${isMobile ? "" : "<p>Permisos</p>"}
                        </button>
                        <button class="icon-btn" onclick="event.stopPropagation(); showRenameModal('${attrType}', '${escPath}', '${escName}', '${folderColor}')" title="Renombrar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#4284efff" class="icon icon-tabler icons-tabler-filled icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a1 1 0 0 1 -1 1h-1a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1 -1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3h1a1 1 0 0 1 1 1" /><path d="M14.596 5.011l4.392 4.392l-6.28 6.303a1 1 0 0 1 -.708 .294h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 .294 -.708zm6.496 -2.103a3.097 3.097 0 0 1 .165 4.203l-.164 .18l-.693 .694l-4.387 -4.387l.695 -.69a3.1 3.1 0 0 1 4.384 0" /></svg>
                            ${isMobile ? "" : "<p>Renombrar</p>"}
                        </button>
                        <button class="icon-btn" onclick="event.stopPropagation(); deleteFile('${escPath}', '${escName}')" title="Eliminar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#ff5555ff" class="icon icon-tabler icons-tabler-filled icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" /><path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" /></svg>
                            ${isMobile ? "" : "<p>Eliminar</p>"}
                        </button>
                    </div>
                </div>
            `;
      })
      .join("");

    this.updateSelectionButtons();
  },

  /**
   * Verifica si un archivo es un formato de imagen
   * @param {*} fileName 
   * @returns 
   */
  isImageFile(fileName, fileType) {
    if (fileType === "folder") {
      return false;
    }
    const ext = fileName.split(".")[1].toLowerCase();
    return imageExts.includes("." + ext);
  },

  isVideoFile(fileName, fileType) {
    if (fileType === "folder") {
      return false;
    }
    const ext = fileName.split(".")[1].toLowerCase();
    return videoExts.includes("." + ext);
  },

  msnry: null,

  renderImages() {
    const imageList = document.getElementById("imageList");
    if (!imageList) return;

    // Destruir la instancia de Masonry existente si ya había una activa
    if (this.msnry) {
      try {
        this.msnry.destroy();
      } catch (e) {
        console.warn("Error al destruir Masonry previo:", e);
      }
      this.msnry = null;
    }

    if (!this.mediaFiles || this.mediaFiles.length === 0) {
      imageList.innerHTML = "";
      return;
    }

    const fragment = document.createDocumentFragment();

    // Elemento sizer de ancho de columna
    const gridSizer = document.createElement("div");
    gridSizer.className = "grid-sizer";
    fragment.appendChild(gridSizer);

    // Elemento sizer de espacio (gutter)
    const gutterSizer = document.createElement("div");
    gutterSizer.className = "gutter-sizer";
    fragment.appendChild(gutterSizer);
    this.mediaFiles.forEach((file) => {
      let item;

      //manejador para mostrar como imagen o miniatura de video
      if (this.isImageFile(file.name, file.type)) {
        item = this.mansoryImage(file);
      } else {
        item = this.mansoryVideo(file);
      }
      fragment.appendChild(item);
    });

    imageList.innerHTML = "";
    imageList.appendChild(fragment);

    // Inicializar Masonry
    if (typeof Masonry !== "undefined") {
      this.msnry = new Masonry(imageList, {
        itemSelector: ".image-file",
        columnWidth: ".grid-sizer",
        gutter: ".gutter-sizer",
        percentPosition: true,
        transitionDuration: "0.3s"
      });

      // Si la librería imagesLoaded está disponible, refrescar el layout en progreso
      if (typeof imagesLoaded !== "undefined") {
        imagesLoaded(imageList).on("progress", () => {
          if (this.msnry) {
            this.msnry.layout();
          }
        });
      }
    }
  },

  mansoryImage(file) {
    const item = document.createElement("div");
    const img = document.createElement("img");
    const attrPath = escapeHTML(file.path);
    const escName = escapeHTML(file.name);
    const escPath = `/api/file-content?path=${encodePath(file.path)}&name=${encodePath(file.name)}`;

    item.className = "image-file";
    item.onclick = () => previewFile(attrPath, escName);

    img.src = escPath;
    img.alt = escName;
    img.loading = "lazy";

    // Actualizar el layout cuando se complete la carga de cada imagen
    img.onload = () => {
      if (this.msnry) {
        this.msnry.layout();
      }
    };

    item.appendChild(img);
    item.innerHTML += `
      <div class="image-actions">
        <div class="selector-image">
          <input onchange="updateSelectionButtons()" type="checkbox" id="checkbox-${attrPath}" class="file-checkbox" data-type="image" data-path="${attrPath}" onclick="event.stopPropagation();">
        </div>
        <div class="image-buttons">
          <button class="icon-btn" onclick="event.stopPropagation(); showPermissionsModal('${file.id}', '${escName}')" title="Permisos">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></svg>
          </button>
          <button class="icon-btn" onclick="event.stopPropagation(); showRenameModal('file', '${attrPath}', '${escName}', '')" title="Renombrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a1 1 0 0 1 -1 1h-1a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1 -1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3h1a1 1 0 0 1 1 1" /><path d="M14.596 5.011l4.392 4.392l-6.28 6.303a1 1 0 0 1 -.708 .294h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 .294 -.708zm6.496 -2.103a3.097 3.097 0 0 1 .165 4.203l-.164 .18l-.693 .694l-4.387 -4.387l.695 -.69a3.1 3.1 0 0 1 4.384 0" /></svg>
          </button>
          <button class="icon-btn" onclick="event.stopPropagation(); deleteFile('${attrPath}', '${escName}')" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" /><path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" /></svg>
          </button>
        </div>
      </div>`;

    return item;
  },

  mansoryVideo(file) {
    const item = document.createElement("div");
    const img = document.createElement("img");
    const attrPath = escapeHTML(file.path);
    const escName = escapeHTML(file.name);
    const escPath = `/api/file-content?path=${encodePath(attrPath)}&name=${encodePath(escName)}&thumbnail=true`;

    item.className = "image-file video-file-item";
    item.onclick = () => previewFile(attrPath, escName);

    img.src = escPath;
    img.alt = escName;
    img.loading = "lazy";

    // Actualizar el layout cuando se complete la carga de cada imagen de miniatura
    img.onload = () => {
      if (this.msnry) {
        this.msnry.layout();
      }
    };

    item.appendChild(img);
    item.innerHTML += `
      <div class="video-play-badge" title="Reproducir video">
        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icon-tabler-player-play-filled"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" /></svg>
      </div>
      <div class="image-actions">
        <div class="selector-image">
          <input onchange="updateSelectionButtons()" type="checkbox" id="checkbox-${attrPath}" class="file-checkbox" data-type="image" data-path="${attrPath}" onclick="event.stopPropagation();">
        </div>
        <div class="image-buttons">
          <button class="icon-btn" onclick="event.stopPropagation(); showPermissionsModal(null, '${escName}')" title="Permisos">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon icon-tabler icons-tabler-outline icon-tabler-lock"><path stroke="none" d="M0 0h24v24H0z" fill="none" /><path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-6" /><path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" /><path d="M8 11v-4a4 4 0 1 1 8 0v4" /></svg>
          </button>
          <button class="icon-btn" onclick="event.stopPropagation(); showRenameModal('file', '${attrPath}', '${escName}', '')" title="Renombrar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-edit"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M8 7a1 1 0 0 1 -1 1h-1a1 1 0 0 0 -1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1 -1v-1a1 1 0 0 1 2 0v1a3 3 0 0 1 -3 3h-9a3 3 0 0 1 -3 -3v-9a3 3 0 0 1 3 -3h1a1 1 0 0 1 1 1" /><path d="M14.596 5.011l4.392 4.392l-6.28 6.303a1 1 0 0 1 -.708 .294h-3a1 1 0 0 1 -1 -1v-3a1 1 0 0 1 .294 -.708zm6.496 -2.103a3.097 3.097 0 0 1 .165 4.203l-.164 .18l-.693 .694l-4.387 -4.387l.695 -.69a3.1 3.1 0 0 1 4.384 0" /></svg>
          </button>
          <button class="icon-btn" onclick="event.stopPropagation(); deleteFile('${attrPath}', '${escName}')" title="Eliminar">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" class="icon icon-tabler icons-tabler-filled icon-tabler-trash"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M20 6a1 1 0 0 1 .117 1.993l-.117 .007h-.081l-.919 11a3 3 0 0 1 -2.824 2.995l-.176 .005h-8c-1.598 0 -2.904 -1.249 -2.992 -2.75l-.005 -.167l-.923 -11.083h-.08a1 1 0 0 1 -.117 -1.993l.117 -.007zm-10 4a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1m4 0a1 1 0 0 0 -1 1v6a1 1 0 0 0 2 0v-6a1 1 0 0 0 -1 -1" /><path d="M14 2a2 2 0 0 1 2 2a1 1 0 0 1 -1.993 .117l-.007 -.117h-4l-.007 .117a1 1 0 0 1 -1.993 -.117a2 2 0 0 1 1.85 -1.995l.15 -.005z" /></svg>
          </button>
        </div>
      </div>`;

    return item;
  },

  /**
   * Actualiza el estado de los botones de selección masiva.
   */
  updateSelectionButtons() {
    const btnDeleteSelected = document.getElementById("btn-deleteSelectedFiles");
    const btnDownloadSelected = document.getElementById("btn-downloadSelectedFiles");
    const checkboxes = document.querySelectorAll(".file-checkbox");
    const checkedCount = document.querySelectorAll(".file-checkbox:checked").length;
    const totalCount = checkboxes.length;

    if (btnDeleteSelected) {
      btnDeleteSelected.style.display = checkedCount > 0 ? "inline-flex" : "none";
    }

    if (checkedCount > 0) {
      const selectedCheckboxes = document.querySelectorAll(".file-checkbox:checked");
      const hasFolder = Array.from(selectedCheckboxes).some((cb) => cb.dataset.type === "folder");

      if (btnDownloadSelected) {
        btnDownloadSelected.style.display = !hasFolder ? "inline-flex" : "none";
      }
    } else if (btnDownloadSelected) {
      btnDownloadSelected.style.display = "none";
    }

    const checkboxAll = document.getElementById("checkbox-all");
    if (checkboxAll) {
      checkboxAll.checked = totalCount > 0 && checkedCount === totalCount;
      checkboxAll.indeterminate = checkedCount > 0 && checkedCount < totalCount;
    }
  }
};

window.onload = () => {
  const elem = document.querySelector('.image-list');
  const msnry = new Masonry(elem, {
    itemSelector: '.image-file',
    columnWidth: '.image-file',
    percentPosition: true,
    gutter: 10 // Espaciado entre columnas
  });
};

window.Renderers = Renderers;
window.updateBreadcrumb = Renderers.updateBreadcrumb;
window.renderFiles = Renderers.renderFiles;
window.updateSelectionButtons = Renderers.updateSelectionButtons;
