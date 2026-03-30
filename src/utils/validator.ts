import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';

/**
 * Middleware genérico para validar peticiones Express mediante esquemas de Zod.
 * Valida de forma estructurada el body, query y params de la petición.
 * 
 * @param schema Esquema de Zod que define la estructura esperada de la petición.
 */
export const validate = (schema: ZodTypeAny) =>
    (req: Request, res: Response, next: NextFunction) => {
        try {
            schema.parse({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                return res.status(400).json(
                    error.issues.map((issue) => ({
                        // Si el error está en body/query/params, omitimos el primer nivel para el cliente
                        path: issue.path.length > 1 ? issue.path.slice(1).join('.') : issue.path.join('.'),
                        message: issue.message,
                    }))
                );
            }
            return res.status(500).json({ message: "Error interno del servidor durante la validación" });
        }
    };
