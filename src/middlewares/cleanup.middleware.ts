import { Request, Response, NextFunction } from 'express';
import fs from 'fs/promises';
import { logger } from '../utils/logger';

/**
 * Middleware que limpia archivos subidos si la petición se cancela o aborta 
 * antes de que el servidor termine de procesarla.
 * 
 * Debe colocarse DESPUÉS de multer y ANTES del controlador.
 */
export const uploadCleanupMiddleware = (req: any, res: Response, next: NextFunction) => {
  res.on('close', async () => {
    // Si la respuesta no se ha terminado de escribir, significa que la conexión se cerró prematuramente (abort)
    if (!res.writableFinished) {
      const trackedFiles = req._filesInProgress || [];
      const multerFiles = (req.files as Express.Multer.File[]) || [];
      const multerFile = (req.file as Express.Multer.File);

      // Combinar todas las posibles fuentes de rutas de archivos (solo valores válidos)
      const pathsToDelete = new Set<string>();

      trackedFiles.forEach((p: string) => { if (p) pathsToDelete.add(p); });
      multerFiles.forEach((f: any) => { if (f && f.path) pathsToDelete.add(f.path); });
      if (multerFile && multerFile.path) pathsToDelete.add(multerFile.path);

      for (const filePath of pathsToDelete) {
        try {
          // Intentar borrar incluso si no estamos seguros de que existe totalmente
          await fs.unlink(filePath);
          logger.warn(`[CLEANUP] Archivo parcial/huérfano eliminado: ${filePath}`);
        } catch (err: any) {
          // Ignorar si el archivo no existe (ya borrado o nunca creado)
          if (err.code !== 'ENOENT') {
            logger.error(`[CLEANUP] Error al intentar eliminar ${filePath}: ${err.message}`);
          }
        }
      }
    }
  });

  next();
};
