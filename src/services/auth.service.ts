import bcrypt from "bcrypt"
import { prisma } from "../lib/prisma"
import { signToken } from "../lib/jwt"

export const register = async (email: string, password: string) => {

    const existing = await prisma.user.findUnique({ where: { email } })

    if (existing) {
        throw new Error("Usuario ya existe")
    }

    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: { email, password: hash }
    })

    const token = signToken({ id: user.id })

    return { user, token }
}

export const login = async (email: string, password: string) => {

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, password: true } })

    if (!user) {
        throw new Error("Credenciales inválidas")
    }

    const valid = await bcrypt.compare(password, user.password)

    if (!valid) {
        throw new Error("Credenciales inválidas")
    }

    const { password: _, ...userWithoutPassword } = user

    const token = signToken({ id: user.id })

    return { user: userWithoutPassword, token }
}