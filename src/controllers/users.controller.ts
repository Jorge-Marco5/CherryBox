import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { getUsersService, deleteUserService, updateUserService, blockUserService } from "../services/users.service";

export const getUsersHandler = async (req: AuthRequest, res: Response) => {
    try {
        const users = await getUsersService();
        res.json(users);
    } catch (error) {
        console.error("Error al obtener usuarios:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export const deleteUserHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await deleteUserService(id);
        res.json(user);
    } catch (error) {
        console.error("Error al eliminar usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export const updateUserHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { email } = req.body;
        const user = await updateUserService(id, { email });
        res.json(user);
    } catch (error) {
        console.error("Error al actualizar usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export const blockUserHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const user = await blockUserService(id);
        res.json(user);
    } catch (error) {
        console.error("Error al bloquear usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}

export const changeRoleHandler = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const user = await updateUserService(id, { role });
        res.json(user);
    } catch (error) {
        console.error("Error al cambiar el rol del usuario:", error);
        res.status(500).json({ error: "Error interno del servidor" });
    }
}