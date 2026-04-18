import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import path from "path";
import { AuthRequest } from "../middlewares/auth.middleware";
import archiver from "archiver";
import {
  listItemsService,
  searchItemsService,
  createFolderService,
  renameItemService,
  deleteItemService,
  getItemContentService,
  registerUploadedFilesService,
  verifyDownloadMultipleService
} from "../services/files.service";
import { isValidPath } from "../utils/multer";
import { getBaseDir } from "../utils/settings";
import { ValidationError } from "../utils/errors";

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
export const listFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const relativePath = (req.query.path as string) || '';
    const { files, currentFolderId, currentFolderName } = await listItemsService(relativePath, req.user!.id, req.user!.role);
    res.json({ files, currentPath: relativePath, currentFolderId, currentFolderName });
  } catch (error: any) {
    next(error);
  }
}

/**
 * Realiza una búsqueda recursiva de archivos que coincidan con un criterio.
 * 
 * @param req Petición con el término de búsqueda en query.q
 * @param res JSON con los resultados encontrados
 */
export const searchFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) return res.json([]);

    logger.info(`[AUDIT] Usuario ${req.user?.id} realizó búsqueda: "${q}"`);
    const results = await searchItemsService(q, req.user!.id, req.user!.role);
    res.json(results);
  } catch (error: any) {
    next(error);
  }
}

/**
 * Crea una nueva carpeta en la ruta especificada.
 * 
 * @param req Petición con el nombre y ruta de la nueva carpeta
 * @param res Respuesta de confirmación
 */
export const createFolder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { path: relativePath, name } = req.body;
    if (!name) throw new ValidationError("El nombre de la carpeta es requerido");

    const result = await createFolderService(relativePath, name, req.user!.id, req.user!.role);
    logger.info(`[AUDIT] Usuario ${req.user?.id} creó la carpeta: ${path.join(relativePath, name)}`);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
}

/**
 * Gestiona la subida de múltiples archivos.
 * 
 * @param req Petición con los archivos en req.files
 * @param res JSON con la lista de archivos subidos exitosamente
 */
export const uploadFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const user = req.user;
  try {
    if (!req.files || (req.files as any).length === 0) {
      throw new ValidationError('No se subieron archivos');
    }

    const files = req.files as Express.Multer.File[];
    const relativePath = (req.query.path as string) || '';

    //Registro de los datos en la base de datos
    await registerUploadedFilesService(files, relativePath, user!.id);

    logger.info(`[AUDIT] Usuario ${user?.id} completó subida de ${files.length} archivo(s) a: ${relativePath}`);
    res.json({
      success: true,
      message: `${files.length} archivo(s) subido(s) correctamente`
    });
  } catch (error: any) {
    next(error);
  }
}

/**
 * Cambia el nombre de un archivo o carpeta existente.
 * 
 * @param req Petición con oldPath y newName en el body
 * @param res Respuesta de confirmación
 */
export const renameFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { oldPath, newName } = req.body;
    if (!oldPath || !newName) {
      throw new ValidationError('Faltan parámetros (oldPath o newName)');
    }
    const result = await renameItemService(oldPath, newName, req.user!.id, req.user!.role);
    logger.info(`[AUDIT] Usuario ${req.user?.id} renombró: ${oldPath} -> ${newName}`);
    res.json(result);
  } catch (error: any) {
    next(error);
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
    const result = await deleteItemService(relativePath, req.user!.id, req.user!.role);
    const action = result.isDirectory ? 'ELIMINÓ CARPETA' : 'ELIMINÓ ARCHIVO';
    logger.warn(`[AUDIT] Usuario ${req.user?.id} ${action}: ${relativePath}`);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error(`Error al eliminar (Usuario: ${req.user?.id}): ` + error.message);
    const status = error.message.includes('Permiso denegado') ? 403 : (error.message === 'El archivo o carpeta no existe' ? 404 : 500);
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
    const result = await getItemContentService(relativePath, req.user!.id, req.user!.role);

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
    const status = error.message.includes('Permiso denegado') ? 403 : 500;
    res.status(status).json({ error: error.message });
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


/**
 * Descarga múltiples archivos comprimidos en un archivo ZIP.
 * 
 * @param req Petición con array de paths en req.body.paths
 * @param res Stream de descarga del archivo ZIP
 */
export const downloadMultipleFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { paths } = req.body;
    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      throw new ValidationError("Se requiere una lista de archivos para descargar");
    }

    const filePaths = await verifyDownloadMultipleService(paths, req.user!.id, req.user!.role);

    const archive = archiver('zip', { zlib: { level: 9 } });

    // Configurar cabeceras para la descarga
    res.attachment(`cherrybox_download_${Date.now()}.zip`);

    archive.on('error', (err) => {
      logger.error('Error en archiver: ' + err.message);
      throw err;
    });

    // Pipe del archive a la respuesta
    archive.pipe(res);

    for (const fullPath of filePaths) {
      archive.file(fullPath, { name: path.basename(fullPath) });
    }

    logger.info(`[AUDIT] Usuario ${req.user?.id} DESCARGÓ ${paths.length} archivos en ZIP`);
    await archive.finalize();

  } catch (error: any) {
    next(error);
  }
}
