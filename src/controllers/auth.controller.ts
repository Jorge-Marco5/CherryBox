import { Request, Response } from "express"
import { logger } from "../utils/logger"
import { register, login } from "../services/auth.service"
import { AuthRequest } from "../middlewares/auth.middleware"

export const registerHandler = async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ error: "No autenticado" });
        }
        const { email, password } = req.body

        await register(email, password)

        logger.info('EL usuario ' + user.id + ' se ha registrado exitosamente')
        res.json({ message: "Usuario registrado" })

    } catch (err: any) {
        res.status(400).json({ error: err.message })
    }
}

export const loginHandler = async (req: Request, res: Response) => {

    const { email, password } = req.body

    try {

        const { token, user } = await login(email, password)

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: "lax"
        })

        logger.info(`Usuario ${user.email} logueado exitosamente`)
        res.json({ message: "Login exitoso", user })

    } catch (err: any) {
        res.status(401).json({ error: err.message })
    }
}

export const logoutHandler = (req: AuthRequest, res: Response) => {
    res.clearCookie("token")
    logger.info(`Usuario ${req.user?.id} ha cerrado sesion`)
    res.json({ message: "Logout" })
}

export const sessionHandler = (req: AuthRequest, res: Response) => {
    //retorna los datos del usuario de la sesion actual
    const user = req.user
    res.json(user)
}