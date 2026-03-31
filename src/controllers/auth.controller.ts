import { Request, Response, NextFunction } from "express"
import { logger } from "../utils/logger"
import { register, login } from "../services/auth.service"
import { AuthRequest } from "../middlewares/auth.middleware";
import { UnauthorizedError } from "../utils/errors";

/**
 * Gestiona el registro de nuevos usuarios en el sistema.
 * Solo puede ser invocado por administradores ya autenticados.
 * 
 * @param req Petición con email y password en el body
 * @param res Respuesta de confirmación o error
 */
export const registerHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const { email, password } = req.body

    try {
        if (!user) throw new UnauthorizedError();

        const newUser = await register(email, password)

        logger.info('Usuario ' + user.id + ' ha registrado un nuevo usuario con id: ' + newUser.user.id + ' y email: ' + newUser.user.email)
        res.json({ message: "Usuario registrado" })

    } catch (err: any) {
        next(err);
    }
}

/**
 * Autentica a un usuario y establece la cookie de sesión (JWT).
 * Configura la cookie con seguridad ajustada para entornos locales y móviles.
 * 
 * @param req Petición con el email y contraseña
 * @param res Respuesta con los datos del usuario y la cookie de token
 */
export const loginHandler = async (req: Request, res: Response, next: NextFunction) => {

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
        next(err);
    }
}

/**
 * Cierra la sesión activa borrando la cookie de autenticación.
 * 
 * @param req Petición autenticada
 * @param res Respuesta de confirmación
 */
export const logoutHandler = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const user = req.user;
        if (!user) throw new UnauthorizedError();
        res.clearCookie("token")
        logger.info('Usuario ' + user.id + ' ha cerrado sesion')
        res.json({ message: "Logout" })
    } catch (error) {
        next(error);
    }
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