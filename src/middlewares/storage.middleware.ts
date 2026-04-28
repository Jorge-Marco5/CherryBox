import { Request, Response, NextFunction } from 'express';
import { getBaseDir, getSetting } from '../utils/settings';
import { calculateDirSize } from '../controllers/settings.controller';
import { AppError } from '../utils/errors';

export const checkStorageLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limitStorageStr = getSetting("LIMIT_STORAGE");
        const limitStorage = Number(limitStorageStr);
        
        if (!limitStorage) {
            return next(new AppError('No se ha configurado un límite de almacenamiento válido.', 500));
        }

        const baseDir = getBaseDir();
        if (!baseDir) {
            return next(new AppError('No se ha configurado el directorio base.', 500));
        }

        const currentSize = await calculateDirSize(baseDir);

        // Approximate incoming file size from content-length if available
        const contentLength = Number(req.headers['content-length'] || 0);

        if (currentSize + contentLength > limitStorage) {
            return next(new AppError('Límite de almacenamiento alcanzado o superado. No se pueden subir más archivos.', 403));
        }

        next();
    } catch (error) {
        next(new AppError('Error al validar el límite de almacenamiento.', 500));
    }
};
