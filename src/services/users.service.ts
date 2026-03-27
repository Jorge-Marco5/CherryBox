import { prisma } from "../lib/prisma";

export const getUsersService = async () => {
    const users = await prisma.user.findMany({ select: { id: true, email: true, role: true, is_blocked: true } });
    return users;
}

export const deleteUserService = async (id: string) => {
    const user = await prisma.user.delete({ where: { id } });
    return user;
}

export const updateUserService = async (id: string, data: any) => {
    const user = await prisma.user.update({ where: { id }, data });
    return user;
}

export const blockUserService = async (id: string) => {
    const userBlocked = await prisma.user.findUnique({ where: { id } });
    if (!userBlocked) {
        throw new Error("Usuario no encontrado");
    }
    if (userBlocked.role === 'ADMIN') {
        throw new Error("No se puede bloquear a un usuario con rol de administrador");
    }
    const user = await prisma.user.update({ where: { id }, data: { is_blocked: !userBlocked.is_blocked } });
    return user;
}