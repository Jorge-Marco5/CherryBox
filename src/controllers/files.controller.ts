import archiver from "archiver";
import { NextFunction, Request, Response } from "express";
import path from "path";
import { AuthRequest } from "../middlewares/auth.middleware";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  createFolderService,
  createShareLinkService,
  deleteItemService,
  getFormatsAvailables,
  getItemContentService,
  listItemsService,
  registerUploadedFilesService,
  renameItemService,
  searchItemsService,
  verifyDownloadMultipleService,
} from "../services/files.service";
import { syncFiles } from "../services/sync-files.service";
import { ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { isValidPath } from "../utils/multer";
import { system_setting, config } from '../config/config'
import { VideoStreamResult } from "../services/videostream.service";
import { processUploadedVideosAsync } from "../services/videoOptimizer.service";
import { decodePath, sanitizeRelativePath } from "../utils/sanitize";
import { formatBytes } from "../utils/formatBytes";
import { contentHtml } from "../persistent/contentHTML";

/**
 * Renderiza la vista principal del administrador de archivos.
 *
 * @param req Petición de Express
 * @param res Respuesta que envía el archivo index.html
 */
export const dashboard = (req: Request, res: Response) => {
  try {
    res.sendFile(path.join(__dirname, "../views/index.html"));
  } catch (error: any) {
    logger.error("Error al cargar la página dashboard: " + error.message);
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
};

/**
 * Lista los archivos y carpetas de un directorio específico.
 * Registra quién accedió a qué ruta para auditoría de navegación.
 *
 * @param req Petición con la ruta relativa en query.path
 * @param res JSON con la lista de archivos y metadatos
 */
export const listFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const relativePath = (req.query.path as string) || "";
    const { files, currentFolderId, currentFolderName } = await listItemsService(
      decodePath(relativePath),
      req.user!.id,
      req.user!.role,
    );
    res.json({ files, currentPath: relativePath, currentFolderId, currentFolderName });
  } catch (error: any) {
    logger.error(`[AUDIT] Usuario ${req.user?.id} obtuvo un error al listar carpetas. ${error.message}`);
    next(error);
  }
};

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
};

/**
 * Crea una nueva carpeta en la ruta especificada.
 *
 * @param req Petición con el nombre y ruta de la nueva carpeta
 * @param res Respuesta de confirmación
 */
export const createFolder = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { path: relativePath, name, folderColor } = req.body;
    if (!name) throw new ValidationError("El nombre de la carpeta es requerido");

    const result = await createFolderService(relativePath, name, folderColor, req.user!.id, req.user!.role);
    logger.info(`[AUDIT] Usuario ${req.user?.id} creó la carpeta: ${path.join(relativePath, name)}`);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
};

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
      throw new ValidationError("No se subieron archivos");
    }

    const files = req.files as Express.Multer.File[];
    const relativePath = (req.query.path as string) || "";

    // Registro de los datos en la base de datos
    await registerUploadedFilesService(files, decodePath(relativePath), user!.id);

    // Actualizar tamaño de almacenamiento usado
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);
    await system_setting.addUsedStorage(totalSize);

    // Optimización asíncrona de videos en segundo plano con FFmpeg (+faststart)
    processUploadedVideosAsync(files, decodePath(relativePath));

    logger.info(`[AUDIT] Usuario ${user?.id} completó subida de ${files.length} archivo(s) a: ${decodePath(relativePath)}`);
    res.json({
      success: true,
      message: `${files.length} archivo(s) subido(s) correctamente`,
    });
  } catch (error: any) {
    next(error);
  }
};

/**
 * Cambia el nombre de un archivo o carpeta existente.
 *
 * @param req Petición con oldPath y newName en el body
 * @param res Respuesta de confirmación
 */
export const renameFile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { oldPath, newName, newFolderColor } = req.body;
    if (!oldPath || !newName) {
      throw new ValidationError("Faltan parámetros (oldPath o newName)");
    }
    const result = await renameItemService(decodePath(oldPath), newName, newFolderColor, req.user!.id, req.user!.role);
    logger.info(`[AUDIT] Usuario ${req.user?.id} renombró: ${oldPath} -> ${newName}`);
    res.json(result);
  } catch (error: any) {
    next(error);
  }
};

/**
 * Crea un enlace compartido con expiración y firmado para un archivo o carpeta.
 * @param req Petición con el path del archivo y tiempo de expiración en milisegundos
 * @param res Objeto con la URL completa del enlace compartido
 * @param next Middleware de manejo de errores
 */
export const createShareLink = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { file_path, time } = req.body;
    const user = req.user;
    if (!file_path || !time) {
      throw new ValidationError("Faltan parámetros (file_path o time)");
    }

    await createShareLinkService(decodePath(file_path), user!.id, user!.role);

    const exp = Math.floor((Date.now() + Number(time)) / 1000); // Expiración en segundos Unix (más corto)
    const payload = `${file_path}:${exp}`;

    // Creamos una firma web segura ultra compacta (primeros 12 bytes del HMAC-SHA256 en base64url)
    const hmac = crypto.createHmac('sha256', config.JWT_SECRET)
      .update(payload)
      .digest('base64url')
      .substring(0, 12);

    // Codificamos todo el conjunto en base64url para que sea seguro en URLs
    const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');

    const host = config.REVERSE_PROXY ? config.FRONTEND_URL : `${req.protocol}://${req.headers.host}`;
    const full_url = `${host}/api/shared/${token}`;

    res.json({ url: full_url });
  } catch (error: any) {
    next(error);
  }
};

export const getSharedFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token_shared } = req.params;
    const rangeHeader = req.headers.range;

    const decoded = Buffer.from(token_shared.toString(), 'base64url').toString('utf8');
    const lastColon = decoded.lastIndexOf(':');
    const secondLastColon = decoded.lastIndexOf(':', lastColon - 1);

    if (lastColon === -1 || secondLastColon === -1) {
      throw new ValidationError("El token compartido no es válido.");
    }

    const file_path = decoded.substring(0, secondLastColon);
    const exp = decoded.substring(secondLastColon + 1, lastColon);
    const hmacOriginal = decoded.substring(lastColon + 1);

    // 1. Validar que corresponda al archivo solicitado
    if (!file_path) {
      throw new ValidationError("Este enlace no pertenece a un archivo válido.");
    }

    // 2. Validar si ya expiró, exp en segundos
    const tiempoActual = Math.floor(Date.now() / 1000);
    if (tiempoActual > parseInt(exp)) {
      throw new ValidationError("El enlace temporal ha expirado.");
    }

    // 3. Validar integridad (Recalcular firma)
    const payload = `${file_path}:${exp}`;
    const hmacEsperado = crypto.createHmac('sha256', config.JWT_SECRET)
      .update(payload)
      .digest('base64url')
      .substring(0, 12);

    if (hmacOriginal !== hmacEsperado) {
      throw new ValidationError("El enlace ha sido manipulado o es inválido.");
    }

    const result = await getItemContentService(decodePath(file_path), rangeHeader, "", "secure", false);

    logger.info(`[AUDIT] Se obtuvo el archivo: '${file_path}' a través del enlace compartido.`);

    let fileName = path.basename(decodePath(file_path));

    if (fileName.length > 25) {
      fileName = fileName.substring(0, 25) + "..." + fileName.substring(fileName.length - 5);
    }

    const isDownload = req.query.download === "true";
    const isRaw = req.query.raw === "true";
    const acceptsHtml = Boolean(req.headers.accept && req.headers.accept.includes("text/html"));

    if (result.type === "text") {
      if (isDownload && result.fullPath) {
        return res.download(result.fullPath, fileName);
      }

      // Si se solicita texto plano o es una petición que no espera HTML (ej. curl, fetch)
      if (isRaw || !acceptsHtml) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
        return res.send(result.content);
      }

      // Renderizar visor web limpio y oscuro integrado para el navegador
      const escapedContent = (result.content as string)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

      const fileSize = formatBytes(Buffer.byteLength(result.content as string, 'utf8'));


      const html = contentHtml(fileName, fileSize, escapedContent);

      return res.send(html);
    } else if (result.type === "media") {
      if (isDownload && result.fullPath) {
        return res.download(result.fullPath, fileName);
      }
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
      return res.sendFile(result.fullPath!, { acceptRanges: true });
    } else if (result.type === "video") {
      if (isDownload && result.fullPath) {
        return res.download(result.fullPath, fileName);
      }
      const videoResult = result.content as VideoStreamResult;
      res.writeHead(videoResult.status, videoResult.headers);
      if (videoResult.stream) {
        videoResult.stream.pipe(res);
        res.on("close", () => {
          videoResult.stream?.destroy();
        });
      } else {
        res.end();
      }
    }
  } catch (error: any) {
    next(error);
  }
};

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
      return res.status(400).json({ error: "No se proporcionó la ruta del archivo" });
    }
    const result = await deleteItemService(decodePath(relativePath), req.user!.id, req.user!.role);
    const action = result.isDirectory ? "ELIMINÓ CARPETA" : "ELIMINÓ ARCHIVO";
    logger.warn(`[AUDIT] Usuario ${req.user?.id} ${action}: ${decodePath(relativePath)}`);
    res.json({ success: true, message: result.message });
  } catch (error: any) {
    logger.error(`Error al eliminar (Usuario: ${req.user?.id}): ` + error.message);
    const status = error.message.includes("Permiso denegado")
      ? 403
      : error.message === `El archivo o carpeta no existe`
        ? 404
        : 500;
    res.status(status).json({ error: error.message });
  }
};

export const getFormatsAvailablesController = async (req: Request, res: Response) => {
  try {
    const formats = await getFormatsAvailables();
    res.json(formats);
  } catch (error: any) {
    logger.error("Error al obtener formatos disponibles: " + error.message);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Obtiene el contenido de un archivo para vista previa.
 *
 * @param req Petición con la ruta del archivo en query.path
 * @param res JSON con el contenido (texto) o el archivo directamente (media)
 */
export const getFileContent = async (req: AuthRequest, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || "";
    const rangeHeader = req.headers.range;
    const isThumbnail = req.query.thumbnail === "true";
    const result = await getItemContentService(decodePath(relativePath), rangeHeader, req.user!.id, req.user!.role, isThumbnail);

    if (result.type === "text") {
      logger.info(`[AUDIT] Usuario ${req.user?.id} visualizó el archivo: '${decodePath(relativePath)}'`);
      return res.json(result);
    } else if (result.type === "media") {
      return res.sendFile(result.fullPath!, { acceptRanges: true });
    } else if (result.type === "video") {
      const videoResult = result.content as VideoStreamResult;
      res.writeHead(videoResult.status, videoResult.headers);
      if (videoResult.stream) {
        videoResult.stream.pipe(res);
        res.on("close", () => {
          videoResult.stream?.destroy();
        });
      } else {
        res.end();
      }
    }
  } catch (error: any) {
    logger.error(`Error al obtener contenido (Usuario: ${req.user?.id}): ` + error.message);
    const status = error.message.includes("Permiso denegado") ? 403 : 500;
    res.status(status).json({ error: error.message });
  }
};

/**
 * Inicia la descarga de un archivo.
 * Registra la descarga para control de fuga de información.
 *
 * @param req Petición con la ruta del archivo en query.path
 * @param res Stream de descarga del archivo
 */
export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const relativePath = (req.query.path as string) || "";
    if (!isValidPath(relativePath)) return res.status(403).json({ error: "Ruta no válida" });

    // Aquí no movemos el res.download porque es una respuesta específica de Express,
    // pero mantenemos la lógica mínima.
    const fullPath = path.join(system_setting.getBaseDir(), relativePath);
    logger.info(`[AUDIT] Usuario ${req.user?.id} DESCARGÓ el archivo: ${relativePath}`);
    res.download(fullPath);
  } catch (error: any) {
    logger.error(`Error al descargar (Usuario: ${req.user?.id}): ` + error.message);
    res.status(500).json({ error: error.message });
  }
};

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

    const archive = archiver("zip", { zlib: { level: 9 } });

    // Configurar cabeceras para la descarga
    res.attachment(`cherrybox_download_${Date.now()}.zip`);

    archive.on("error", (err) => {
      logger.error("Error en archiver: " + err.message);
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
};

/**
 * Inicia manualmente la sincronización de archivos.
 * @param req Petición vacía
 * @param res Mensaje de confirmación
 */
export const manualSync = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    logger.info(`[AUDIT] Usuario ${req.user?.id} inició sincronización manual`);
    await syncFiles();
    res.json({ success: true, message: "Sincronización completada exitosamente" });
  } catch (error: any) {
    next(error);
  }
};
