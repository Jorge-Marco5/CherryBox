/**
 * Servicio para manejar los permisos de archivos y carpetas.
 */
const PermissionService = {
    /**
     * Obtiene los permisos otorgados a un archivo.
     * @param {string} fileId - ID del archivo/carpeta.
     */
    async getFilePermissions(fileId) {
        return await axios.get(`${API_URL}/permissions/file/${fileId}`);
    },

    /**
     * Otorga acceso a un usuario.
     * @param {string} fileId - ID del archivo.
     * @param {string} targetUserId - Email o ID del usuario objetivo.
     * @param {string} access - Nivel de acceso (READ, WRITE, etc).
     */
    async grantPermission(fileId, targetUserId, access) {
        return await axios.post(`${API_URL}/permissions/grant`, {
            fileId,
            targetUserId,
            access
        });
    },

    /**
     * Revoca un permiso específico.
     * @param {string} permissionId - ID del permiso a revocar.
     */
    async revokePermission(permissionId) {
        return await axios.delete(`${API_URL}/permissions/revoke/${permissionId}`);
    }
};

window.PermissionService = PermissionService;
