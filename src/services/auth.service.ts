import bcrypt from "bcrypt"
import { prisma } from "../lib/prisma"
import { signToken } from "../lib/jwt"
import { logger } from "../utils/logger"
import { UnauthorizedError, ForbiddenError, ConflictError } from "../utils/errors";

export const register = async (email: string, password: string) => {

    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
        throw new ConflictError("Usuario ya existe")
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: { email, password: hash }
    })

    const token = signToken({ id: user.id })

    const userWithoutPassword = { ...user, password: "" }
    const userWithoutBlocked = { ...userWithoutPassword, is_blocked: false }

    return { user: userWithoutBlocked, token }
}

export const login = async (email: string, password: string) => {

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, is_blocked: true, password: true } })

    if (!user) {
        throw new UnauthorizedError("Credenciales inválidas")
    }

    if (user.is_blocked) {
        throw new ForbiddenError("Usuario bloqueado")
    }

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
        logger.error(`[ERROR] Intento de login fallido para la cuenta ${email}`);
        throw new UnauthorizedError("Credenciales inválidas")
    }

    //remover password y is_blocked del objeto
    const userWithoutPassword = { ...user, password: "" }
    const userWithoutBlocked = { ...userWithoutPassword, is_blocked: false }

    //cambiar el valor de 'SUPERADMIN' a 'ADMIN'
    let changedRole = userWithoutBlocked
    if (user.role === "SUPERADMIN") {
        changedRole = { ...userWithoutBlocked, role: "ADMIN" }
    }

    const token = signToken({ id: user.id })

    return { user: changedRole, token }
}