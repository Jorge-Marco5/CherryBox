import { NextFunction, Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import { prisma } from "../lib/prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { AppError, ValidationError } from "../utils/errors";
import { logger } from "../utils/logger";
import { system_setting } from '../config/config';
import { settingService } from "../services/setting.service";


// Limitador de concurrencia para evitar el error EMFILE (too many open files) en cálculo de peso
class ConcurrencyLimiter {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private limit: number) { }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}

/**
 * Calcula de forma paralela y recursiva el tamaño total de un directorio en bytes.
 * Gestiona errores de permisos de archivos y carpetas individuales de forma independiente.
 *
 * @param dirPath Ruta absoluta del directorio a calcular
 * @returns Promesa con el tamaño total en bytes
 */
export const calculateDirSize = async (dirPath: string): Promise<number> => {
  const limiter = new ConcurrencyLimiter(150); // Límite global de operaciones FS concurrentes

  const worker = async (currentPath: string): Promise<number> => {
    try {
      const stats = await limiter.run(() => fs.stat(currentPath));
      if (!stats.isDirectory()) {
        return stats.size;
      }

      const files = await limiter.run(() => fs.readdir(currentPath, { withFileTypes: true }));
      const promises = files.map(async (file) => {
        const fullPath = path.join(currentPath, file.name);
        try {
          if (file.isDirectory()) {
            return await worker(fullPath);
          } else if (file.isFile()) {
            const fileStats = await limiter.run(() => fs.stat(fullPath));
            return fileStats.size;
          }
        } catch {
          // Ignorar archivos individuales ilegibles, sin permisos o enlaces rotos
        }
        return 0;
      });

      const sizes = await Promise.all(promises);
      return sizes.reduce((acc, curr) => acc + curr, 0);
    } catch {
      // Ignorar directorios individuales inaccesibles (EACCES, EPERM)
      return 0;
    }
  };

  return worker(dirPath);
};

/**
 * Obtiene las métricas de almacenamiento (total, usado y disponible).
 *
 * @param req Petición de Express
 * @param res Respuesta con el desglose de almacenamiento en bytes
 */
export const getStorage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const storage = Number(system_setting.getSetting("LIMIT_STORAGE"));
    let baseDir = system_setting.getBaseDir();

    if (!storage || !baseDir) {
      throw new AppError("No se encontró la configuración del almacenamiento");
    }

    const usedSize = await system_setting.getUsedStorage();
    const availableSize = storage - usedSize;

    return res.status(200).json({ totalStorage: storage, usedStorage: usedSize, availableStorage: availableSize });
  } catch (error) {
    next(error);
  }
};

export async function getStorageString() {
  const storage = Number(system_setting.getSetting("LIMIT_STORAGE"));
  let baseDir = system_setting.getBaseDir();

  if (!storage || !baseDir) {
    throw new AppError("No se encontró la configuración del almacenamiento");
  }

  const usedSize = await system_setting.getUsedStorage();
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

    const updatedValue = await settingService.updateSetting(setting, value);

    logger.info(`[AUDIT] Administrador ${req.user?.id} cambió la configuración [${setting}] a: ${value} (guardado: ${updatedValue})`);
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
    const baseDir = system_setting.getBaseDir();
    const limitStorage = system_setting.getSetting("LIMIT_STORAGE");
    const maxFileSize = system_setting.getSetting("MAX_FILE_SIZE");
    const maxFiles = system_setting.getSetting("MAX_FILES");
    // Convertir bytes a GB para la vista
    const limitStorageGB = Math.round(Number(limitStorage) / (1024 * 1024 * 1024));
    // Convertir bytes a MB para la vista
    const maxFileSizeMB = Math.round(Number(maxFileSize) / (1024 * 1024));

    return res.status(200).json({
      baseDir,
      limitStorage: limitStorageGB,
      maxFileSize: maxFileSizeMB,
      maxFiles: maxFiles,
      permission: isSuperAdmin,
    });
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
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(__dirname, "../logs/" + today + "-combined.log");
    const logs = await fs.readFile(logPath, "utf-8");
    //enviar los ultimos 100 logs
    const lines = logs.split("\n");
    const last100Lines = lines.slice(-500);
    const logsString = last100Lines.join("\n");
    return res.status(200).json({ logs: logsString });
  } catch (error) {
    next(error);
  }
};

export const getErrorLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const logPath = path.join(__dirname, "../logs/" + today + "-error.log");
    const logs = await fs.readFile(logPath, "utf-8");
    const lines = logs.split("\n");
    const last100Lines = lines.slice(-500);
    const logsString = last100Lines.join("\n");
    return res.status(200).json({ logs: logsString });
  } catch (error) {
    next(error);
  }
};
