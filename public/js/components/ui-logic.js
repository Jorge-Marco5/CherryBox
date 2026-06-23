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
      container.innerHTML = `<img src="${contentUrl}" alt="${name}" loading="lazy" draggable="false" ondragstart="return false;" oncontextmenu="return false;" onmousedown="return false;">`;
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
      if (navigator.onLine) {
        container.innerHTML = `
        <div class="video-preview-container">
          <video-player>
            <video-skin>
              <video slot="media" preload="metadata" playsinline>
                <source src="${contentUrl}" type="video/${ext}">
              </video>
            </video-skin>
          </video-player>
        </div>
      `;
      } else {
        container.innerHTML = `<video controls preload="metadata" controlsList="nodownload"><source src="${contentUrl}" type="video/${ext}"></video>`;
      }
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
      container.innerHTML = `<iframe src="${contentUrl}" type="application/pdf" class="pdfViewer"></iframe>`;
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
  showRenameModal(path, currentName) {
    currentRenameItem = path;
    const input = document.getElementById("renameInput");
    if (input) input.value = currentName;
    document.getElementById("renameModal")?.classList.add("active");
  },

  /**
   * Muestra el modal para crear carpeta.
   */
  showCreateFolderModal() {
    document.getElementById("createFolderModal")?.classList.add("active");
  },

  /**
   * Cierra un modal específico.
   * @param {string} modalId - ID del modal.
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("active");

    if (modalId === "previewModal") {
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
      if (previewContent) previewContent.innerHTML = "";
    }

    if (modalId === "musicPlayerModal") {
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
    const ext = name.split(".").pop().toLowerCase();
    const previewContent = document.getElementById("previewContent");
    const previewTitle = document.getElementById("previewTitle");
    const modal = document.getElementById("previewModal");

    if (!modal || !previewContent || !previewTitle) return;

    previewTitle.innerHTML = getFileIcon(ext) + " " + escapeHTML(name);
    previewContent.innerHTML = "<p>Cargando...</p>";

    modal.classList.remove(
      "preview-pdf",
      "preview-image",
      "preview-text",
      "preview-video",
      "preview-audio",
      "preview-code",
    );
    modal.classList.add("active");
    modal.scrollTop = 0;

    try {
      const contentUrl = `${API_URL}/file-content?path=${encodeURIComponent(path)}`;

      const strategy = PREVIEW_STRATEGIES.find((s) => s.accepts(ext));
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
      dragCounter++;
      if (dragCounter === 1) {
        dropOverlay.classList.add("active");
      }
    });

    window.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
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
      const files = Array.from(dt.files);

      if (files.length > 0) {
        if (typeof window.uploadFilesProcess === "function") {
          window.uploadFilesProcess(files);
        }
      }
    });
  },

  async readyPlayerMusic() {
    const musicFiles = await getMusicFiles(currentPath);
    MusicPlayer.setPlaylist(musicFiles);

    const playlist = document.getElementById("playlist");
    playlist.innerHTML = "";

    musicFiles.forEach((file, index) => {
      const p = document.createElement("p");
      p.textContent = file.name;
      p.onclick = () => MusicPlayer.playTrack(index);
      playlist.appendChild(p);
    });

    document.getElementById("musicPlayerModal").classList.add("active");
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
window.closeModal = UILogic.closeModal;
window.previewFile = UILogic.previewFile;
window.setupDragAndDrop = UILogic.setupDragAndDrop;
window.readyPlayerMusic = UILogic.readyPlayerMusic;
window.handlerRenderVideo = UILogic.handlerRenderVideo;
