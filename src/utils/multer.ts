
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { getSetting } from './settings';

const baseDir = getSetting('BASE_DIR');
const BASE_DIR = path.join(__dirname,"../../", baseDir.toString());

// Función para validar que la ruta esté dentro del directorio base
export function isValidPath(requestedPath: string) {
  const fullPath = path.resolve(BASE_DIR, requestedPath);
  return fullPath.startsWith(path.resolve(BASE_DIR));
}

// Configuración de multer para subir archivos
export const storage = multer.diskStorage({
  destination: async (req: any, file: any, cb: any) => {
    try {
      const uploadPath = req.query.path || '';
      
      // Validación de seguridad para la ruta de subida
      if (!isValidPath(uploadPath)) {
        return cb(new Error('Ruta de destino no válida'), null);
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
    // Decodificar el nombre del archivo para soportar caracteres especiales
    const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, filename);
  }
});

export const upload = multer({ 
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // Límite de 100MB por archivo
  }
});