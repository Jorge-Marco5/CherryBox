import { Request, Response } from "express";
import { getSetting, setSetting, getBaseDir } from "../utils/settings";
import fs from 'fs/promises';
import path from 'path';


/**
 * Devuelve el almacenamiento total, usado y disponible
 * @param req 
 * @param res 
 * @returns 
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
        console.error(`Error calculating size for ${dirPath}:`, error);
        // Continue despite errors in subdirectories/files to get partial size
    }
    return size;
};

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
        console.error('Error al obtener la configuración:', error);
        return res.status(500).json({ message: 'Error al obtener la configuración', error: error.message });
    }
};

export const setSettings = async (req: Request, res: Response) => {
    try {
        const { setting, value } = req.body;
        if (!setting || !value) {
            return res.status(400).json({ error: 'Faltan parámetros (setting o value)' });
        }
        await setSetting(setting, value);
        return res.status(200).json({ message: 'Configuración actualizada' });
    } catch (error: any) {
        console.error('Error al obtener la configuración:', error);
        return res.status(500).json({ message: 'Error al obtener la configuración', error: error.message });
    }
};

export const getLogs = async (req: Request, res: Response) => {
    try {
        const logPath = path.join(__dirname, '../../logs/combined.log');
        const logs = await fs.readFile(logPath, 'utf-8');
        return res.status(200).json({ logs });
    } catch (error: any) {
        console.error('Error al obtener los logs:', error);
        return res.status(500).json({ message: 'Error al obtener los logs', error: error.message });
    }
}

export const getErrorLogs = async (req: Request, res: Response) => {
    try {
        const logPath = path.join(__dirname, '../../logs/error.log');
        const logs = await fs.readFile(logPath, 'utf-8');
        return res.status(200).json({ logs });
    } catch (error: any) {
        console.error('Error al obtener los logs:', error);
        return res.status(500).json({ message: 'Error al obtener los logs', error: error.message });
    }
}

