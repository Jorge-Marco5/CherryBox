import { Request, Response, NextFunction } from 'express';
import { system_setting } from '../config/config';
import { AppError } from '../utils/errors';
import { checkPermission } from '../services/files.service';
import { AuthRequest } from './auth.middleware';
import { formatBytes } from '../utils/formatBytes';

/**
 * Tolerancia en bytes para las cabeceras y delimitadores (boundaries)
 * de peticiones HTTP multipart/form-data.
 */
const MULTIPART_OVERHEAD_BYTES = 64 * 1024; // 64 KB de margen

/**
 * Middleware para validaciones de almacenamiento antes de procesar la subida de archivos:
 * - Que las configuraciones del sistema (LIMIT_STORAGE y MAX_FILE_SIZE) existan y sean válidas.
 * - Que el almacenamiento total del sistema no esté saturado.
 * - Que el tamaño de la carga entrante (Content-Length) no exceda el espacio de almacenamiento disponible.
 * - Que el tamaño entrante no exceda el límite permitido por archivo (o por lote si son varios).
 */
export const checkStorageLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const limitStorage = Number(system_setting.getSetting("LIMIT_STORAGE"));
        const maxFileSize = Number(system_setting.getSetting("MAX_FILE_SIZE"));
        const maxFiles = Number(system_setting.getSetting("MAX_FILES")) || 10;

        //Validar configuraciones del servidor
        if (!limitStorage || isNaN(limitStorage) || limitStorage <= 0) {
            return next(new AppError('No se ha configurado un límite de almacenamiento válido en el servidor.', 500));
        }

        if (!maxFileSize || isNaN(maxFileSize) || maxFileSize <= 0) {
            return next(new AppError('No se ha configurado un límite de tamaño de archivo válido en el servidor.', 500));
        }

        //Obtener almacenamiento actual en bytes
        const currentUsedBytes = Number(await system_setting.getUsedStorage()) || 0;
        const availableBytes = Math.max(0, limitStorage - currentUsedBytes);

        //Validar si el almacenamiento global ya está al 100%
        if (currentUsedBytes >= limitStorage || availableBytes <= 0) {
            return next(
                new AppError(
                    `Límite de almacenamiento alcanzado (${formatBytes(currentUsedBytes)} de ${formatBytes(limitStorage)} utilizados). No hay espacio disponible para subir más archivos.`,
                    403
                )
            );
        }

        //Validar el tamaño del cuerpo de la petición mediante el encabezado Content-Length
        const contentLength = Number(req.headers['content-length'] || 0);

        if (contentLength > 0) {
            //Validar que la subida no supere el almacenamiento disponible en disco
            if (contentLength > availableBytes) {
                return next(
                    new AppError(
                        `El tamaño de la carga (${formatBytes(contentLength)}) supera el almacenamiento disponible restante (${formatBytes(availableBytes)} de ${formatBytes(limitStorage)}).`,
                        403
                    )
                );
            }

            //Validar límite de tamaño de archivo
            //Identificar si la petición corresponde a un solo archivo o a un lote múltiple
            const fileCount = Number(req.headers['x-file-count'] || req.headers['x-files-count'] || 1);

            if (fileCount === 1) {
                //Subida individual (comportamiento estándar en CherryBox)
                if (contentLength > maxFileSize + MULTIPART_OVERHEAD_BYTES) {
                    return next(
                        new AppError(
                            `El archivo excede el tamaño máximo permitido (${formatBytes(maxFileSize)}).`,
                            400
                        )
                    );
                }
            } else {
                //Subida por lote (múltiples archivos en la misma petición)
                const effectiveCount = Math.min(fileCount, maxFiles);
                const maxBatchAllowed = (maxFileSize * effectiveCount) + MULTIPART_OVERHEAD_BYTES;

                if (contentLength > maxBatchAllowed) {
                    return next(
                        new AppError(
                            `La carga total (${formatBytes(contentLength)}) excede el límite permitido para esta subida (${formatBytes(maxFileSize * effectiveCount)}).`,
                            400
                        )
                    );
                }
            }
        }

        next();
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }
        next(new AppError('Error al validar el límite de almacenamiento.', 500));
    }
};

export const checkUploadPermission = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const uploadPath = (req.query.path as string) || "";
        await checkPermission(req.user!.id, req.user!.role, uploadPath, "WRITE");
        next();
    } catch (error) {
        next(error);
    }
};
