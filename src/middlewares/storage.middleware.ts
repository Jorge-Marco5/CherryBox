import { Request, Response, NextFunction } from 'express';
import { getSetting, getUsedStorage } from '../utils/settings';
import { AppError } from '../utils/errors';

export const checkStorageLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limitStorageStr = getSetting("LIMIT_STORAGE");
        const limitStorage = Number(limitStorageStr);
        
        if (!limitStorage) {
            return next(new AppError('No se ha configurado un límite de almacenamiento válido.', 500));
        }

        const currentSize = await getUsedStorage();

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
