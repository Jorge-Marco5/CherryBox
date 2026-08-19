import { prisma } from "../lib/prisma";
import { Role } from "../generated/prisma/client";
import { NotFoundError, ForbiddenError, ValidationError } from "../utils/errors";

/**
 * Valida si un solicitante tiene permiso para realizar una acción sobre un objetivo.
 * Implementa las reglas de negocio: superadmin intocable y admin limitado a users.
 * 
 * @param requester Usuario que realiza la acción (id, role)
 * @param targetId ID del usuario objetivo de la acción
 */
const validateUserAction = async (requester: { id: string, role: string }, targetId: string) => {
    const target = await prisma.user.findUnique({ where: { id: targetId } });
    if (!target) throw new NotFoundError("Usuario no encontrado");

    // 1. Superadmin es intocable
    if (target.role === "SUPERADMIN") {
        throw new ForbiddenError("No se permite realizar esta acción sobre este usuario");
    }

    // 2. Si el solicitante es ADMIN, solo puede gestionar USERS
    if (requester.role === "ADMIN" && target.role === "ADMIN") {
        if (requester.id !== targetId) {
            throw new ForbiddenError("Un administrador no puede gestionar a otro administrador");
        }
    }

    return target;
};

export const getUsersService = async () => {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, is_blocked: true }, orderBy: { updatedAt: "desc" } });
    //cambiar el valor de 'SUPERADMIN' a 'ADMIN'
    const changedRole = users.map(user => {
        if (user.role === "SUPERADMIN") {
            return { ...user, role: "ADMIN" }
        }
        return user
    })
    return changedRole;
}

export const deleteUserService = async (targetId: string, requester: { id: string, role: string }) => {
    await validateUserAction(requester, targetId);
    const user = await prisma.user.delete({ where: { id: targetId } });
    return user;
}

export const updateUserService = async (targetId: string, data: any, requester: { id: string, role: string }) => {
    const target = await validateUserAction(requester, targetId);

    // Si es un cambio de rol, validar restricciones adicionales
    if (data.role) {
        if (data.role === "SUPERADMIN") {
            throw new ValidationError("No es posible asignar el rol al usuario");
        }
        // Admins solo pueden promover/demoter a USER <-> ADMIN
        if (requester.role === "ADMIN" && (data.role !== "USER" && data.role !== "ADMIN")) {
            throw new ForbiddenError("Permiso denegado para el rol solicitado");
        }
    }

    const user = await prisma.user.update({ where: { id: targetId }, data });
    return user;
}

export const blockUserService = async (targetId: string, requester: { id: string, role: string }) => {
    const target = await validateUserAction(requester, targetId);
    const user = await prisma.user.update({
        where: { id: targetId },
        data: { is_blocked: !target.is_blocked }
    });
    return user;
}

//restriccion: admin (admin y superadmin), superadmin (superadmin)
export const verifySuperAdminService = async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    //si un usuario tiene rol de administrador o superadministrador, devolver true
    if (user?.role === "SUPERADMIN") {
        return true;
    }
    return false;
}

export const verifyAdminService = async (id: string) => {
    const user = await prisma.user.findUnique({ where: { id } });
    //si un usuario tiene rol de administrador o superadministrador, devolver true
    if (user?.role === "ADMIN" || user?.role === "SUPERADMIN") {
        return true;
    }
    return false;
}