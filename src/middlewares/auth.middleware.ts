import { Request, Response, NextFunction } from "express"
import { verifyToken } from "../lib/jwt"
import { prisma } from "../lib/prisma"
import { UnauthorizedError, ForbiddenError } from "../utils/errors";

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    }
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
export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {

    const token = req.cookies?.token

    if (!token) throw new UnauthorizedError("No autenticado");

    try {
        const decoded = verifyToken(token) as { id: string, username: string }

        const dbUser = await prisma.user.findUnique({
            where: { id: decoded.id }
        })

        if (!dbUser) throw new UnauthorizedError("Usuario no encontrado");
        if (dbUser.is_blocked) throw new ForbiddenError("Usuario bloqueado");

        req.user = { id: dbUser.id, role: dbUser.role }

        next()
    } catch (err) {
        if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
        throw new UnauthorizedError("Token inválido");
    }
}

/**
 * Verifica que el usuario autenticado tenga el rol de administrador o superadministrador.
 */
export const requireAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user
    if (!user) throw new UnauthorizedError("No autenticado");

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
        throw new ForbiddenError("Acceso denegado. Se necesitan permisos de administrador.");
    }

    next()
}

/**
 * Verifica que el usuario autenticado sea estrictamente un Superadministrador.
 */
export const requireSuperAdmin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user
    if (!user) throw new UnauthorizedError("No autenticado");

    if (user.role !== "SUPERADMIN") {
        throw new ForbiddenError("Acceso denegado. Esta acción requiere permisos de Superadministrador.");
    }

    next()
}

/**
 * Middleware para proteger VISTAS (HTML). 
 * Si no está autenticado, redirige al login en lugar de devolver JSON.
 */
export const requireAuthView = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.token
    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = verifyToken(token) as { id: string }
        const dbUser = await prisma.user.findUnique({ where: { id: decoded.id } })

        if (!dbUser || dbUser.is_blocked) {
            res.clearCookie('token');
            return res.redirect('/login');
        }

        req.user = { id: dbUser.id, role: dbUser.role }
        next()
    } catch (err) {
        res.clearCookie('token');
        return res.redirect('/login');
    }
}

/**
 * Middleware para proteger VISTAS de administración.
 * Requiere que el usuario sea ADMIN o SUPERADMIN.
 */
export const requireAdminView = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
        // En lugar de redirigir a error, podemos redirigir al home o dejar que el dashboard maneje la falta de datos
        // pero lo más seguro es prohibir la carga del HTML.
        return res.redirect('/?error=forbidden');
    }
    next()
}
