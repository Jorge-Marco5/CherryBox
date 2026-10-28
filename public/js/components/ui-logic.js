/**
 * Lógica de interfaz de usuario, modales y previsualización.
 */
// Estrategias de previsualización para el patrón Strategy
const PREVIEW_STRATEGIES = [
  {
    accepts(ext) {
      return codeExts.includes(ext);
    },
    getModalClass() {
      return "preview-code";
    },
    async render(path, name, ext, contentUrl, container) {
      const response = await FileService.getFileContent(path);
      const data = await response.json();
      container.innerHTML = `<pre>${escapeHtml(data.content)}</pre>`;
    },
  },
  {
    accepts(ext) {
      return textExts.includes(ext);
    },
    getModalClass() {
      return "preview-text";
    },
    async render(path, name, ext, contentUrl, container) {
      const response = await FileService.getFileContent(path);
      const data = await response.json();
      container.innerHTML = `<pre class="text-content">${escapeHtml(data.content)}</pre>`;
    },
  },
  {
    accepts(ext) {
      return imageExts.includes(ext);
    },
    getModalClass() {
      return "preview-image";
    },
    async render(path, name, ext, contentUrl, container) {
      if (UILogic.zoomistInstance) {
        UILogic.zoomistInstance.destroy();
        UILogic.zoomistInstance = null;
      }

      await new Promise((resolve, reject) => {
        const preloadImg = new Image();
        preloadImg.onload = () => resolve();
        preloadImg.onerror = (err) => reject(err);
        preloadImg.src = contentUrl;
      });

      if (currentPreviewPath !== path) return;

      container.innerHTML = `
      <div class="zoomist-container">
        <div class="zoomist-wrapper">
          <div class="zoomist-image">
            <img src="${contentUrl}" alt="${escapeHTML(name)}" draggable="false" ondragstart="return false;" oncontextmenu="return false;">
          </div>
        </div>
      </div>`;

      const zoomistEl = container.querySelector(".zoomist-container");
      if (zoomistEl && typeof Zoomist !== "undefined") {
        UILogic.zoomistInstance = new Zoomist(zoomistEl, {
          maxScale: 4,
          bounds: true,
          slider: true,
          zoomer: true,
          wheelable: true,
          draggable: true,
          pinchable: true,
        });
      }
    },
  },
  {
    accepts(ext) {
      return videoExts.includes(ext);
    },
    getModalClass() {
      return "preview-video";
    },
    async render(path, name, ext, contentUrl, container) {
      MusicPlayer.pause();
      container.innerHTML = `<video controls preload="metadata" controlsList="nodownload"><source src="${contentUrl}" type="video/${ext}"></video>`;

    },
  },
  {
    accepts(ext) {
      return audioExts.includes(ext);
    },
    getModalClass() {
      return "preview-audio";
    },
    async render(path, name, ext, contentUrl, container) {
      MusicPlayer.pause();
      container.innerHTML = `<audio controls preload="metadata" controlsList="nodownload"><source src="${contentUrl}" type="audio/${ext}"></audio>`;
    },
  },
  {
    accepts(ext) {
      return pdfExts.includes(ext);
    },
    getModalClass() {
      return "preview-pdf";
    },
    async render(path, name, ext, contentUrl, container) {

      if (navigator.onLine) {
        // Desktop/Tablet + Online: Usar pdfjs-viewer-element (Funciones Completas)
        if (!customElements.get("pdfjs-viewer-element")) {
          const script = document.createElement("script");
          script.type = "module";
          script.src = "https://cdn.jsdelivr.net/npm/pdfjs-viewer-element/dist/pdfjs-viewer-element.js";
          document.head.appendChild(script);
        }

        container.innerHTML = `
            <pdfjs-viewer-element 
              src="${contentUrl}" 
              viewer-css-theme="DARK" >
            </pdfjs-viewer-element>
          `;
      } else {
        // Offline: iframe nativo
        container.innerHTML = `<iframe src="${contentUrl}" type="application/pdf" class="pdfViewer"></iframe>`;
      }
    },
  },
  {
    accepts() {
      return true;
    }, // Estrategia por defecto (fallback)
    getModalClass() {
      return "";
    },
    async render(path, name, ext, contentUrl, container) {
      container.innerHTML = "<p>Vista previa no disponible para este tipo de archivo. Puedes descargarlo.</p>";
    },
  },
];

const UILogic = {
  /**
   * Muestra el modal de renombrado.
   * @param {string} path - Ruta del archivo.
   * @param {string} currentName - Nombre actual.
   */
  showRenameModal(type, path, currentName, currentColor) {
    currentRenameItem = path;
    currentModalActive = "renameModal";
    const input = document.getElementById("renameInput");
    const colorFolderCustom = document.getElementById("colorFolderCustom");
    if (type === "file") colorFolderCustom.style.display = "none";
    else colorFolderCustom.style.display = "flex";
    const colorInput = document.getElementById("renameColorInput");
    colorInput.value = currentColor;
    if (input) input.value = currentName;
    document.getElementById(currentModalActive)?.classList.add("active");
    document.body.classList.add("modal-open");
  },

  /**
   * Muestra el modal para crear carpeta.
   */
  showCreateFolderModal() {
    currentModalActive = 'createFolderModal';
    document.getElementById(currentModalActive)?.classList.add("active");
    document.body.classList.add("modal-open");
  },

  /**
   * Muestra el modal para generar enlace temporal para compartir
   * @param {string} path - Ruta del archivo.
   * @param {string} name - Nombre del archivo.
   */
  showShareModal(path) {
    currentRenameItem = path;
    this.closeModal(currentModalActive);

    currentModalActive = "shareModal";
    document.getElementById(currentModalActive)?.classList.add("active");
    document.body.classList.add("modal-open");
  },

  /**
   * Cierra un modal específico.
   * @param {string} modalId - ID del modal.
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("active");
    if (!document.querySelector(".modal.active")) {
      document.body.classList.remove("modal-open");
    }

    if (modalId === "previewModal") {
      if (UILogic.zoomistInstance) {
        UILogic.zoomistInstance.destroy();
        UILogic.zoomistInstance = null;
      }
      modal.classList.remove(
        "preview-pdf",
        "preview-image",
        "preview-text",
        "preview-video",
        "preview-audio",
        "preview-code",
      );
      pauseMedia();
      const previewContent = document.getElementById("previewContent");
      setTimeout(() => {
        if (previewContent) previewContent.innerHTML = "";
      }, 300);
    }

    if (modalId === "musicPlayerModal") {
      MusicPlayer.cherryJamActive = false;
      const playerEl = MusicPlayer.player || document.getElementById("miniplayer");
      if (playerEl) {
        if (MusicPlayer.isPlaying) {
          playerEl.classList.remove("hide");
          playerEl.classList.add("show");
        } else if (MusicPlayer.currentIndex !== -1) {
          playerEl.classList.remove("show");
          playerEl.classList.add("hide");
        } else {
          playerEl.classList.remove("hide", "show");
        }
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
    currentModalActive = "previewModal";
    const ext = name.split(".").pop().toLowerCase();
    const previewContent = document.getElementById("previewContent");
    const previewTitle = document.getElementById("previewTitle");
    const modal = document.getElementById(currentModalActive);

    if (!modal || !previewContent || !previewTitle) return;

    previewTitle.innerHTML = `
      <div class="preview-title-group" title="${escapeHTML(name)}">
        ${getFileIcon(ext)}
        <span class="modal-title-text">${escapeHTML(name)}</span>
      </div>

      <div class="preview-actions">
        <button class="btn btn-primary" aria-label="share-file" title="Enlace temporal"
          onclick="showShareModal(currentPreviewPath)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor"
            stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            class="icon icon-tabler icons-tabler-outline icon-tabler-clock-share" viewBox="0 0 24 24">
            <path fill="none" stroke="none" d="M0 0h24v24H0z" />
            <path d="M20.943 13.016A9 9 0 1 0 12.028 21M16 22l5-5m0 4.5V17h-4.5" />
            <path d="M12 7v5l2 2" />
          </svg>
        </button>
        <button class="btn btn-primary" aria-label="download-file" title="Descargar" onclick="downloadFile(currentPreviewPath)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-download">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-2" />
            <path d="M7 11l5 5l5 -5" />
            <path d="M12 4l0 12" />
          </svg>
          <p class="acction-text">Descargar</p>
        </button>
        <button class="btn btn-secondary" aria-label="close-modal" title="Cerrar" onclick="closeModal(currentModalActive)">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            class="icon icon-tabler icons-tabler-outline icon-tabler-x">
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M18 6l-12 12" />
            <path d="M6 6l12 12" />
          </svg>
          <p class="acction-text">Cerrar</p>
        </button>
      </div>
    `;
    previewContent.innerHTML = `<div class="preview-loading"></div>`;

    modal.classList.remove(
      "preview-pdf",
      "preview-image",
      "preview-text",
      "preview-video",
      "preview-audio",
      "preview-code",
    );
    modal.classList.add("active");
    document.body.classList.add("modal-open");
    modal.scrollTop = 0;

    try {
      const contentUrl = `${API_URL}/file-content?path=${encodePath(path)}`;

      const strategy = PREVIEW_STRATEGIES.find((s) => s.accepts("." + ext));
      if (strategy) {
        const modalClass = strategy.getModalClass();
        if (modalClass) {
          modal.classList.add(modalClass);
        }
        await strategy.render(path, name, ext, contentUrl, previewContent);
      }
    } catch (error) {
      console.error("Error al cargar vista previa:", error);
      previewContent.innerHTML = "<p>Error al cargar la vista previa</p>";
    }
  },

  /**
   * Configura el manejo de archivos arrastrados.
   */
  setupDragAndDrop() {
    if (this._dragAndDropSetup) return;
    this._dragAndDropSetup = true;

    const dropOverlay = document.getElementById("drop-overlay");
    let dragCounter = 0;

    if (!dropOverlay) return;

    // Prevenir comportamiento por defecto en toda la ventana
    window.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    window.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      // Solo reaccionar a archivos reales arrastrados desde fuera del navegador
      if (e.dataTransfer && e.dataTransfer.types && !Array.from(e.dataTransfer.types).includes("Files")) {
        return;
      }
      dragCounter++;
      if (dragCounter === 1) {
        dropOverlay.classList.add("active");
      }
    });

    window.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dragCounter > 0) {
        dragCounter--;
      }
      if (dragCounter === 0) {
        dropOverlay.classList.remove("active");
      }
    });

    window.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      dropOverlay.classList.remove("active");

      const dt = e.dataTransfer;
      if (!dt || !dt.files || dt.files.length === 0) return;
      const files = Array.from(dt.files);

      if (files.length > 0) {
        if (typeof window.uploadFilesProcess === "function") {
          window.uploadFilesProcess(files);
        }
      }
    });
  },

  async readyPlayerMusic(scannFiles = false) {
    let playlist = MusicPlayer.playlist;
    if (playlist.length == 0 || scannFiles) {
      playlist = await getMusicFiles(currentPath);
      if (!containsOnlyOneMusicFile(playlist)) {
        UILogic.closeModal("musicPlayerModal");
        showToast("Sin musica en ruta actual", "info");
        return;
      }
      MusicPlayer.currentIndex = -1
      showToast("Musica cargada", "success");
    }
    MusicPlayer.setPlaylist(playlist);
    const playlistContainer = document.getElementById("playlist");
    playlistContainer.innerHTML = "";

    playlist.forEach((file, index) => {
      const p = document.createElement("p");
      p.textContent = file.name;
      p.onclick = async () => await MusicPlayer.playTrack(index);
      playlistContainer.appendChild(p);
    });

    const playerEl = MusicPlayer.player || document.getElementById("miniplayer");
    if (playerEl) {
      playerEl.classList.remove("show", "hide");
    }
    document.getElementById("musicPlayerModal").classList.add("active");
    document.body.classList.add("modal-open");
    MusicPlayer.highlightTrack(MusicPlayer.currentIndex);
    MusicPlayer.cherryJamActive = true;
  },
};

function pauseMedia() {
  const audio = document.querySelector("audio");
  const video = document.querySelector("video");
  if (audio) audio.pause();
  if (video) video.pause();
}

window.UILogic = UILogic;
window.showRenameModal = UILogic.showRenameModal;
window.showCreateFolderModal = UILogic.showCreateFolderModal;
window.showShareModal = UILogic.showShareModal;
window.closeModal = UILogic.closeModal;
window.previewFile = UILogic.previewFile;
window.setupDragAndDrop = UILogic.setupDragAndDrop;
window.readyPlayerMusic = UILogic.readyPlayerMusic;
window.handlerRenderVideo = UILogic.handlerRenderVideo;
