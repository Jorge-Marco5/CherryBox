import { Request, Response } from "express";
import { logger } from "../utils/logger";
import path from "path";
import { AuthRequest } from "../middlewares/auth.middleware";
import { 
    listItemsService, 
    searchItemsService, 
    createFolderService, 
    renameItemService, 
    deleteItemService, 
    getItemContentService 
} from "../services/files.service";
import { isValidPath } from "../utils/multer";
import { getBaseDir } from "../utils/settings";

/**
 * Renderiza la vista principal del administrador de archivos.
 * 
 * @param req Petición de Express
 * @param res Respuesta que envía el archivo index.html
 */
export const dashboard = (req: Request, res: Response) => {
  try {
    res.sendFile(path.join(__dirname, '../views/index.html'));
  } catch (error: any) {
    logger.error('Error al cargar la página dashboard: ' + error.message);
    res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body>
          <h1>Error al cargar la página</h1>
          <p>${error.message}</p>
        </body>
      </html>
    `);
  }
}

/**
 * Lista los archivos y carpetas de un directorio específico.
 * Registra quién accedió a qué ruta para auditoría de navegación.
 * 
 * @param req Petición con la ruta relativa en query.path
 * @param res JSON con la lista de archivos y metadatos
 */
export const listFiles = async (req: AuthRequest, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || '';
    const files = await listItemsService(relativePath);
    res.json({ files, currentPath: relativePath });
  } catch (error: any) {
    logger.error(`Error al listar archivos (Usuario: ${req.user?.id}): ` + error.message);
    res.status(error.message === 'Ruta no válida' ? 403 : 500).json({ error: error.message });
  }
}

/**
 * Realiza una búsqueda recursiva de archivos que coincidan con un criterio.
 * 
 * @param req Petición con el término de búsqueda en query.q
 * @param res JSON con los resultados encontrados
 */
export const searchFiles = async (req: AuthRequest, res: Response) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json([]);

    logger.info(`[AUDIT] Usuario ${req.user?.id} realizó búsqueda: "${q}"`);
    const results = await searchItemsService(q);
    res.json(results);
  } catch (error: any) {
    logger.error(`Error al buscar archivos (Usuario: ${req.user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Crea una nueva carpeta en la ruta especificada.
 * 
 * @param req Petición con el nombre y ruta de la nueva carpeta
 * @param res Respuesta de confirmación
 */
export const createFolder = async (req: AuthRequest, res: Response) => {
  try {
    const { path: relativePath, name } = req.body;
    const result = await createFolderService(relativePath, name);
    logger.info(`[AUDIT] Usuario ${req.user?.id} creó la carpeta: ${path.join(relativePath, name)}`);
    res.json(result);
  } catch (error: any) {
    logger.error(`Error al crear carpeta (Usuario: ${req.user?.id}): ` + error.message);
    res.status(error.message === 'Ruta no válida' ? 403 : 500).json({ error: error.message });
  }
}

/**
 * Gestiona la subida de múltiples archivos.
 * 
 * @param req Petición con los archivos en req.files
 * @param res JSON con la lista de archivos subidos exitosamente
 */
export const uploadFiles = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se subieron archivos' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadedFiles = files.map(file => {
      logger.info(`[AUDIT] Usuario ${user?.id} subió archivo: ${file.filename} (${file.size} bytes)`);
      return {
        name: file.filename,
        size: file.size,
        path: file.path
      };
    });

    logger.info(`[AUDIT] Usuario ${user?.id} completó subida de ${uploadedFiles.length} archivo(s) a: ${req.query.path || '/'}`);
    res.json({
      success: true,
      message: `${uploadedFiles.length} archivo(s) subido(s) correctamente`,
      files: uploadedFiles
    });
  } catch (error: any) {
    logger.error(`Error al subir archivos (Usuario: ${user?.id}):`, error.message);
    res.status(500).json({ error: error.message });
  }
}

/**
 * Cambia el nombre de un archivo o carpeta existente.
 * 
 * @param req Petición con oldPath y newName en el body
 * @param res Respuesta de confirmación
 */
export const renameFile = async (req: AuthRequest, res: Response) => {
  try {
    const { oldPath, newName } = req.body;
    if (!oldPath || !newName) {
        return res.status(400).json({ error: 'Faltan parámetros (oldPath o newName)' });
    }
    const result = await renameItemService(oldPath, newName);
    logger.info(`[AUDIT] Usuario ${req.user?.id} renombró: ${oldPath} -> ${newName}`);
    res.json(result);
  } catch (error: any) {
    logger.error(`Error al renombrar (Usuario: ${req.user?.id}): ` + error.message);
    const status = error.message === 'Ruta no válida' ? 403 : (error.message === 'El archivo o carpeta no existe' ? 404 : 500);
    res.status(status).json({ error: error.message });
  }
}

/**
 * Elimina un archivo o una carpeta (recursivamente) del sistema.
 * 
 * @param req Petición con la ruta en body o query
 * @param res Respuesta de confirmación
 */
export const deleteFile = async (req: AuthRequest, res: Response) => {
  try {
    const relativePath = req.body?.path || (req.query?.path as string);
    if (!relativePath) {
        return res.status(400).json({ error: 'No se proporcionó la ruta del archivo' });
    }
    const result = await deleteItemService(relativePath);
    const action = result.isDirectory ? 'ELIMINÓ CARPETA' : 'ELIMINÓ ARCHIVO';
    logger.warn(`[AUDIT] Usuario ${req.user?.id} ${action}: ${relativePath}`);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error(`Error al eliminar (Usuario: ${req.user?.id}): ` + error.message);
    const status = error.message === 'Ruta no válida' ? 403 : (error.message === 'El archivo o carpeta no existe' ? 404 : 500);
    res.status(status).json({ error: error.message });
  }
}

/**
 * Obtiene el contenido de un archivo para vista previa.
 * Registra el acceso a contenidos específicos para auditoría de privacidad.
 * 
 * @param req Petición con la ruta del archivo en query.path
 * @param res JSON con el contenido (texto) o el archivo directamente (media)
 */
export const getFileContent = async (req: AuthRequest, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || '';
    const result = await getItemContentService(relativePath);
    
    if (!req.headers.range) {
      logger.info(`[AUDIT] Usuario ${req.user?.id} previsualizó el archivo: ${relativePath}`);
    }

    if (result.type === 'text') {
      return res.json(result);
    } else {
      return res.sendFile(result.fullPath!);
    }
  } catch (error: any) {
    logger.error(`Error al obtener contenido (Usuario: ${req.user?.id}): ` + error.message);
    res.status(error.message === 'Ruta no válida' ? 403 : 500).json({ error: error.message });
  }
}

/**
 * Inicia la descarga de un archivo.
 * Registra la descarga para control de fuga de información.
 * 
 * @param req Petición con la ruta del archivo en query.path
 * @param res Stream de descarga del archivo
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || '';
    if (!isValidPath(relativePath)) return res.status(403).json({ error: 'Ruta no válida' });
    
    // Aquí no movemos el res.download porque es una respuesta específica de Express, 
    // pero mantenemos la lógica mínima.
    const fullPath = path.join(getBaseDir(), relativePath);
    logger.info(`[AUDIT] Usuario ${req.user?.id} DESCARGÓ el archivo: ${relativePath}`);
    res.download(fullPath);
  } catch (error: any) {
    logger.error(`Error al descargar (Usuario: ${req.user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
}


