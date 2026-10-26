import { Request, Response, NextFunction } from "express";
import fs from "fs/promises";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { analyzeFileSafety } from "../utils/fileSecurity";

/**
 * Middleware para validar que los archivos subidos coincidan con su extensión real.
 * Si alguno no coincide o es inválido, se descarta por completo y se elimina del disco.
 */
export const validateUploadedFiles = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const files: Express.Multer.File[] = Array.isArray(req.files)
    ? req.files
    : req.file
    ? [req.file]
    : [];

  if (files.length === 0) return next();

  try {
    for (const file of files) {
      const result = await analyzeFileSafety(file.path, file.originalname);

      if (!result.isValid) {
        logger.warn(`[SECURITY] Archivo rechazado '${file.originalname}': ${result.error}`);
        await rollbackFiles(req, files);
        return next(new ValidationError(result.error || "Archivo no válido"));
      }

      (file as any).detectedType = result.detectedType;
      (file as any).detectedMime = result.mimeType;
    }

    next();
  } catch (error: any) {
    logger.error(`[SECURITY] Error validando archivos: ${error.message}`);
    await rollbackFiles(req, files);
    next(error);
  }
};

/**
 * Elimina físicamente del disco todos los archivos involucrados en la petición.
 */
async function rollbackFiles(req: any, files: Express.Multer.File[]) {
  const paths = new Set<string>();
  files.forEach((f) => f?.path && paths.add(f.path));
  if (Array.isArray(req._filesInProgress)) {
    req._filesInProgress.forEach((p: string) => p && paths.add(p));
  }

  for (const filePath of paths) {
    try {
      await fs.unlink(filePath);
    } catch {}
  }
  req._filesInProgress = [];
}
