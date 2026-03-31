import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Manejo de errores controlados (AppError)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.name
    });
  }

  // Manejo de errores de Multer (Límites de archivos)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'El archivo excede el límite de tamaño (100MB)',
      code: 'FileTooLarge'
    });
  }

  // Errores no controlados
  logger.error(`[CRITICAL] Unhandled Error: ${err.message}`, { stack: err.stack });
  
  res.status(500).json({
    error: 'Ha ocurrido un error inesperado en el servidor',
    code: 'InternalServerError'
  });
};
