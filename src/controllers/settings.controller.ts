import { Request, Response } from "express";
import { getSetting, setSetting, getBaseDir } from "../utils/settings";
import fs from 'fs/promises';
import path from 'path';
import { logger } from "../utils/logger";
import { AuthRequest } from "../middlewares/auth.middleware";


/**
 * Calcula de forma recursiva el tamaño total de un directorio en bytes.
 * 
 * @param dirPath Ruta absoluta del directorio a calcular
 * @returns Promesa con el tamaño total en bytes
 */
const calculateDirSize = async (dirPath: string): Promise<number> => {
    let size = 0;
    try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });

        await Promise.all(files.map(async (file) => {
            const filePath = path.join(dirPath, file.name);
            if (file.isDirectory()) {
                size += await calculateDirSize(filePath);
            } else {
                const stats = await fs.stat(filePath);
                size += stats.size;
            }
        }));
    } catch (error) {
        logger.error(`Error calculating size for ${dirPath}:`, error);
        // Continue despite errors in subdirectories/files to get partial size
    }
    return size;
};

/**
 * Obtiene las métricas de almacenamiento (total, usado y disponible).
 * 
 * @param req Petición de Express
 * @param res Respuesta con el desglose de almacenamiento en bytes
 */
export const getStorage = async (req: Request, res: Response) => {
    try {
        const storage = Number(getSetting("LIMIT_STORAGE"));
        let baseDir = getBaseDir();

        if (!storage || !baseDir) {
            return res.status(500).json({ error: 'No se encontró la configuración' });
        }

        const usedSize = await calculateDirSize(baseDir);
        const availableSize = storage - usedSize;

        return res.status(200).json({ totalStorage: storage, usedStorage: usedSize, availableStorage: availableSize });
    } catch (error: any) {
        logger.error('Error al obtener la configuración:', error);
        return res.status(500).json({ message: 'Error al obtener la configuración', error: error.message });
    }
};

/**
 * Actualiza una configuración global del sistema (ej. LIMIT_STORAGE).
 * Acción crítica que requiere registro de auditoría.
 * 
 * @param req Petición con 'setting' y 'value' en el body
 * @param res Respuesta de confirmación
 */
export const setSettings = async (req: AuthRequest, res: Response) => {
    const adminNum = req.user?.id;
    try {
        const { setting, value } = req.body;
        if (!setting || !value) {
            return res.status(400).json({ error: 'Faltan parámetros (setting o value)' });
        }
        await setSetting(setting, value);
        
        logger.info(`[AUDIT] Administrador ${adminNum} cambió la configuración [${setting}] a: ${value}`);
        return res.status(200).json({ message: 'Configuración actualizada' });
    } catch (error: any) {
        logger.error(`Error al actualizar configuración (Admin: ${adminNum}): ` + error.message);
        return res.status(500).json({ message: 'Error al cambiar la configuración', error: error.message });
    }
};

/**
 * Obtiene el contenido del archivo de logs combinados para su visualización.
 * 
 * @param req Petición de Express
 * @param res JSON con el contenido completo del log combinado
 */
export const getLogs = async (req: Request, res: Response) => {
    try {
        const logPath = path.join(__dirname, '../logs/combined.log');
        const logs = await fs.readFile(logPath, 'utf-8');
        return res.status(200).json({ logs });
    } catch (error: any) {
        logger.error('Error al obtener los logs:', error);
        return res.status(500).json({ message: 'Error al obtener los logs', error: error.message });
    }
}

/**
 * Obtiene el contenido del archivo de logs de error para su visualización.
 * 
 * @param req Petición de Express
 * @param res JSON con el contenido completo del log de errores
 */
export const getErrorLogs = async (req: Request, res: Response) => {
    try {
        const logPath = path.join(__dirname, '../logs/error.log');
        const logs = await fs.readFile(logPath, 'utf-8');
        return res.status(200).json({ logs });
    } catch (error: any) {
        logger.error('Error al obtener los logs:', error);
        return res.status(500).json({ message: 'Error al obtener los logs', error: error.message });
    }
}

