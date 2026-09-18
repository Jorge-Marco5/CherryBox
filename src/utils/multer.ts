
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { system_setting } from '../config/config'
import { ValidationError } from './errors';
import { sanitizeName, decodePath } from './sanitize';

/**
 * Evalúa expresiones matemáticas simples de las variables de entorno (ej: "100 * 1024 * 1024")
 */
function evaluateEnvVar(value: string | undefined, defaultValue: number): number {
  if (!value) return defaultValue;
  try {
    // Sanitizar y evaluar de forma segura (solo números y operadores básicos)
    const sanitized = value.replace(/[^0-9*+\-/\s()]/g, '');
    // eslint-disable-next-line no-new-func
    return new Function(`return ${sanitized}`)();
  } catch {
    return defaultValue;
  }
}

// Función para validar que la ruta esté dentro del directorio base
export function isValidPath(requestedPath: string) {
  const baseDir = system_setting.getBaseDir();
  const normalizedBase = path.resolve(baseDir);
  const fullPath = path.resolve(normalizedBase, requestedPath);

  // Usar path.relative para verificar que no escapa del directorio base
  const relative = path.relative(normalizedBase, fullPath);
  return relative === "" || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Configuración de multer para subir archivos
export const storage = multer.diskStorage({
  destination: (req: any, file: any, cb: any) => {
    const uploadPath = req.query.path || '';

    // Validación de seguridad para la ruta de subida
    if (!isValidPath(uploadPath)) {
      return cb(new ValidationError('Ruta de destino no válida'), null);
    }

    const baseDir = system_setting.getBaseDir();
    const fullPath = path.join(baseDir, decodePath(uploadPath));

    // Crear directorio si no existe (sincrónico para evitar race conditions con busboy)
    try {
      const fsSync = require('fs');
      if (!fsSync.existsSync(fullPath)) {
        fsSync.mkdirSync(fullPath, { recursive: true });
      }
      cb(null, fullPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req: any, file: any, cb: any) => {
    // Decodificar y sanitizar el nombre del archivo
    let filename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // Sanitizar caracteres especiales conflictivos (#, %, &, ?, +, :, *, etc.)
    filename = sanitizeName(filename);

    // RASTREO: Guardar la ruta completa en req para limpieza en caso de aborto
    const uploadPath = req.query.path || '';
    const fullPath = path.join(system_setting.getBaseDir(), uploadPath, filename);

    if (!req._filesInProgress) req._filesInProgress = [];
    req._filesInProgress.push(fullPath);

    cb(null, filename);
  }
});

/**
 * Objeto upload con funciones middleware dinámicas.
 * En cada petición consulta system_setting para aplicar los límites
 * de MAX_FILE_SIZE y MAX_FILES en tiempo real, evitando que cambios
 * de configuración en caliente sean ignorados por instancias estáticas de Multer.
 */
export const upload = {
  array: (fieldName: string = "files", maxCount?: number) => {
    return (req: any, res: any, next: any) => {
      const maxFileSize = Number(system_setting.getSetting("MAX_FILE_SIZE")) || 524288000;
      const configuredMaxFiles = Number(system_setting.getSetting("MAX_FILES")) || 10;
      const limitFiles = maxCount ?? configuredMaxFiles;

      const dynamicMulter = multer({
        storage,
        limits: {
          fileSize: maxFileSize,
          files: limitFiles
        }
      });

      return dynamicMulter.array(fieldName, limitFiles)(req, res, next);
    };
  },
  single: (fieldName: string = "file") => {
    return (req: any, res: any, next: any) => {
      const maxFileSize = Number(system_setting.getSetting("MAX_FILE_SIZE")) || 524288000;
      const dynamicMulter = multer({
        storage,
        limits: {
          fileSize: maxFileSize,
          files: 1
        }
      });

      return dynamicMulter.single(fieldName)(req, res, next);
    };
  }
};