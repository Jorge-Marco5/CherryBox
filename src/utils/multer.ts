
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getBaseDir } from './settings';
import { ValidationError } from './errors';
import dotenv from 'dotenv';

dotenv.config();

//Obtenemos el valor de la ruta de la carpeta donde se guardaran los archivos
const BASE_DIR = getBaseDir();
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 100 * 1024 * 1024;
// Función para validar que la ruta esté dentro del directorio base
export function isValidPath(requestedPath: string) {
  const normalizedBase = path.resolve(BASE_DIR);
  const fullPath = path.resolve(normalizedBase, requestedPath);

  // Usar path.relative para verificar que no escapa del directorio base
  const relative = path.relative(normalizedBase, fullPath);
  return relative === "" || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

// Configuración de multer para subir archivos
export const storage = multer.diskStorage({
  destination: async (req: any, file: any, cb: any) => {
    try {
      const uploadPath = req.query.path || '';

      // Validación de seguridad para la ruta de subida
      if (!isValidPath(uploadPath)) {
        return cb(new ValidationError('Ruta de destino no válida'), null);
      }

      const fullPath = path.join(BASE_DIR, uploadPath);

      // Crear directorio si no existe
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req: any, file: any, cb: any) => {
    // Decodificar y sanitizar el nombre del archivo
    let filename = Buffer.from(file.originalname, 'latin1').toString('utf8');

    // Eliminar caracteres que podrían ser usados para path traversal o inyección
    filename = filename.replace(/[\/\\]/g, '_').trim();

    // RASTREO: Guardar la ruta completa en req para limpieza en caso de aborto
    const uploadPath = req.query.path || '';
    const fullPath = path.join(getBaseDir(), uploadPath, filename);

    if (!req._filesInProgress) req._filesInProgress = [];
    req._filesInProgress.push(fullPath);

    cb(null, filename);
  }
});

export const upload = multer({
  storage,
  limits: {
    fileSize: Number(MAX_FILE_SIZE) // Límite de 100MB por archivo
  }
});