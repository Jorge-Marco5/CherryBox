import { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { getBaseDir, getSetting, setSetting } from "../utils/settings";

/**
 * Calcula de forma recursiva el tamaño total de un directorio en bytes.
 *
 * @param dirPath Ruta absoluta del directorio a calcular
 * @returns Promesa con el tamaño total en bytes
 */
export const calculateDirSize = async (dirPath: string): Promise<number> => {
  let size = 0;
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return stats.size; // Si es un archivo, devuelve su tamaño directamente
    }

    const files = await fs.readdir(dirPath, { withFileTypes: true });
    for (const file of files) {
      const fullPath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        size += await calculateDirSize(fullPath);
      } else {
        const fileStats = await fs.stat(fullPath);
        size += fileStats.size;
      }
    }
  } catch (error) {
    //console.log(`Error calculating size for ${dirPath}:`, error);
    return 0;
  }
  return size;
};

/**
 * Obtiene las métricas de almacenamiento (total, usado y disponible).
 *
 * @param req Petición de Express
 * @param res Respuesta con el desglose de almacenamiento en bytes
 */
export const getStorage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storage = Number(getSetting("LIMIT_STORAGE"));
    let baseDir = getBaseDir();

    if (!storage || !baseDir) {
      throw new AppError("No se encontró la configuración del almacenamiento");
    }

    const usedSize = await calculateDirSize(baseDir);
    const availableSize = storage - usedSize;

    return res.status(200).json({ totalStorage: storage, usedStorage: usedSize, availableStorage: availableSize });
  } catch (error) {
    next(error);
  }
};

export async function getStorageString() {
  const storage = Number(getSetting("LIMIT_STORAGE"));
  let baseDir = getBaseDir();

  if (!storage || !baseDir) {
    throw new AppError("No se encontró la configuración del almacenamiento");
  }

  const usedSize = await calculateDirSize(baseDir);
  const availableSize = storage - usedSize;

  return { totalStorage: storage, usedStorage: usedSize, availableStorage: availableSize };
}

/**
 * Actualiza una configuración global del sistema (ej. LIMIT_STORAGE).
 * Acción crítica que requiere registro de auditoría. Solo superadmin puede cambiar la configuración.
 *
 * @param req Petición con 'setting' y 'value' en el body
 * @param res Respuesta de confirmación
 */
export const setSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { setting, value } = req.body;
    if (!setting || value === undefined) {
      throw new ValidationError("Faltan parámetros (setting o value)");
    }
    if (setting === "LIMIT_STORAGE") {
      const limitStorage = Number(value);
      if (!limitStorage || limitStorage <= 0) {
        throw new ValidationError("El límite de almacenamiento debe ser un número mayor a 0");
      }
      const usedSize = await calculateDirSize(getBaseDir());
      if (limitStorage * 1024 * 1024 * 1024 < usedSize) {
        throw new ValidationError(
          "El límite de almacenamiento debe ser mayor o igual al tamaño actual de los archivos",
        );
      }
    }
    await setSetting(setting, value);

    logger.info(`[AUDIT] Administrador ${req.user?.id} cambió la configuración [${setting}] a: ${value}`);
    return res.status(200).json({ message: "Configuración actualizada exitosamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * Obtiene la configuración global del sistema.
 *
 * @param req Petición de Express
 * @param res JSON con la configuración global
 */
export const getSettings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperAdmin = req.user?.role === "SUPERADMIN";
    const baseDir = getBaseDir();
    const limitStorage = getSetting("LIMIT_STORAGE");
    // Convertir bytes a GB para la vista
    const limitStorageGB = Math.round(Number(limitStorage) / (1024 * 1024 * 1024));

    return res.status(200).json({
      baseDir,
      limitStorage: limitStorageGB,
      permission: isSuperAdmin,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Sincroniza los archivos físicos con la base de datos.
 */
export const syncFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const baseDir = getBaseDir();
    const superadmin = await prisma.user.findFirst({ where: { role: "SUPERADMIN" } });

    if (!superadmin) throw new AppError("No se encontró un SUPERADMIN para asignar la propiedad.");

    const scan = async (currentDir: string, parentId: string | null = null) => {
      const fullPath = path.join(baseDir, currentDir);
      const items = await fs.readdir(fullPath, { withFileTypes: true });

      for (const item of items) {
        const relativePath = path.join(currentDir, item.name);
        const isDirectory = item.isDirectory();

        const dbFile = await prisma.file.upsert({
          where: { path: relativePath },
          update: { name: item.name, type: isDirectory ? "FOLDER" : "FILE", parentId },
          create: {
            name: item.name,
            path: relativePath,
            type: isDirectory ? "FOLDER" : "FILE",
            ownerId: superadmin.id,
            parentId,
          },
        });

        if (isDirectory) await scan(relativePath, dbFile.id);
      }
    };

    logger.info(`[AUDIT] Sincronización iniciada por ${req.user?.id}`);
    await scan("");
    return res.status(200).json({ message: "Sincronización completada exitosamente" });
  } catch (error) {
    next(error);
  }
};

/**
 * Simula un análisis de archivos en busca de amenazas.
 */
export const analyzeFiles = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    logger.info(`[AUDIT] Análisis de archivos iniciado por ${req.user?.id}`);

    // Simulación de proceso largo
    await new Promise((resolve) => setTimeout(resolve, 2000));

    return res.status(200).json({
      message: "Análisis completado. No se encontraron amenazas.",
      scannedFiles: 150, // Ejemplo
      threatsFound: 0,
    });
  } catch (error) {
    next(error);
  }
};

/**<
 * Obtiene el contenido del archivo de logs combinados para su visualización.
 *
 * @param req Petición de Express
 * @param res JSON con el contenido completo del log combinado
 */
export const getLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logPath = path.join(__dirname, "../logs/combined.log");
    const logs = await fs.readFile(logPath, "utf-8");
    return res.status(200).json({ logs });
  } catch (error) {
    next(error);
  }
};

export const getErrorLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logPath = path.join(__dirname, "../logs/error.log");
    const logs = await fs.readFile(logPath, "utf-8");
    return res.status(200).json({ logs });
  } catch (error) {
    next(error);
  }
};
