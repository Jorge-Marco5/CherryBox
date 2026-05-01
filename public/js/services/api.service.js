/**
 * Servicio para manejar las llamadas a la API relacionadas con archivos y carpetas.
 */
const FileService = {
    /**
     * Obtiene la lista de archivos de una ruta específica.
     * @param {string} path - Ruta de la carpeta.
     */
    async getFiles(path = '') {
        return await axios.get(`${API_URL}/files?path=${encodeURIComponent(path)}`);
    },

    /**
     * Busca archivos en el servidor.
     * @param {string} query - Término de búsqueda.
     */
    async searchFiles(query) {
        return await axios.get(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    },

    /**
     * Crea una nueva carpeta.
     * @param {string} path - Ruta donde se creará.
     * @param {string} name - Nombre de la carpeta.
     */
    async createFolder(path, name) {
        return await axios.post(`${API_URL}/folder`, { path, name });
    },

    /**
     * Renombra un archivo o carpeta.
     * @param {string} oldPath - Ruta actual.
     * @param {string} newName - Nuevo nombre.
     */
    async rename(oldPath, newName) {
        return await axios.put(`${API_URL}/rename`, { oldPath, newName });
    },

    /**
     * Elimina un archivo o carpeta.
     * @param {string} path - Ruta a eliminar.
     */
    async delete(path) {
        return await axios.delete(`${API_URL}/delete`, { data: { path } });
    },

    /**
     * Obtiene información del almacenamiento.
     */
    async getStorage() {
        return await axios.get(`${API_URL}/getstorage`);
    },

    /**
     * Obtiene el contenido de un archivo (para vista previa).
     * @param {string} path - Ruta del archivo.
     */
    async getFileContent(path) {
        return await fetch(`${API_URL}/file-content?path=${encodeURIComponent(path)}`);
    },

    /**
     * Descarga un archivo.
     * @param {string} path - Ruta del archivo.
     */
    async download(path) {
        return await fetch(`${API_URL}/download?path=${encodeURIComponent(path)}`);
    },

    /**
     * Descarga múltiples archivos en un ZIP.
     * @param {string[]} paths - Lista de rutas de archivos.
     */
    async downloadMultiple(paths) {
        return await axios.post(`${API_URL}/download-multiple`, { paths }, {
            responseType: 'blob'
        });
    },

    /**
     * Sincroniza los archivos.
     */
    async sync() {
        return await axios.post(`${API_URL}/sync`, {}, {
            withCredentials: true
        });
    }
};

window.FileService = FileService;
