import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getUsersService, deleteUserService, updateUserService, blockUserService } from "../services/users.service";
import { logger } from "../utils/logger";

/**
 * Obtiene la lista completa de usuarios del sistema.
 * Solo accesible para administradores (vía middleware).
 * 
 * @param req Petición extendida con información de sesión
 * @param res Respuesta con el array de usuarios
 */
export const getUsersHandler = async (req: AuthRequest, res: Response) => {
    try {
        const users = await getUsersService();
        res.json(users);
    } catch (error: any) {
        logger.error("Error al obtener usuarios: " + error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

/**
 * Elimina un usuario del sistema de forma permanente.
 * Registra quién realizó la acción para auditoría.
 * 
 * @param req Petición con el ID del usuario a eliminar en params
 * @param res Respuesta con el usuario eliminado o error
 */
export const deleteUserHandler = async (req: AuthRequest, res: Response) => {
    const admin = req.user;
    try {
        const { id } = req.params;
        const user = await deleteUserService(id);
        
        logger.info(`ADMIN ${admin?.id} eliminó al usuario ${id} (${user?.email})`);
        res.json(user);
    } catch (error: any) {
        logger.error(`Error al eliminar usuario ${req.params.id}: ` + error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

/**
 * Actualiza la información básica de un usuario (email).
 * 
 * @param req Petición con el ID en params y data en body
 * @param res Respuesta con el usuario actualizado
 */
export const updateUserHandler = async (req: AuthRequest, res: Response) => {
    const admin = req.user;
    try {
        const { id } = req.params;
        const { email } = req.body;
        const user = await updateUserService(id, { email });
        
        logger.info(`ADMIN ${admin?.id} actualizó el email del usuario ${id} a ${email}`);
        res.json(user);
    } catch (error: any) {
        logger.error(`Error al actualizar usuario ${req.params.id}: ` + error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

/**
 * Alterna el estado de bloqueo de un usuario.
 * Un usuario bloqueado no puede acceder al sistema.
 * 
 * @param req Petición con el ID del usuario en params
 * @param res Respuesta con el nuevo estado del usuario
 */
export const blockUserHandler = async (req: AuthRequest, res: Response) => {
    const admin = req.user;
    try {
        const { id } = req.params;
        const user = await blockUserService(id);
        
        const action = user?.is_blocked ? "BLOQUEÓ" : "DESBLOQUEÓ";
        logger.info(`ADMIN ${admin?.id} ${action} al usuario ${id} (${user?.email})`);
        res.json(user);
    } catch (error: any) {
        logger.error(`Error al bloquear/desbloquear usuario ${req.params.id}: ` + error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

/**
 * Cambia el rol de un usuario (USER/ADMIN).
 * Acción crítica que debe quedar registrada en los logs.
 * 
 * @param req Petición con el ID en params y nuevo rol en body
 * @param res Respuesta con el usuario actualizado
 */
export const changeRoleHandler = async (req: AuthRequest, res: Response) => {
    const admin = req.user;
    try {
        const { id } = req.params;
        const { role } = req.body;
        const user = await updateUserService(id, { role });
        
        logger.info(`ADMIN ${admin?.id} cambió el rol de ${id} (${user?.email}) a ${role}`);
        res.json(user);
    } catch (error: any) {
        logger.error(`Error al cambiar rol del usuario ${req.params.id}: ` + error.message);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}