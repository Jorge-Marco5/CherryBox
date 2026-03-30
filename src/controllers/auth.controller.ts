import { Request, Response } from "express"
import { logger } from "../utils/logger"
import { register, login } from "../services/auth.service"
import { AuthRequest } from "../middlewares/auth.middleware";

/**
 * Gestiona el registro de nuevos usuarios en el sistema.
 * Solo puede ser invocado por administradores ya autenticados.
 * 
 * @param req Petición con email y password en el body
 * @param res Respuesta de confirmación o error
 */
export const registerHandler = async (req: AuthRequest, res: Response) => {
    const user = req.user;
    const { email, password } = req.body

    try {
        if (!user) {
            return res.status(401).json({ error: "No autenticado" });
        }

        const newUser = await register(email, password)

        logger.info('Usuario ' + user.id + ' ha registrado un nuevo usuario con id: ' + newUser.user.id + ' y email: ' + newUser.user.email)
        res.json({ message: "Usuario registrado" })

    } catch (err: any) {
        logger.warn(`[SECURITY] Intento fallido de registro por administrador ${user?.id} para email: ${email} - Error: ${err.message}`);
        res.status(400).json({ error: err.message })
    }
}

/**
 * Autentica a un usuario y establece la cookie de sesión (JWT).
 * Configura la cookie con seguridad ajustada para entornos locales y móviles.
 * 
 * @param req Petición con el email y contraseña
 * @param res Respuesta con los datos del usuario y la cookie de token
 */
export const loginHandler = async (req: Request, res: Response) => {

    const { email, password } = req.body

    try {

        const { token, user } = await login(email, password)

        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // Permitimos HTTP para facilitar acceso desde red local/móvil
            sameSite: "lax"
        })

        logger.info(`Usuario ${user.email} | ${user.id} logueado exitosamente`)
        res.json({ message: "Login exitoso", user })

    } catch (err: any) {
        logger.warn(`[SECURITY] Intento de login fallido para email: ${email} - Error: ${err.message}`);
        res.status(401).json({ error: err.message })
    }
}

/**
 * Cierra la sesión activa borrando la cookie de autenticación.
 * 
 * @param req Petición autenticada
 * @param res Respuesta de confirmación
 */
export const logoutHandler = async (req: AuthRequest, res: Response) => {
    const user = req.user;
    if (!user) {
        return res.status(401).json({ error: "No autenticado" });
    }
    res.clearCookie("token")
    logger.info('Usuario ' + user.id + ' ha cerrado sesion')
    res.json({ message: "Logout" })
}

/**
 * Recupera los datos básicos del usuario de la sesión actual.
 * 
 * @param req Petición autenticada (middleware requireAuth previo)
 * @param res JSON con el ID del usuario
 */
export const sessionHandler = (req: AuthRequest, res: Response) => {
    const user = req.user
    res.json(user)
}