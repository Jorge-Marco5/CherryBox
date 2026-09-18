/**
 * Gestor y Plantillas de Vistas para CherryBox (SPA)
 * 
 * ¿Por qué esta arquitectura es más segura y robusta que el uso de innerHTML con strings?
 * 1. Uso de HTML5 <template> y cloneNode(true):
 *    - Los elementos <template> son analizados una sola vez por el navegador y permanecen inertes 
 *      (scripts no se ejecutan accidentalmente, imágenes no se descargan hasta ser instanciadas).
 *    - cloneNode(true) es una operación nativa de duplicación de nodos DOM del motor del navegador, 
 *      mucho más rápida y segura frente a inyecciones XSS que concatenar o parsear cadenas HTML repetidamente.
 * 2. Ciclo de vida (mount / unmount):
 *    - Permite limpiar instancias activas (como Masonry) y desvincular recursos antes de destruir el DOM,
 *      evitando memory leaks (fugas de memoria) y listeners huérfanos.
 * 3. Escalable para futuras funciones:
 *    - Basta con registrar nuevas vistas con TemplateManager.register(name, config) y llamarlas con 
 *      TemplateManager.render(name, params).
 */

const TemplateManager = {
    currentView: null,
    viewRoot: ["files"],
    views: {},
    containerId: "main-container",

    /**
     * Registra una vista con su ciclo de vida y fuente DOM.
     * @param {string} name - Identificador de la vista
     * @param {Object} config - Configuración de la vista
     * @param {string} [config.templateId] - ID de la etiqueta <template> en index.html
     * @param {Function} [config.renderContent] - Función alternativa que retorna un Node o HTML
     * @param {Function} [config.mount] - Función ejecutada tras inyectar el DOM
     * @param {Function} [config.unmount] - Función de limpieza antes de cambiar de vista
     */
    register(name, config) {
        this.views[name] = config;
    },

    /**
     * Obtiene el contenedor principal en el DOM.
     */
    getContainer() {
        return document.getElementById(this.containerId);
    },

    /**
     * Renderiza una vista registrada sin recargar la página.
     * @param {string} name - Nombre de la vista registrada
     * @param {Object} [params={}] - Parámetros pasados al hook mount
     * @returns {boolean} true si se renderizó correctamente
     */
    render(name, params = {}) {
        if (!this.viewRoot.includes(name)) {
            window.location.pathname !== "/" + name ? history.pushState({}, '', '/' + name) : null;
        } else {
            window.location.pathname !== "/" ? history.pushState({}, '', '/') : null;
        }
        const view = this.views[name];
        if (!view) {
            console.error(`[TemplateManager] La vista "${name}" no está registrada.`);
            return false;
        }

        const container = this.getContainer();
        if (!container) {
            console.error(`[TemplateManager] Contenedor #${this.containerId} no encontrado en el DOM.`);
            return false;
        }

        // 1. Ejecutar hook unmount de la vista anterior
        if (this.currentView && this.views[this.currentView]?.unmount) {
            try {
                this.views[this.currentView].unmount();
            } catch (err) {
                console.warn(`[TemplateManager] Error al desmontar vista "${this.currentView}":`, err);
            }
        }

        // 2. Limpiar el contenedor actual de forma segura
        if (typeof container.replaceChildren === "function") {
            container.replaceChildren();
        } else {
            container.innerHTML = "";
        }

        // 3. Insertar el contenido de la vista
        let rendered = false;

        // A) Desde etiqueta <template> en HTML (Método seguro recomendado)
        if (view.templateId) {
            const tmpl = document.getElementById(view.templateId);
            if (tmpl && "content" in tmpl) {
                const clone = tmpl.content.cloneNode(true);
                container.appendChild(clone);
                rendered = true;
            } else {
                console.warn(`[TemplateManager] <template id="${view.templateId}"> no encontrado o no soportado.`);
            }
        }

        // B) Desde función personalizada o fallback de string
        if (!rendered && typeof view.renderContent === "function") {
            const result = view.renderContent(params);
            if (result instanceof Node) {
                container.appendChild(result);
                rendered = true;
            } else if (typeof result === "string") {
                container.innerHTML = result;
                rendered = true;
            }
        }

        // C) Fallback a string estático registrado si existiera
        if (!rendered && typeof view.htmlString === "string") {
            container.innerHTML = view.htmlString;
            rendered = true;
        }

        if (!rendered) {
            console.error(`[TemplateManager] No fue posible renderizar el contenido de "${name}".`);
            return false;
        }

        this.currentView = name;

        // 4. Ejecutar hook mount
        if (typeof view.mount === "function") {
            try {
                view.mount(params);
            } catch (err) {
                console.error(`[TemplateManager] Error en el hook mount de "${name}":`, err);
            }
        }

        return true;
    }
};

// ==========================================
// REGISTRO DE VISTAS ESTÁNDAR
// ==========================================

// 1. Vista de Archivos y Carpetas
TemplateManager.register("files", {
    templateId: "tmpl-files",
    mount(params = {}) {
        const targetPath = params.path !== undefined ? params.path : (window.currentPath || "");
        if (typeof window.loadFiles === "function") {
            window.loadFiles(targetPath);
        }
        if (typeof window.getStorage === "function") {
            window.getStorage();
        }
        if (window.UILogic && typeof window.UILogic.setupDragAndDrop === "function") {
            window.UILogic.setupDragAndDrop();
        }
    },
    unmount() {
        // Destruir instancia de Masonry para evitar fugas de memoria
        if (window.Renderers && window.Renderers.msnry) {
            try {
                window.Renderers.msnry.destroy();
            } catch (e) {
                // Ignorar si ya fue destruido
            }
            window.Renderers.msnry = null;
        }
    }
});

// 2. Vista de Subida de Archivos
TemplateManager.register("uploads", {
    templateId: "tmpl-uploads",
    mount() {
        // Renderizar la lista e historial de subidas en memoria
        if (typeof window.renderUploadManagerView === "function") {
            window.renderUploadManagerView();
        }

        // Configurar soporte drag & drop directo en la zona de subida
        const uploadArea = document.getElementById("uploadArea");
        if (uploadArea) {
            uploadArea.addEventListener("dragover", (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = "var(--primary, #FF146C)";
                uploadArea.style.transform = "scale(1.01)";
            });

            uploadArea.addEventListener("dragleave", () => {
                uploadArea.style.borderColor = "";
                uploadArea.style.transform = "";
            });

            uploadArea.addEventListener("drop", (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = "";
                uploadArea.style.transform = "";

                if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    if (typeof window.uploadFilesProcess === "function") {
                        window.uploadFilesProcess(e.dataTransfer.files);
                    }
                }
            });
        }
    }
});

// Funciones globales de conveniencia para navegación y compatibilidad con botones HTML existentes
window.TemplateManager = TemplateManager;

window.renderFilesTemplate = function (path) {
    //window.location.pathname !== "/" ? history.pushState({}, '', '/') : null;
    return TemplateManager.render("files", { path });
};

window.renderUploadTemplate = function () {
    //window.location.pathname !== "/uploads" ? history.pushState({}, '', '/uploads') : null;
    return TemplateManager.render("uploads");
};

window.navigateTo = function (path) {
    window.location.pathname !== "/" ? history.pushState({}, '', '/') : null;
    return TemplateManager.render("files", { path });
};

// Strings de compatibilidad hacia atrás
const filesTemplate = "";
const uploadTemplate = "";