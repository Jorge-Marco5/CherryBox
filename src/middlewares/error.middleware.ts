import { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";
import { getSetting } from "../utils/settings";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Manejo de errores controlados (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.name,
    });
  }

  //Manejo de errores en archivos con fs
  if (err.Error === "ENOENT") {
    //console.log("Error enoent: " + err);
    return res.status(404).json({
      error: "El archivo o carpeta no existe o está bloqueado",
      code: err.name,
    });
  }

  if (err.Error === "EACCESS") {
    //console.log("Error enoent: " + err);
    return res.status(404).json({
      error: "Acceso denegado al archivo o carpeta",
      code: err.name,
    });
  }

  // Manejo de errores de Multer (Límites de archivos)
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      error: `El archivo excede el límite de tamaño (${Number(getSetting("MAX_FILE_SIZE")) / 1024 / 1024}MB)`,
      code: "FileTooLarge",
    });
  }

  // Errores no controlados
  logger.error(`[CRITICAL] Unhandled Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    error: "Ha ocurrido un error inesperado en el servidor",
    code: "InternalServerError",
  });
};
