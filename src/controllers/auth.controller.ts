import { Request, Response } from "express"
import { register, login } from "../services/auth.service"
import { AuthRequest } from "../middlewares/auth.middleware"

export const registerHandler = async (req: Request, res: Response) => {

    const { email, password } = req.body

    try {

        await register(email, password)

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
            secure: true,
            sameSite: "strict"
        })

        res.json({ message: "Login exitoso", user })

    } catch (err: any) {
        res.status(401).json({ error: err.message })
    }
}

export const logoutHandler = (_req: Request, res: Response) => {
    res.clearCookie("token")
    res.json({ message: "Logout" })
}

export const sessionHandler = (req: AuthRequest, res: Response) => {
    //retorna los datos del usuario de la sesion actual
    const user = req.user
    res.json(user)
}