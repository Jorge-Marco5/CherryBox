import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../lib/jwt"
import { prisma } from "../lib/prisma"

export interface AuthRequest extends Request {
    user?: { id: number }
}

/**
 * Verifica la presencia y validez de un token JWT en las cookies de la petición.
 * Se implementa como middleware para proteger rutas que requieren usuario autenticado,
 * evitando que accesos no autorizados alcancen los controladores principales y
 * aislando la lógica de seguridad del resto de la aplicación.
 * 
 * @param req Petición extendida que contendrá el usuario si el token es válido
 * @param res Respuesta de Express para retornar errores de autenticación
 * @param next Función para continuar al siguiente middleware o controlador
 */
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {

    const token = req.cookies?.token

    if (!token) {
        res.status(401).json({ error: "No autenticado" })
        return
    }

    try {

        const decoded = verifyToken(token) as { id: number }

        req.user = { id: decoded.id }

        next()

    } catch (err) {
        res.status(401).json({ error: "Token inválido" })
        return
    }
}

/**
 * Verifica que el usuario autenticado tenga el rol de administrador.
 * ¿Por qué? Se implementa para restringir endpoints críticos, como el registro de nuevos usuarios,
 * con el objetivo de evitar que usuarios convencionales eleven privilegios o creen cuentas sin autorización.
 * Requiere que el middleware `requireAuth` se haya ejecutado antes.
 * 
 * @param req Petición extendida con la información del usuario
 * @param res Respuesta de Express para retornar error si no es admin
 * @param next Función para pasar al controlador si todo es correcto
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.id) {
        res.status(401).json({ error: "No autenticado" })
        return
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        })

        if (!user || user.role !== "ADMIN") {
            res.status(403).json({ error: "Acceso denegado. Se necesitan permisos de administrador." })
            return
        }

        next()
    } catch (err) {
        res.status(500).json({ error: "Error al verificar permisos" })
        return
    }
}
