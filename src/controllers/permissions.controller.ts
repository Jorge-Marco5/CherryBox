import { Response, NextFunction } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { prisma } from "../lib/prisma";
import { AccessType } from "../generated/prisma/enums";
import { logger } from "../utils/logger";
import { ForbiddenError, NotFoundError } from "../utils/errors";

/**
 * Otorga un permiso a un usuario sobre un archivo/carpeta.
 * Solo dueños o personas con permiso MANAGE pueden hacerlo.
 */
export const grantPermissionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { fileId, targetUserId, access } = req.body;
        const requesterId = req.user!.id;

        // 1. Verificar que el archivo existe
        const file = await prisma.file.findUnique({ where: { id: fileId } });
        if (!file) throw new NotFoundError("Archivo no encontrado");

        // Buscar usuario por ID o Email
        let targetUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { id: targetUserId },
                    { email: targetUserId }
                ]
            }
        });

        if (!targetUser) throw new NotFoundError("Usuario no encontrado");
        const finalTargetId = targetUser.id;

        // 2. Verificar que el solicitante es dueño o administrador
        const isOwner = file.ownerId === requesterId;
        const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "SUPERADMIN";

        if (!isOwner && !isAdmin) {
            // Verificar si tiene permiso MANAGE
            const hasManage = await prisma.filePermission.findFirst({
                where: { fileId, userId: requesterId, access: "MANAGE" }
            });
            if (!hasManage) throw new ForbiddenError("No tienes permiso para gestionar este archivo");
        }

        // 3. Upsert del permiso
        const permission = await prisma.filePermission.upsert({
            where: { 
                id: (await prisma.filePermission.findFirst({ where: { fileId, userId: finalTargetId } }))?.id || "new-uuid"
            },
            update: { access },
            create: { fileId, userId: finalTargetId, access }
        });

        logger.info(`Usuario ${requesterId} otorgó ${access} a ${finalTargetId} sobre ${file.path}`);
        res.json(permission);
    } catch (error: any) {
        next(error);
    }
};

/**
 * Revoca un permiso específico.
 */
export const revokePermissionHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { permissionId } = req.params;
        const requesterId = req.user!.id;

        const permission = await prisma.filePermission.findUnique({
            where: { id: permissionId },
            include: { file: true }
        });

        if (!permission) return res.status(404).json({ error: "Permiso no encontrado" });

        const isOwner = permission.file.ownerId === requesterId;
        const isAdmin = req.user!.role === "ADMIN" || req.user!.role === "SUPERADMIN";

        if (!isOwner && !isAdmin) {
             throw new ForbiddenError("Permiso denegado");
        }

        await prisma.filePermission.delete({ where: { id: permissionId } });
        res.json({ success: true, message: "Permiso revocado" });
    } catch (error: any) {
        next(error);
    }
};

/**
 * Obtiene la lista de permisos de un archivo.
 */
export const getFilePermissionsHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { fileId } = req.params;
        const permissions = await prisma.filePermission.findMany({
            where: { fileId },
            include: { user: { select: { email: true, id: true } } }
        });
        res.json(permissions);
    } catch (error: any) {
        next(error);
    }
};
