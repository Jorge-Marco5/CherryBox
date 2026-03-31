import { Request, Response, NextFunction } from "express";
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
export const getUsersHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const users = await getUsersService();
        res.json(users);
    } catch (error: any) {
        next(error);
    }
}

/**
 * Elimina un usuario del sistema de forma permanente.
 * Registra quién realizó la acción para auditoría.
 * 
 * @param req Petición con el ID del usuario a eliminar en params
 * @param res Respuesta con el usuario eliminado o error
 */
export const deleteUserHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await deleteUserService(req.params.id, req.user!);
        logger.info(`ADMIN ${req.user?.id} eliminó al usuario ${req.params.id} (${user?.email})`);
        res.json(user);
    } catch (error: any) {
        next(error);
    }
}

/**
 * Actualiza la información básica de un usuario (email).
 * 
 * @param req Petición con el ID en params y data en body
 * @param res Respuesta con el usuario actualizado
 */
export const updateUserHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await updateUserService(req.params.id, req.body, req.user!);
        logger.info(`ADMIN ${req.user?.id} actualizó datos del usuario ${req.params.id}`);
        res.json(user);
    } catch (error: any) {
        next(error);
    }
}

/**
 * Alterna el estado de bloqueo de un usuario.
 * Un usuario bloqueado no puede acceder al sistema.
 * 
 * @param req Petición con el ID del usuario en params
 * @param res Respuesta con el nuevo estado del usuario
 */
export const blockUserHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await blockUserService(req.params.id, req.user!);
        const action = user?.is_blocked ? "BLOQUEÓ" : "DESBLOQUEÓ";
        logger.info(`ADMIN ${req.user?.id} ${action} al usuario ${req.params.id}`);
        res.json(user);
    } catch (error: any) {
        next(error);
    }
}

/**
 * Cambia el rol de un usuario (USER/ADMIN).
 * Acción crítica que debe quedar registrada en los logs.
 * 
 * @param req Petición con el ID en params y nuevo rol en body
 * @param res Respuesta con el usuario actualizado
 */
export const changeRoleHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = await updateUserService(req.params.id, { role: req.body.role }, req.user!);
        logger.info(`ADMIN ${req.user?.id} cambió el rol de ${req.params.id} (${user?.email}) a ${req.body.role}`);
        res.json(user);
    } catch (error: any) {
        next(error);
    }
}